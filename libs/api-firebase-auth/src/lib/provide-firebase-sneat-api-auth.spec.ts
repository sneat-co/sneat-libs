import { provideHttpClient, withXhr } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Auth } from '@angular/fire/auth';
import {
  SneatApiNotAuthenticatedError,
  SneatApiService,
} from '@sneat/api-public';
import { firstValueFrom } from 'rxjs';
import {
  FirebaseSneatApiAuthAdapter,
  provideFirebaseSneatApiAuth,
} from './provide-firebase-sneat-api-auth';

const listener = vi.fn();
type TestUser = {
  getIdToken: (forceRefresh?: boolean) => Promise<string>;
};
let authMock: { currentUser: TestUser | null };
vi.mock('@angular/fire/auth', () => ({
  Auth: class Auth {},
  onIdTokenChanged: (_auth: unknown, observer: unknown) => {
    listener(observer);
    return vi.fn();
  },
}));

describe('FirebaseSneatApiAuthAdapter', () => {
  beforeEach(() => {
    listener.mockReset();
    authMock = { currentUser: null };
  });

  it('unblocks a root-created API client only after delayed getIdToken resolves', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        { provide: Auth, useValue: authMock },
        FirebaseSneatApiAuthAdapter,
      ],
    });
    const rootApi = TestBed.inject(SneatApiService);
    const adapter = TestBed.inject(FirebaseSneatApiAuthAdapter);
    const http = TestBed.inject(HttpTestingController);
    adapter.start();

    let resolveToken!: (token: string) => void;
    const token = new Promise<string>((resolve) => (resolveToken = resolve));
    const observer = listener.mock.calls[0][0] as {
      next: (user: { getIdToken: () => Promise<string> } | null) => void;
    };
    const user = { getIdToken: () => token };
    authMock.currentUser = user;
    observer.next(user);
    const response = firstValueFrom(rootApi.get<{ ok: boolean }>('private'));
    http.expectNone('https://api.sneat.cloud/v0/private');

    resolveToken('firebase-token');
    await token;
    await Promise.resolve();
    const request = http.expectOne('https://api.sneat.cloud/v0/private');
    expect(request.request.headers.get('Authorization')).toBe(
      'Bearer firebase-token',
    );
    request.flush({ ok: true });
    await response;
    http.verify();
  });

  it('gets a current Firebase token for every protected request', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        { provide: Auth, useValue: authMock },
        FirebaseSneatApiAuthAdapter,
      ],
    });
    const api = TestBed.inject(SneatApiService);
    const http = TestBed.inject(HttpTestingController);
    TestBed.inject(FirebaseSneatApiAuthAdapter).start();
    const getIdToken = vi
      .fn<(forceRefresh?: boolean) => Promise<string>>()
      .mockResolvedValueOnce('bootstrap-token')
      .mockResolvedValueOnce('refreshed-token');
    const observer = listener.mock.calls[0][0] as {
      next: (user: { getIdToken: typeof getIdToken }) => void;
    };

    const user = { getIdToken };
    authMock.currentUser = user;
    observer.next(user);
    await Promise.resolve();
    await Promise.resolve();

    const response = firstValueFrom(api.get<{ ok: boolean }>('private'));
    await Promise.resolve();
    await Promise.resolve();
    const request = http.expectOne('https://api.sneat.cloud/v0/private');
    expect(getIdToken).toHaveBeenCalledTimes(2);
    expect(getIdToken).toHaveBeenNthCalledWith(1, false);
    expect(getIdToken).toHaveBeenNthCalledWith(2, false);
    expect(request.request.headers.get('Authorization')).toBe(
      'Bearer refreshed-token',
    );
    request.flush({ ok: true });
    await response;
    http.verify();
  });

  it('fails pending calls closed when Firebase resolves signed out', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        { provide: Auth, useValue: authMock },
        FirebaseSneatApiAuthAdapter,
      ],
    });
    const api = TestBed.inject(SneatApiService);
    TestBed.inject(FirebaseSneatApiAuthAdapter).start();
    const observer = listener.mock.calls[0][0] as {
      next: (user: null) => void;
    };
    const response = firstValueFrom(api.get('private'));
    observer.next(null);

    await expect(response).rejects.toBe(SneatApiNotAuthenticatedError);
  });

  it('keeps the newest Firebase token when an older lookup resolves late', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        { provide: Auth, useValue: authMock },
        FirebaseSneatApiAuthAdapter,
      ],
    });
    const api = TestBed.inject(SneatApiService);
    const http = TestBed.inject(HttpTestingController);
    TestBed.inject(FirebaseSneatApiAuthAdapter).start();
    const observer = listener.mock.calls[0][0] as {
      next: (user: { getIdToken: () => Promise<string> }) => void;
    };
    let resolveOldToken!: (token: string) => void;
    const oldUser = {
      getIdToken: () =>
        new Promise<string>((resolve) => (resolveOldToken = resolve)),
    };
    authMock.currentUser = oldUser;
    observer.next(oldUser);
    const currentUser = {
      getIdToken: () => Promise.resolve('current-token'),
    };
    authMock.currentUser = currentUser;
    observer.next(currentUser);
    await Promise.resolve();
    await Promise.resolve();

    const firstResponse = firstValueFrom(api.get('private'));
    await Promise.resolve();
    await Promise.resolve();
    const firstRequest = http.expectOne('https://api.sneat.cloud/v0/private');
    expect(firstRequest.request.headers.get('Authorization')).toBe(
      'Bearer current-token',
    );
    firstRequest.flush({});
    await firstResponse;

    resolveOldToken('stale-token');
    await Promise.resolve();
    const secondResponse = firstValueFrom(api.get('private'));
    await Promise.resolve();
    await Promise.resolve();
    const secondRequest = http.expectOne('https://api.sneat.cloud/v0/private');
    expect(secondRequest.request.headers.get('Authorization')).toBe(
      'Bearer current-token',
    );
    secondRequest.flush({});
    await secondResponse;
    http.verify();
  });

  it('keeps the session retryable when token retrieval temporarily fails', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        { provide: Auth, useValue: authMock },
        FirebaseSneatApiAuthAdapter,
      ],
    });
    const api = TestBed.inject(SneatApiService);
    const http = TestBed.inject(HttpTestingController);
    TestBed.inject(FirebaseSneatApiAuthAdapter).start();
    const observer = listener.mock.calls[0][0] as {
      next: (user: { getIdToken: () => Promise<string> }) => void;
    };
    const getIdToken = vi.fn().mockRejectedValue(new Error('denied'));
    const user = { getIdToken };
    authMock.currentUser = user;
    observer.next(user);
    await Promise.resolve();

    await expect(firstValueFrom(api.get('private'))).rejects.toThrow('denied');
    expect(consoleError).toHaveBeenCalledWith(
      'getIdToken() error:',
      expect.any(Error),
    );

    getIdToken.mockResolvedValue('recovered-token');
    const response = firstValueFrom(api.get<{ ok: boolean }>('private'));
    await Promise.resolve();
    await Promise.resolve();
    const request = http.expectOne('https://api.sneat.cloud/v0/private');
    expect(request.request.headers.get('Authorization')).toBe(
      'Bearer recovered-token',
    );
    request.flush({ ok: true });
    await response;
    http.verify();
  });

  it('runs the route initializer once and fails closed on listener errors', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        { provide: Auth, useValue: authMock },
        provideFirebaseSneatApiAuth(),
      ],
    });
    const api = TestBed.inject(SneatApiService);
    const adapter = TestBed.inject(FirebaseSneatApiAuthAdapter);
    adapter.start();
    expect(listener).toHaveBeenCalledTimes(1);
    const observer = listener.mock.calls[0][0] as {
      error: (error: Error) => void;
    };
    observer.error(new Error('listener failed'));

    await expect(firstValueFrom(api.get('private'))).rejects.toBe(
      SneatApiNotAuthenticatedError,
    );
    expect(consoleError).toHaveBeenCalledWith(
      'onIdTokenChanged() error:',
      expect.any(Error),
    );
  });
});
