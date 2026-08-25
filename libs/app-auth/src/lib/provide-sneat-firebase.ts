import {
  EnvironmentProviders,
  InjectionToken,
  inject,
  makeEnvironmentProviders,
} from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { IFirebaseConfig } from '@sneat/core';
import { FirebaseApp, initializeApp } from 'firebase/app';
import {
  Analytics,
  getAnalytics,
} from 'firebase/analytics';
import {
  Auth,
  connectAuthEmulator,
  getAuth,
  indexedDBLocalPersistence,
  initializeAuth,
} from 'firebase/auth';
import {
  Firestore,
  connectFirestoreEmulator,
  getFirestore,
} from 'firebase/firestore';

/** Re-exported so `Firestore` (a real class in the modular SDK, usable
 * as-is as an Angular DI token) has one import source alongside the tokens
 * below — consumers never need to reach into `firebase/firestore` directly. */
export { Firestore } from 'firebase/firestore';

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

function emulatorAllowed(enabled: boolean): boolean {
  if (!enabled) return false;
  const hostname = typeof location === 'undefined' ? '' : location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
  console.error(
    '[provideSneatFirebase] Emulator config present on a non-localhost host ' +
      `("${hostname || '?'}") — ignoring it.`,
  );
  return false;
}

/**
 * `@angular/fire`-free replacement for `getAngularFireProviders()` (see
 * `./init-firebase`). Initializes the firebase modular SDK directly
 * (`initializeApp`/`getFirestore`/`getAuth`/`getAnalytics`) and provides
 * `FirebaseApp`, `Firestore`, `Auth`, and `Analytics` through Angular DI —
 * `inject(Firestore)`, `inject(SNEAT_FIREBASE_AUTH)`, etc. — with no
 * `@angular/fire` import anywhere in this file or its call graph.
 *
 * Emulator wiring (`connectFirestoreEmulator`/`connectAuthEmulator`) mirrors
 * `getAngularFireProviders()` exactly, including the Capacitor native-vs-web
 * Auth persistence split and the firestore-emulator-over-443 SSL flag flip.
 *
 * NOT YET wired into `provideSneatAuthenticatedProviders()` / the fleet's
 * bootstrap chain. sneat-libs' own internals (`SneatAuthStateService`,
 * `FirebaseSneatApiAuthAdapter`, the analytics fan-out, …) still depend on
 * `@angular/fire`'s `Auth`/`Firestore`/`Analytics` tokens, and cutting them
 * over is a separate, larger pass — see the Step 1 PR description. This
 * function exists standalone so it can be adopted incrementally, and so its
 * own DI wiring is exercised and tested ahead of that cutover.
 */
export function provideSneatFirebase(
  firebaseConfig: IFirebaseConfig,
): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: SNEAT_FIREBASE_APP,
      useFactory: (): FirebaseApp => initializeApp(firebaseConfig),
    },
    {
      provide: Firestore,
      useFactory: (): Firestore => {
        const app = inject(SNEAT_FIREBASE_APP);
        const firestore = getFirestore(app);
        const emulator = firebaseConfig.emulator;
        if (emulator && emulatorAllowed(true)) {
          connectFirestoreEmulator(
            firestore,
            emulator.firestoreHost || '127.0.0.1',
            emulator.firestorePort,
          );
          if (emulator.firestorePort === 443) {
            (
              firestore as unknown as { _settings: { ssl: boolean } }
            )._settings.ssl = true;
          }
        }
        return firestore;
      },
    },
    {
      provide: SNEAT_FIREBASE_AUTH,
      useFactory: (): Auth => {
        const app = inject(SNEAT_FIREBASE_APP);
        const auth: Auth = Capacitor.isNativePlatform()
          ? initializeAuth(app, { persistence: indexedDBLocalPersistence })
          : getAuth(app);
        const emulator = firebaseConfig.emulator;
        if (emulator?.authPort && emulatorAllowed(true)) {
          connectAuthEmulator(
            auth,
            `${emulator.authPort === 443 ? 'https' : 'http'}://${emulator.authHost || '127.0.0.1'}:${emulator.authPort}`,
          );
        }
        return auth;
      },
    },
    {
      provide: SNEAT_FIREBASE_ANALYTICS,
      useFactory: (): Analytics | null => {
        if (
          !firebaseConfig.measurementId ||
          firebaseConfig.measurementId === 'G-PROVIDE_IF_NEEDED'
        ) {
          return null;
        }
        try {
          const app = inject(SNEAT_FIREBASE_APP);
          return getAnalytics(app);
        } catch (error) {
          console.error(
            '[provideSneatFirebase] getAnalytics() failed — continuing without analytics.',
            error,
          );
          return null;
        }
      },
    },
  ]);
}
