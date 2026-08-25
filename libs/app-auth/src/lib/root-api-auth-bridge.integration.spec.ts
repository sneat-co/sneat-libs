import { provideHttpClient, withXhr } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import {
  createEnvironmentInjector,
  EnvironmentInjector,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Auth } from '@angular/fire/auth';
import {
  CollectionReference,
  Firestore as AngularFirestore,
} from '@angular/fire/firestore';
import { SneatApiService } from '@sneat/api-public';
import { provideFirebaseSneatApiAuth } from '@sneat/api-firebase-auth';
import {
  ISneatAuthState,
  SneatAuthStateService,
  SneatUserService,
  TelegramAuthService,
  UserRecordService,
} from '@sneat/auth-core';
import { ErrorLogger } from '@sneat/core';
import { firstValueFrom, NEVER, Observable } from 'rxjs';

/**
 * Drains every pending microtask.
 *
 * These specs used to rely on zone.js patching `Promise`: a couple of
 * `await`s were enough to run the whole token → interceptor → HttpClient
 * chain. With native promises the exact number of turns is an implementation
 * detail of that chain, so hop a macrotask instead — `setTimeout(…, 0)` fires
 * only after every already-queued microtask has run, however long the chain.
 */
const settlePendingWork = () =>
  new Promise<void>((resolve) => setTimeout(resolve, 0));

const listener = vi.fn();
type TestUser = { getIdToken: () => Promise<string> };
let authMock: { currentUser: TestUser | null };

vi.mock('@angular/fire/auth', async () => {
  const actual = await vi.importActual<typeof import('@angular/fire/auth')>(
    '@angular/fire/auth',
  );
  return {
    ...actual,
    onIdTokenChanged: (_auth: unknown, observer: unknown) => {
      listener(observer);
      return vi.fn();
    },
  };
});

vi.mock('@angular/fire/firestore', async () => {
  const actual = await vi.importActual<typeof import('@angular/fire/firestore')>(
    '@angular/fire/firestore',
  );
  return {
    ...actual,
    collection: vi
      .fn()
      .mockReturnValue({ id: 'users' } as unknown as CollectionReference),
  };
});

describe('root API auth bridge integration', () => {
  beforeEach(() => {
    listener.mockReset();
    authMock = { currentUser: null };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        { provide: Auth, useValue: authMock },
        {
          provide: AngularFirestore,
          useValue: { app: {}, type: 'firestore' },
        },
        {
          provide: ErrorLogger,
          useValue: {
            logError: vi.fn(),
            logErrorHandler: vi.fn().mockReturnValue(() => undefined),
          },
        },
        {
          provide: SneatAuthStateService,
          useValue: {
            authState: NEVER as Observable<ISneatAuthState>,
            signInWithToken: vi.fn(),
          },
        },
        UserRecordService,
        SneatUserService,
        TelegramAuthService,
      ],
    });
  });

  it('shares one root API client with consumers created before the lazy auth route', async () => {
    const api = TestBed.inject(SneatApiService);
    const userRecord = TestBed.inject(UserRecordService);
    const sneatUser = TestBed.inject(SneatUserService);
    const telegram = TestBed.inject(TelegramAuthService);
    const apiOf = (consumer: unknown) =>
      (consumer as { sneatApiService: SneatApiService }).sneatApiService;

    expect(apiOf(userRecord)).toBe(api);
    expect(apiOf(sneatUser)).toBe(api);
    expect(apiOf(telegram)).toBe(api);

    const rootInjector = TestBed.inject(EnvironmentInjector);
    const authRouteInjector = createEnvironmentInjector(
      [provideFirebaseSneatApiAuth()],
      rootInjector,
      'lazy-auth-route',
    );
    expect(listener).toHaveBeenCalledTimes(1);
    let resolveToken!: (token: string) => void;
    const token = new Promise<string>((resolve) => (resolveToken = resolve));
    const observer = listener.mock.calls[0][0] as {
      next: (user: { getIdToken: () => Promise<string> }) => void;
    };
    const user = { getIdToken: () => token };
    authMock.currentUser = user;
    observer.next(user);

    const initUser = firstValueFrom(
      userRecord.initUserRecord({ ianaTimezone: 'UTC' }),
    );
    const setCountry = firstValueFrom(sneatUser.setUserCountry('IE'));
    const http = TestBed.inject(HttpTestingController);
    http.expectNone('https://api.sneat.cloud/v0/users/init_user_record');
    http.expectNone('https://api.sneat.cloud/v0/users/set_user_country');

    resolveToken('route-token');
    await token;
    await settlePendingWork();
    const requests = http.match(() => true);
    expect(requests).toHaveLength(2);
    for (const request of requests) {
      expect(request.request.headers.get('Authorization')).toBe(
        'Bearer route-token',
      );
      request.flush({});
    }
    await Promise.all([initUser, setCountry]);
    http.verify();
    authRouteInjector.destroy();
  });
});
