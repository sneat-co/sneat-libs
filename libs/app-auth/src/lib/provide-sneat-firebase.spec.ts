import {
  EnvironmentInjector,
  createEnvironmentInjector,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { IFirebaseConfig } from '@sneat/core';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  Firestore,
  SNEAT_FIREBASE_ANALYTICS,
  SNEAT_FIREBASE_APP,
  SNEAT_FIREBASE_AUTH,
  provideSneatFirebaseAuth,
  provideSneatFirestore,
  provideSneatFirebase,
} from './provide-sneat-firebase';

const mocks = vi.hoisted(() => ({
  app: { name: 'test-app' },
  firestore: { name: 'test-firestore', _settings: { ssl: false } },
  auth: { name: 'test-auth' },
  analytics: { name: 'test-analytics' },
  native: false,
  initializeApp: vi.fn(),
  getFirestore: vi.fn(),
  connectFirestoreEmulator: vi.fn(),
  getAuth: vi.fn(),
  initializeAuth: vi.fn(),
  connectAuthEmulator: vi.fn(),
  getAnalytics: vi.fn(),
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
  const actual = await vi.importActual<typeof import('firebase/firestore')>(
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

function baseConfig(overrides: Partial<IFirebaseConfig> = {}): IFirebaseConfig {
  return {
    projectId: 'test',
    appId: 'test-app',
    apiKey: 'test-key',
    ...overrides,
  };
}

function createInjector(config: IFirebaseConfig) {
  const parent = TestBed.inject(EnvironmentInjector);
  return createEnvironmentInjector(
    [provideSneatFirebase(config)],
    parent,
    'sneat-firebase-test',
  );
}

function createAuthOnlyInjector(config: IFirebaseConfig) {
  const parent = TestBed.inject(EnvironmentInjector);
  return createEnvironmentInjector(
    [provideSneatFirebaseAuth(config)],
    parent,
    'sneat-firebase-auth-test',
  );
}

describe('provideSneatFirebase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.native = false;
    mocks.firestore._settings.ssl = false;
    TestBed.resetTestingModule();
  });

  it('initializes FirebaseApp lazily from the given config', () => {
    const injector = createInjector(baseConfig());
    expect(mocks.initializeApp).not.toHaveBeenCalled();

    const app = injector.get(SNEAT_FIREBASE_APP);
    expect(app).toBe(mocks.app);
    expect(mocks.initializeApp).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: 'test' }),
    );
    injector.destroy();
  });

  it('keeps Firestore and Firebase Analytics out of an auth-only shell', () => {
    const injector = createAuthOnlyInjector(baseConfig());

    expect(injector.get(SNEAT_FIREBASE_AUTH)).toBe(mocks.auth);
    expect(injector.get(Firestore, null)).toBeNull();
    expect(injector.get(SNEAT_FIREBASE_ANALYTICS, null)).toBeNull();
    expect(mocks.getFirestore).not.toHaveBeenCalled();
    expect(mocks.getAnalytics).not.toHaveBeenCalled();
    injector.destroy();
  });

  it('adds Firestore only in a child data injector', () => {
    const authInjector = createAuthOnlyInjector(baseConfig());
    const dataInjector = createEnvironmentInjector(
      [provideSneatFirestore(baseConfig())],
      authInjector,
      'sneat-firebase-data-test',
    );

    expect(dataInjector.get(Firestore)).toBe(mocks.firestore);
    expect(mocks.getFirestore).toHaveBeenCalledWith(mocks.app);
    dataInjector.destroy();
    authInjector.destroy();
  });

  it('resolves Firestore wired to the initialized app, no emulator', () => {
    const injector = createInjector(baseConfig());
    const firestore = injector.get(Firestore);
    expect(firestore).toBe(mocks.firestore);
    expect(mocks.getFirestore).toHaveBeenCalledWith(mocks.app);
    expect(mocks.connectFirestoreEmulator).not.toHaveBeenCalled();
    injector.destroy();
  });

  it('connects the Firestore emulator when configured', () => {
    const injector = createInjector(
      baseConfig({
        emulator: {
          authPort: 9099,
          firestorePort: 8080,
          firestoreHost: 'localhost',
        },
      }),
    );
    injector.get(Firestore);
    expect(mocks.connectFirestoreEmulator).toHaveBeenCalledWith(
      mocks.firestore,
      'localhost',
      8080,
    );
    expect(mocks.firestore._settings.ssl).toBe(false);
    injector.destroy();
  });

  it('flips the Firestore emulator to SSL when its port is 443', () => {
    const injector = createInjector(
      baseConfig({
        emulator: { authPort: 9099, firestorePort: 443 },
      }),
    );
    injector.get(Firestore);
    expect(mocks.connectFirestoreEmulator).toHaveBeenCalledWith(
      mocks.firestore,
      '127.0.0.1',
      443,
    );
    expect(mocks.firestore._settings.ssl).toBe(true);
    injector.destroy();
  });

  it('uses getAuth() on the web, and connects the Auth emulator when configured', () => {
    const injector = createInjector(
      baseConfig({
        emulator: {
          authPort: 9099,
          authHost: 'localhost',
          firestorePort: 8080,
        },
      }),
    );
    const auth = injector.get(SNEAT_FIREBASE_AUTH);
    expect(auth).toBe(mocks.auth);
    expect(mocks.getAuth).toHaveBeenCalledWith(mocks.app);
    expect(mocks.initializeAuth).not.toHaveBeenCalled();
    expect(mocks.connectAuthEmulator).toHaveBeenCalledWith(
      mocks.auth,
      'http://localhost:9099',
    );
    injector.destroy();
  });

  it('uses initializeAuth() with indexedDB persistence on native platforms', () => {
    mocks.native = true;
    const injector = createInjector(baseConfig());
    const auth = injector.get(SNEAT_FIREBASE_AUTH);
    expect(auth).toBe(mocks.auth);
    expect(mocks.initializeAuth).toHaveBeenCalledWith(
      mocks.app,
      expect.objectContaining({ persistence: expect.anything() }),
    );
    expect(mocks.getAuth).not.toHaveBeenCalled();
    injector.destroy();
  });

  it('skips emulator wiring on a non-localhost host', () => {
    const originalHostname = location.hostname;
    Object.defineProperty(window.location, 'hostname', {
      writable: true,
      value: 'app.sneat.co',
    });
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    const injector = createInjector(
      baseConfig({
        emulator: { authPort: 9099, firestorePort: 8080 },
      }),
    );
    injector.get(Firestore);
    injector.get(SNEAT_FIREBASE_AUTH);
    expect(mocks.connectFirestoreEmulator).not.toHaveBeenCalled();
    expect(mocks.connectAuthEmulator).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalled();

    Object.defineProperty(window.location, 'hostname', {
      writable: true,
      value: originalHostname,
    });
    injector.destroy();
  });

  it('allows emulator wiring for a named localhost app domain', () => {
    const originalHostname = location.hostname;
    Object.defineProperty(window.location, 'hostname', {
      writable: true,
      value: 'sneat-app.localhost',
    });
    expect(location.hostname).toBe('sneat-app.localhost');

    const injector = createInjector(
      baseConfig({ emulator: { authPort: 9099, firestorePort: 8080 } }),
    );
    injector.get(Firestore);
    injector.get(SNEAT_FIREBASE_AUTH);
    expect(mocks.connectFirestoreEmulator).toHaveBeenCalled();
    expect(mocks.connectAuthEmulator).toHaveBeenCalled();

    Object.defineProperty(window.location, 'hostname', {
      writable: true,
      value: originalHostname,
    });
    injector.destroy();
  });

  it('resolves Analytics to null when no real measurementId is configured', () => {
    const injector = createInjector(
      baseConfig({ measurementId: 'G-PROVIDE_IF_NEEDED' }),
    );
    const analytics = injector.get(SNEAT_FIREBASE_ANALYTICS);
    expect(analytics).toBeNull();
    expect(mocks.getAnalytics).not.toHaveBeenCalled();
    injector.destroy();
  });

  it('resolves Analytics eagerly only when injected, wired to the app', () => {
    const injector = createInjector(
      baseConfig({ measurementId: 'G-TEST123' }),
    );
    expect(mocks.getAnalytics).not.toHaveBeenCalled();
    const analytics = injector.get(SNEAT_FIREBASE_ANALYTICS);
    expect(analytics).toBe(mocks.analytics);
    expect(mocks.getAnalytics).toHaveBeenCalledWith(mocks.app);
    injector.destroy();
  });

  it('swallows a getAnalytics() failure and resolves null instead of throwing', () => {
    mocks.getAnalytics.mockImplementation(() => {
      throw new Error('analytics unsupported in this environment');
    });
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    const injector = createInjector(
      baseConfig({ measurementId: 'G-TEST123' }),
    );
    const analytics = injector.get(SNEAT_FIREBASE_ANALYTICS);
    expect(analytics).toBeNull();
    expect(consoleError).toHaveBeenCalled();
    injector.destroy();
  });
});
