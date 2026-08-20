import { IEnvironmentConfig } from '@sneat/core';
import { emulatorEnvironmentConfig } from '../environments/environment.base';

// True only when the app is actually running on a developer machine. Used to
// decide, at RUNTIME, whether to use the Firebase emulator — see
// appEnvironmentConfig() below.
export function isLocalhost(): boolean {
  if (typeof location === 'undefined') {
    return false;
  }
  const { hostname } = location;
  // Any *.localhost host is loopback by spec (RFC 6761), so full-site-preview
  // domains like gameboard.localhost must use the emulator too — not just bare
  // localhost. Without the suffix check they fall through to production config.
  return (
    ['localhost', '127.0.0.1', '[::1]', '0.0.0.0'].includes(hostname) ||
    hostname.endsWith('.localhost')
  );
}

// Fail-safe environment selection. Use the Firebase emulator ONLY when running
// on localhost; every deployed domain gets the production config passed in.
//
// Because the emulator-vs-production decision is made at runtime from the
// hostname — NOT from a build-time `fileReplacements` swap — a mis-built or
// mis-deployed bundle can never ship the emulator config to production. This
// structurally eliminates the recurring "127.0.0.1 refused to connect" class of
// bug: forgetting `--configuration production`, a stale `dist/`, an nx cache
// hit, or deploying a dev build can no longer point real users at the emulator.
//
// Apps should define a single environment.ts:
//   export const fooEnvironmentConfig = appEnvironmentConfig({ ...prod config });
// and drop environment.prod.ts + the production fileReplacements entirely.
/**
 * The shared, Firebase-hosted auth domain that serves Google OAuth's
 * /__/auth/handler for every Sneat product (an authorized OAuth redirect
 * domain). Used as the default authDomain so sign-in works on Cloudflare-served
 * product domains, which do not serve /__/auth/handler themselves.
 */
export const SHARED_SNEAT_AUTH_DOMAIN = 'auth.sneat.co';

export function appEnvironmentConfig(
  prod: IEnvironmentConfig,
): IEnvironmentConfig {
  if (isLocalhost()) {
    return appSpecificConfig(emulatorEnvironmentConfig);
  }
  // Default authDomain to the shared, Firebase-hosted auth.sneat.co so Google
  // OAuth completes at /__/auth/handler no matter where the app is served. Most
  // Sneat products run on Cloudflare Workers, which do NOT serve Firebase's
  // /__/auth/handler, so the previous current-origin default sent the redirect
  // to <app-domain>/__/auth/handler and the Angular SPA swallowed it (NG04002).
  // auth.sneat.co is an authorized OAuth redirect domain shared across products.
  // Apps on Firebase Hosting (or wanting a same-origin authDomain) override by
  // setting firebaseConfig.authDomain.
  const authDomain =
    prod.firebaseConfig.authDomain || SHARED_SNEAT_AUTH_DOMAIN;
  return {
    ...prod,
    firebaseConfig: { ...prod.firebaseConfig, authDomain },
  };
}

function firebaseApiKey(useEmulators: boolean, apiKey: string): string {
  return useEmulators ? 'emulator-does-not-need-api-key' : apiKey;
}

export function firebaseProjectId(
  useEmulators: boolean,
  projectId: string,
): string {
  return useEmulators ? 'demo-' + projectId : projectId;
}

// function firebaseDatabaseURL(useEmulators: boolean, projectId: string): string | undefined{
// 	// noinspection SpellCheckingInspection
// 	return useEmulators
// 		? undefined :
// 		`https://${projectId}.firebaseio.com`;
// }

// TODO: document why needed
export function appSpecificConfig(
  envConfig: IEnvironmentConfig,
  // appConfig: IAppSpecificConfig,
): IEnvironmentConfig {
  let config: IEnvironmentConfig = {
    ...envConfig,
    firebaseConfig: {
      ...envConfig.firebaseConfig,
    },
  };
  const { firebaseConfig } = config;
  const useEmulator = !!config.firebaseConfig.emulator;
  const projectId = firebaseProjectId(useEmulator, firebaseConfig.projectId);
  config = {
    ...config,
    firebaseConfig: {
      ...firebaseConfig,
      apiKey: firebaseApiKey(useEmulator, firebaseConfig.apiKey),
      projectId: projectId,
    },
  };
  return config;
}
