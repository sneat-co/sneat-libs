import { InjectionToken } from '@angular/core';
import type { FirebaseApp } from 'firebase/app';
import type { Analytics } from 'firebase/analytics';
import type { Auth } from 'firebase/auth';

/**
 * Angular DI tokens for the app's initialized firebase modular SDK instances.
 *
 * ## Why they live in `@sneat/core`
 *
 * The instances themselves are created by `provideSneatFirebase()` in
 * `@sneat/app-auth`, which sits at the *top* of the dependency graph — it
 * depends on `@sneat/auth-core`, `@sneat/logging` and `@sneat/api-*`. Those
 * lower libs are the ones that need to *inject* Auth/App/Analytics
 * (`SneatAuthStateService`, `FirebaseSneatApiAuthAdapter`, the analytics
 * fan-out), so declaring the tokens in `@sneat/app-auth` would make every one
 * of them import their own dependent — a cycle nx's
 * `enforce-module-boundaries` rejects.
 *
 * `@sneat/core` is the one lib every consumer already depends on, and it
 * already owns the matching `IFirebaseConfig`/`FirebaseConfigToken`
 * declarations, so the tokens belong here. `@sneat/app-auth` re-exports all
 * three, so `import { SNEAT_FIREBASE_AUTH } from '@sneat/app-auth'` — the
 * import path documented when these tokens shipped — keeps working unchanged.
 *
 * ## Why the firebase imports are type-only
 *
 * `FirebaseApp`, `Auth` and `Analytics` are interfaces in the modular SDK, so
 * `import type` erases completely at compile time. `@sneat/core` therefore
 * gains **no** runtime dependency on `firebase` from this file — the peer is
 * declared optional for exactly that reason.
 */

/**
 * DI token for the app's initialized `firebase/app` `FirebaseApp` instance.
 *
 * `FirebaseApp` is a plain interface in the modular SDK (no runtime class),
 * so — unlike `Firestore` — it cannot be used as an injection token by
 * itself; inject this token instead, e.g. `inject(SNEAT_FIREBASE_APP)`.
 */
export const SNEAT_FIREBASE_APP = new InjectionToken<FirebaseApp>(
  'SNEAT_FIREBASE_APP',
);

/**
 * DI token for the app's initialized `firebase/auth` `Auth` instance.
 * Same rationale as `SNEAT_FIREBASE_APP`: `Auth` is interface-only upstream.
 */
export const SNEAT_FIREBASE_AUTH = new InjectionToken<Auth>(
  'SNEAT_FIREBASE_AUTH',
);

/**
 * DI token for the app's `firebase/analytics` `Analytics` instance.
 *
 * Resolves to `null` — never throws — when analytics isn't configured (no
 * real `measurementId`, using the fleet's `'G-PROVIDE_IF_NEEDED'` sentinel)
 * or when `getAnalytics()` throws in an environment that doesn't support it
 * (SSR, some webviews, privacy-hardened browsers). The factory only runs the
 * first time something actually injects this token, so an app that never
 * injects it never pays for Analytics initialization at all — consumers must
 * treat the value as optional either way.
 */
export const SNEAT_FIREBASE_ANALYTICS = new InjectionToken<Analytics | null>(
  'SNEAT_FIREBASE_ANALYTICS',
);
