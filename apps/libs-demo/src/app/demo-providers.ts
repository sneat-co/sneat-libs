import { EnvironmentProviders, Provider } from '@angular/core';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { connectAuthEmulator, getAuth, provideAuth } from '@angular/fire/auth';
import {
  AnalyticsService,
  APP_INFO,
  EnvConfigToken,
  FirebaseConfigToken,
  IAnalyticsService,
  IAppInfo,
  IEnvironmentConfig,
  IFirebaseConfig,
} from '@sneat/core';

/**
 * Demo Firebase config.
 *
 * The `demo-` project-id prefix makes the Firebase Auth emulator run fully
 * offline with no real credentials. `apiKey` must be a non-empty string for the
 * SDK to initialize, but its value is irrelevant against the emulator.
 */
const AUTH_EMULATOR_PORT = 9099;

export const demoFirebaseConfig: IFirebaseConfig = {
  projectId: 'demo-sneat-libs',
  appId: 'demo-sneat-libs-app',
  apiKey: 'demo-api-key',
  authDomain: 'localhost',
  emulator: {
    authPort: AUTH_EMULATOR_PORT,
    authHost: 'localhost',
    firestorePort: 8080,
    firestoreHost: 'localhost',
  },
};

const demoEnvConfig: IEnvironmentConfig = {
  production: false,
  agents: {},
  firebaseConfig: demoFirebaseConfig,
};

const demoAppInfo: IAppInfo = {
  appId: 'sneat',
  appTitle: 'Sneat libs demo',
};

/** No-op analytics: the demo does not report to any analytics backend. */
const noopAnalytics: IAnalyticsService = {
  logEvent: () => undefined,
  identify: () => undefined,
  loggedOut: () => undefined,
  setCurrentScreen: () => undefined,
};

/**
 * Providers needed to render `@sneat/auth-ui` components in the demo app.
 *
 * NOTE: this is a best-effort skeleton. The full runtime auth wiring is
 * finalized later by reusing the working setup from `sneat-app`; this iteration
 * only needs to compile.
 */
export const demoProviders: (Provider | EnvironmentProviders)[] = [
  provideFirebaseApp(() => initializeApp(demoFirebaseConfig)),
  provideAuth(() => {
    const auth = getAuth();
    connectAuthEmulator(
      auth,
      `http://localhost:${AUTH_EMULATOR_PORT}`,
      { disableWarnings: true },
    );
    return auth;
  }),
  { provide: APP_INFO, useValue: demoAppInfo },
  { provide: AnalyticsService, useValue: noopAnalytics },
  { provide: FirebaseConfigToken, useValue: demoFirebaseConfig },
  { provide: EnvConfigToken, useValue: demoEnvConfig },
];
