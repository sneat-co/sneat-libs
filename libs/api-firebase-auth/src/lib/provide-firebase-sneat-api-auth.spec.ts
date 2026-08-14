import { provideHttpClient } from '@angular/common/http';
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
vi.mock('@angular/fire/auth', () => ({
  Auth: class Auth {},
  onIdTokenChanged: (_auth: unknown, observer: unknown) => {
    listener(observer);
    return vi.fn();
  },
}));

describe('FirebaseSneatApiAuthAdapter', () => {
  beforeEach(() => listener.mockReset());

  it('unblocks a root-created API client only after delayed getIdToken resolves', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Auth, useValue: {} },
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
    observer.next({ getIdToken: () => token });
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

  it('fails pending calls closed when Firebase resolves signed out', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Auth, useValue: {} },
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
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Auth, useValue: {} },
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
    observer.next({
      getIdToken: () =>
        new Promise<string>((resolve) => (resolveOldToken = resolve)),
    });
    observer.next({ getIdToken: () => Promise.resolve('current-token') });
    await Promise.resolve();
    await Promise.resolve();

    const firstResponse = firstValueFrom(api.get('private'));
    const firstRequest = http.expectOne('https://api.sneat.cloud/v0/private');
    expect(firstRequest.request.headers.get('Authorization')).toBe(
      'Bearer current-token',
    );
    firstRequest.flush({});
    await firstResponse;

    resolveOldToken('stale-token');
    await Promise.resolve();
    const secondResponse = firstValueFrom(api.get('private'));
    const secondRequest = http.expectOne('https://api.sneat.cloud/v0/private');
    expect(secondRequest.request.headers.get('Authorization')).toBe(
      'Bearer current-token',
    );
    secondRequest.flush({});
    await secondResponse;
    http.verify();
  });

  it('resolves unauthenticated when token retrieval fails', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Auth, useValue: {} },
        FirebaseSneatApiAuthAdapter,
      ],
    });
    const api = TestBed.inject(SneatApiService);
    TestBed.inject(FirebaseSneatApiAuthAdapter).start();
    const observer = listener.mock.calls[0][0] as {
      next: (user: { getIdToken: () => Promise<string> }) => void;
    };
    observer.next({ getIdToken: () => Promise.reject(new Error('denied')) });
    await Promise.resolve();

    await expect(firstValueFrom(api.get('private'))).rejects.toBe(
      SneatApiNotAuthenticatedError,
    );
    expect(consoleError).toHaveBeenCalledWith(
      'getIdToken() error:',
      expect.any(Error),
    );
  });

  it('runs the route initializer once and fails closed on listener errors', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Auth, useValue: {} },
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
