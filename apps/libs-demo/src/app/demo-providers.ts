import { EnvironmentProviders, Provider } from '@angular/core';
import { provideSneatFirebase } from '@sneat/app-auth';
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
 *
 * Firebase wiring goes through `provideSneatFirebase()` (`@sneat/app-auth`) —
 * the `@angular/fire`-free replacement for `provideFirebaseApp`/`provideAuth` —
 * so this app builds and runs with no `@angular/fire` dependency at all. It
 * doubles as the Step 1 reference example for the fleet migration recipe.
 */
export const demoProviders: (Provider | EnvironmentProviders)[] = [
  provideSneatFirebase(demoFirebaseConfig),
  { provide: APP_INFO, useValue: demoAppInfo },
  { provide: AnalyticsService, useValue: noopAnalytics },
  { provide: FirebaseConfigToken, useValue: demoFirebaseConfig },
  { provide: EnvConfigToken, useValue: demoEnvConfig },
];
