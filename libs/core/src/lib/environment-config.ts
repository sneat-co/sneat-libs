import { InjectionToken } from '@angular/core';
import { BrowserOptions } from '@sentry/browser';
import { PostHogConfig } from 'posthog-js';

export interface IFirebaseEmulatorConfig {
  authPort: number;
  authHost?: string;
  firestorePort: number;
  firestoreHost?: string;
}

export interface IFirebaseConfig {
  emulator?: IFirebaseEmulatorConfig;
  //
  projectId: string;
  appId: string;
  measurementId?: string;
  messagingSenderId?: string;
  apiKey: string;
  // Optional: when omitted, appEnvironmentConfig() defaults it to the current
  // origin (location.hostname) so the OAuth redirect stays same-origin /
  // first-party. Set it explicitly only to force a specific auth domain (e.g.
  // Capacitor, or a shared SSO domain).
  authDomain?: string;
  databaseURL?: string;
  storageBucket?: string;
}

type OnlyValidKeys<T, Shape> = T extends Shape
  ? Exclude<keyof T, keyof Shape> extends never
    ? T
    : never
  : never;

export interface IPosthogSettings {
  readonly token: string;
  readonly config?: OnlyValidKeys<
    Partial<PostHogConfig>,
    Partial<PostHogConfig>
  >;
}

export interface IEnvironmentConfig {
  production: boolean;
  useNgrok?: boolean;
  posthog?: IPosthogSettings;
  sentry?: BrowserOptions;
  agents: Record<string, string>;
  firebaseConfig: IFirebaseConfig;
  firebaseBaseUrl?: string;
  // Web OAuth sign-in strategy. Defaults to 'popup'. Use 'redirect' for apps
  // served at their own same-origin authDomain where signInWithPopup is
  // unreliable under current Chrome COOP behavior (the popup closes but its
  // result never reaches the opener). Redirect completion is handled at startup
  // by BaseAppComponent's getRedirectResult() call.
  signInMethod?: 'popup' | 'redirect';
}

export const FirebaseConfigToken = new InjectionToken<IFirebaseConfig>(
  'firebaseConfig',
);
export const EnvConfigToken = new InjectionToken<IEnvironmentConfig>(
  'envConfig',
);
