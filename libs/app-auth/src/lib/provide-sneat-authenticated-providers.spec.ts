import { provideHttpClient, withXhr } from '@angular/common/http';
import {
  createEnvironmentInjector,
  EnvironmentInjector,
  PLATFORM_ID,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { Auth } from 'firebase/auth';
import {
  CollectionReference,
  Firestore as AngularFirestore,
} from 'firebase/firestore';
import { NavigationEnd, Router } from '@angular/router';
import { provideSneatPublicBootstrap } from '@sneat/app-public';
import {
  AuthStatus,
  ISneatAuthState,
  LoginRequiredServiceService,
  SneatAuthGuard,
  SneatAuthStateService,
  SneatUserService,
  TelegramAuthService,
} from '@sneat/auth-core';
import {
  AnalyticsService,
  ErrorLogger,
  IAnalyticsService,
  IEnvironmentConfig,
  SNEAT_FIREBASE_ANALYTICS,
  SNEAT_FIREBASE_AUTH,
} from '@sneat/core';
import { Subject } from 'rxjs';
import {
  provideSneatAuthenticatedProviders,
  SneatAuthenticatedLifecycle,
} from './provide-sneat-authenticated-providers';

const mocks = vi.hoisted(() => ({
  app: { name: 'test-app' },
  firestore: { name: 'test-firestore' },
  auth: {
    name: 'test-auth',
    onIdTokenChanged: vi.fn(() => () => undefined),
    onAuthStateChanged: vi.fn(() => () => undefined),
  },
  analytics: { name: 'test-analytics' },
  native: false,
  initializeApp: vi.fn(),
  getFirestore: vi.fn(),
  connectFirestoreEmulator: vi.fn(),
  getAuth: vi.fn(),
  initializeAuth: vi.fn(),
  connectAuthEmulator: vi.fn(),
  getAnalytics: vi.fn(),
  getRedirectResult: vi.fn(),
  posthogInit: vi.fn(),
  provideSentry: vi.fn(),
  onIdTokenChanged: vi.fn(),
}));

vi.mock('firebase/app', async () => {
  const actual = await vi.importActual<typeof import('firebase/app')>(
    'firebase/app',
  );
  return {
    ...actual,
    initializeApp: (...args: unknown[]) => {
      mocks.initializeApp(...args);
      return mocks.app;
    },
  };
});

vi.mock('firebase/firestore', async () => {
  const actual =
    await vi.importActual<typeof import('firebase/firestore')>(
      'firebase/firestore',
    );
  return {
    ...actual,
    getFirestore: (...args: unknown[]) => {
      mocks.getFirestore(...args);
      return mocks.firestore;
    },
    connectFirestoreEmulator: (...args: unknown[]) =>
      mocks.connectFirestoreEmulator(...args),
    collection: vi
      .fn()
      .mockReturnValue({ id: 'users' } as unknown as CollectionReference),
  };
});

vi.mock('firebase/analytics', async () => {
  const actual = await vi.importActual<typeof import('firebase/analytics')>(
    'firebase/analytics',
  );
  return {
    ...actual,
    getAnalytics: (...args: unknown[]) => {
      mocks.getAnalytics(...args);
      return mocks.analytics;
    },
  };
});

vi.mock('@capacitor/core', async () => {
  const actual = await vi.importActual<typeof import('@capacitor/core')>(
    '@capacitor/core',
  );
  return {
    ...actual,
    Capacitor: {
      ...actual.Capacitor,
      isNativePlatform: () => mocks.native,
    },
  };
});

vi.mock('firebase/auth', async () => {
  const actual = await vi.importActual<typeof import('firebase/auth')>(
    'firebase/auth',
  );
  return {
    ...actual,
    getAuth: (...args: unknown[]) => {
      mocks.getAuth(...args);
      return mocks.auth;
    },
    initializeAuth: (...args: unknown[]) => {
      mocks.initializeAuth(...args);
      return mocks.auth;
    },
    connectAuthEmulator: (...args: unknown[]) =>
      mocks.connectAuthEmulator(...args),
    onIdTokenChanged: (...args: unknown[]) => {
      mocks.onIdTokenChanged(...args);
      return vi.fn();
    },
    getRedirectResult: (...args: unknown[]) => mocks.getRedirectResult(...args),
  };
});

vi.mock('posthog-js', async () => {
  const actual = await vi.importActual<typeof import('posthog-js')>(
    'posthog-js',
  );
  return {
    ...actual,
    default: { ...actual.default, init: mocks.posthogInit },
  };
});

vi.mock('@sneat/logging', async () => {
  const actual = await vi.importActual<typeof import('@sneat/logging')>(
    '@sneat/logging',
  );
  const providers = () => ({ ɵproviders: [] });
  return {
    ...actual,
    provideChunkLoadErrorRecovery: providers,
    provideErrorLogger: providers,
    provideSneatAnalytics: providers,
    provideSentryAppInitializer: (...args: unknown[]) => {
      mocks.provideSentry(...args);
      return [];
    },
  };
});

function environmentConfig(
  overrides: Partial<IEnvironmentConfig> = {},
): IEnvironmentConfig {
  return {
    production: false,
    agents: {},
    firebaseConfig: {
      projectId: 'test',
      appId: 'test-app',
      apiKey: 'test-key',
    },
    ...overrides,
  };
}

/**
 * Builds the lazy authenticated-route injector the way an app does, and
 * resolves the Firebase tokens out of it.
 *
 * Before 0.27.0 these specs asserted against `getAngularFireProviders()`,
 * whose `provideFirestore`/`provideAuth`/`provideAnalytics` shims ran their
 * factories the moment the provider array was built — so counting the returned
 * providers was enough to prove the SDK had been driven. `provideSneatFirebase()`
 * (its replacement) uses plain `useFactory` providers, which Angular runs
 * lazily on first injection. Driving the tokens through a real injector is
 * therefore what now exercises the same wiring — and it exercises strictly
 * more of it, since it proves the providers are reachable through
 * `provideSneatAuthenticatedProviders()` rather than merely constructed.
 */
function createAuthenticatedRouteInjector(config: IEnvironmentConfig) {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(withXhr()), provideSneatPublicBootstrap()],
  });
  const router = {
    events: new Subject<NavigationEnd>(),
    routerState: {
      snapshot: {
        root: { firstChild: null, data: {}, paramMap: { get: () => null } },
      },
    },
  };
  return createEnvironmentInjector(
    [
      provideSneatAuthenticatedProviders(config),
      {
        provide: ErrorLogger,
        useValue: {
          logError: vi.fn(),
          logErrorHandler: vi.fn().mockReturnValue(() => undefined),
        },
      },
      {
        provide: AnalyticsService,
        useValue: {
          identify: vi.fn(),
          logEvent: vi.fn(),
          loggedOut: vi.fn(),
          setCurrentScreen: vi.fn(),
        },
      },
      { provide: Router, useValue: router },
    ],
    TestBed.inject(EnvironmentInjector),
    'authenticated-route',
  );
}

describe('authenticated bootstrap providers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.native = false;
    mocks.getRedirectResult.mockResolvedValue(null);
  });

  it('does not start the browser auth lifecycle while rendering on the server', () => {
    TestBed.configureTestingModule({});
    const lifecycle = { start: vi.fn() };
    const injector = createEnvironmentInjector(
      [
        provideSneatAuthenticatedProviders(environmentConfig()),
        { provide: PLATFORM_ID, useValue: 'server' },
        { provide: SneatAuthenticatedLifecycle, useValue: lifecycle },
      ],
      TestBed.inject(EnvironmentInjector),
      'server-authenticated-route',
    );

    expect(lifecycle.start).not.toHaveBeenCalled();
    injector.destroy();
  });

  it('constructs web Firebase, emulator, analytics, PostHog, and Sentry adapters', () => {
    const config = environmentConfig({
      firebaseConfig: {
        projectId: 'test',
        appId: 'test-app',
        apiKey: 'test-key',
        measurementId: 'G-TEST',
        emulator: {
          authPort: 9099,
          firestorePort: 8080,
        },
      },
      posthog: { token: 'posthog-token' },
      sentry: { dsn: 'https://example.invalid/1' },
    });

    expect(provideSneatAuthenticatedProviders(config)).toBeTruthy();
    const injector = createAuthenticatedRouteInjector(config);
    // Force the lazy firebase factories that provideSneatFirebase() installed.
    expect(injector.get(AngularFirestore)).toBe(mocks.firestore);
    expect(injector.get(SNEAT_FIREBASE_AUTH)).toBe(mocks.auth);
    expect(injector.get(SNEAT_FIREBASE_ANALYTICS)).toBe(mocks.analytics);

    expect(mocks.initializeApp).toHaveBeenCalled();
    expect(mocks.getFirestore).toHaveBeenCalledWith(mocks.app);
    expect(mocks.connectFirestoreEmulator).toHaveBeenCalledWith(
      mocks.firestore,
      '127.0.0.1',
      8080,
    );
    expect(mocks.getAuth).toHaveBeenCalledWith(mocks.app);
    expect(mocks.connectAuthEmulator).toHaveBeenCalledWith(
      mocks.auth,
      'http://127.0.0.1:9099',
    );
    expect(mocks.getAnalytics).toHaveBeenCalled();
    // PostHog is loaded by the analytics service only after its first event, so
    // merely creating the authenticated injector must not pull it into startup.
    expect(mocks.posthogInit).not.toHaveBeenCalled();
    expect(mocks.provideSentry).toHaveBeenCalled();
    injector.destroy();
  });

  it('uses native persistence without optional analytics', () => {
    mocks.native = true;
    const config = environmentConfig({
      firebaseConfig: {
        projectId: 'test',
        appId: 'test-app',
        apiKey: 'test-key',
        measurementId: 'G-PROVIDE_IF_NEEDED',
      },
    });
    const injector = createAuthenticatedRouteInjector(config);
    expect(injector.get(SNEAT_FIREBASE_AUTH)).toBe(mocks.auth);
    // The G-PROVIDE_IF_NEEDED sentinel must resolve to null, never throw.
    expect(injector.get(SNEAT_FIREBASE_ANALYTICS)).toBeNull();

    expect(mocks.initializeAuth).toHaveBeenCalledWith(
      mocks.app,
      expect.objectContaining({ persistence: expect.anything() }),
    );
    expect(mocks.getAuth).not.toHaveBeenCalled();
    expect(mocks.getAnalytics).not.toHaveBeenCalled();
    injector.destroy();
  });

  it('hydrates Firebase-dependent auth services in the lazy route injector', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withXhr()), provideSneatPublicBootstrap()],
    });
    const rootInjector = TestBed.inject(EnvironmentInjector);
    const authStateObservers: unknown[] = [];
    const fakeAuth = {
      onIdTokenChanged: vi.fn((observer: unknown) => {
        authStateObservers.push(observer);
        return vi.fn();
      }),
      onAuthStateChanged: vi.fn((observer: unknown) => {
        authStateObservers.push(observer);
        return vi.fn();
      }),
    };
    const router = {
      events: new Subject<NavigationEnd>(),
      routerState: {
        snapshot: {
          root: {
            firstChild: null,
            data: {},
            paramMap: { get: () => null },
          },
        },
      },
    };
    const routeInjector = createEnvironmentInjector(
      [
        provideSneatAuthenticatedProviders(environmentConfig()),
        { provide: SNEAT_FIREBASE_AUTH, useValue: fakeAuth as unknown as Auth },
        {
          provide: AngularFirestore,
          useValue: { app: mocks.app, type: 'firestore' },
        },
        {
          provide: ErrorLogger,
          useValue: {
            logError: vi.fn(),
            logErrorHandler: vi.fn().mockReturnValue(() => undefined),
          },
        },
        {
          provide: AnalyticsService,
          useValue: {
            identify: vi.fn(),
            logEvent: vi.fn(),
            loggedOut: vi.fn(),
            setCurrentScreen: vi.fn(),
          },
        },
        { provide: Router, useValue: router },
      ],
      rootInjector,
      'authenticated-route',
    );

    const authState = routeInjector.get(SneatAuthStateService);
    expect(routeInjector.get(TelegramAuthService)).toBeTruthy();
    expect(routeInjector.get(SneatUserService)).toBeTruthy();
    expect(routeInjector.get(SneatAuthGuard)).toBeTruthy();
    expect(routeInjector.get(LoginRequiredServiceService)).toBeTruthy();
    expect(authState.fbAuth).toBe(fakeAuth);
    expect(authStateObservers).toHaveLength(2);
    expect(mocks.onIdTokenChanged).toHaveBeenCalledWith(
      fakeAuth,
      expect.any(Object),
    );
    routeInjector.destroy();
  });
});

describe('SneatAuthenticatedLifecycle', () => {
  it('starts once, logs navigation, and clears stale space context', async () => {
    const authState = new Subject<ISneatAuthState>();
    const routerEvents = new Subject<NavigationEnd>();
    const telegram = { authenticateIfTelegramWebApp: vi.fn() };
    const analytics: Pick<IAnalyticsService, 'logEvent'> = {
      logEvent: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [
        SneatAuthenticatedLifecycle,
        { provide: TelegramAuthService, useValue: telegram },
        {
          provide: SneatAuthStateService,
          useValue: { authState, fbAuth: {} },
        },
        {
          provide: Router,
          useValue: {
            events: routerEvents,
            routerState: {
              snapshot: {
                root: {
                  firstChild: null,
                  data: { title: 'Dashboard' },
                  paramMap: { get: () => null },
                },
              },
            },
          },
        },
        { provide: AnalyticsService, useValue: analytics },
      ],
    });
    const lifecycle = TestBed.inject(SneatAuthenticatedLifecycle);
    mocks.getRedirectResult.mockClear();
    lifecycle.start();
    lifecycle.start();
    expect(telegram.authenticateIfTelegramWebApp).toHaveBeenCalledOnce();
    expect(mocks.getRedirectResult).toHaveBeenCalledOnce();

    localStorage.setItem('sneat.currentSpace', 'stale');
    authState.next({ status: 'authenticated' as AuthStatus });
    routerEvents.next(new NavigationEnd(1, '/old', '/dashboard'));
    expect(analytics.logEvent).toHaveBeenCalledWith('$pageview', {
      page_path: '/dashboard',
      title: 'Dashboard',
    });
    expect(localStorage.getItem('sneat.currentSpace')).toBeNull();

    localStorage.setItem('sneat.currentSpace', 'current');
    routerEvents.next(new NavigationEnd(2, '/old', '/space/team/demo'));
    expect(localStorage.getItem('sneat.currentSpace')).toBe('current');
    await Promise.resolve();
  });

  it('reports redirect completion errors without aborting startup', async () => {
    const error = new Error('redirect failed');
    mocks.getRedirectResult.mockRejectedValue(error);
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    TestBed.configureTestingModule({
      providers: [
        SneatAuthenticatedLifecycle,
        {
          provide: TelegramAuthService,
          useValue: { authenticateIfTelegramWebApp: vi.fn() },
        },
        {
          provide: SneatAuthStateService,
          useValue: { authState: new Subject<ISneatAuthState>(), fbAuth: {} },
        },
        {
          provide: Router,
          useValue: {
            events: new Subject<NavigationEnd>(),
            routerState: {
              snapshot: {
                root: {
                  firstChild: null,
                  data: {},
                  paramMap: { get: () => null },
                },
              },
            },
          },
        },
        { provide: AnalyticsService, useValue: { logEvent: vi.fn() } },
      ],
    });
    TestBed.inject(SneatAuthenticatedLifecycle).start();
    await Promise.resolve();
    expect(consoleError).toHaveBeenCalledWith('getRedirectResult failed', error);
  });
});
