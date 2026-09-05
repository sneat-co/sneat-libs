import {
  EnvironmentProviders,
  inject,
  makeEnvironmentProviders,
} from '@angular/core';
import { Capacitor } from '@capacitor/core';
import {
  IFirebaseConfig,
  SNEAT_FIREBASE_ANALYTICS,
  SNEAT_FIREBASE_APP,
  SNEAT_FIREBASE_AUTH,
} from '@sneat/core';
import { FirebaseApp, initializeApp } from 'firebase/app';
import { Analytics, getAnalytics } from 'firebase/analytics';
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
 * The three Firebase instance tokens now live in `@sneat/core` — every lib
 * that injects them (`@sneat/auth-core`, `@sneat/logging`,
 * `@sneat/api-firebase-auth`) sits *below* `@sneat/app-auth` in the graph, so
 * declaring them here would force a dependency cycle. They are re-exported so
 * `import { SNEAT_FIREBASE_AUTH } from '@sneat/app-auth'` — the path
 * documented when they shipped — keeps working unchanged.
 *
 * @see `@sneat/core`'s `firebase.tokens.ts` for the full rationale.
 */
export {
  SNEAT_FIREBASE_APP,
  SNEAT_FIREBASE_AUTH,
  SNEAT_FIREBASE_ANALYTICS,
} from '@sneat/core';

function emulatorAllowed(enabled: boolean): boolean {
  if (!enabled) return false;
  const hostname = typeof location === 'undefined' ? '' : location.hostname;
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname === '127.0.0.1'
  ) {
    return true;
  }
  console.error(
    '[provideSneatFirebase] Emulator config present on a non-localhost host ' +
      `("${hostname || '?'}") — ignoring it.`,
  );
  return false;
}

/**
 * Firebase App + Auth boundary for an app shell that must know whether the
 * visitor is signed in. It deliberately does not import or provide Firestore
 * or Firebase Analytics: put those behind the authenticated route that needs
 * data. `provideSneatFirebase()` remains the compatibility all-in-one API.
 *
 * Emulator wiring (`connectFirestoreEmulator`/`connectAuthEmulator`) includes
 * the Capacitor native-vs-web Auth persistence split and the
 * firestore-emulator-over-443 SSL flag flip.
 *
 * This replaced `getAngularFireProviders()`, removed in @sneat/app-auth
 * 0.27.0 along with the `@angular/fire` dependency itself.
 * `provideSneatAuthenticatedProviders()` calls it for you; call it directly
 * only in an app that wires its own authenticated route providers.
 */
export function provideSneatFirebaseAuth(
  firebaseConfig: IFirebaseConfig,
): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: SNEAT_FIREBASE_APP,
      useFactory: (): FirebaseApp => initializeApp(firebaseConfig),
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
  ]);
}

/** Install only where a component actually reads or writes Firestore data. */
export function provideSneatFirestore(
  firebaseConfig: IFirebaseConfig,
): EnvironmentProviders {
  return makeEnvironmentProviders([
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
  ]);
}

/** Install only in the route that has elected to send Firebase Analytics. */
export function provideSneatFirebaseAnalytics(
  firebaseConfig: IFirebaseConfig,
): EnvironmentProviders {
  return makeEnvironmentProviders([
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

/** Compatibility bootstrap for existing app roots. New apps should compose
 * `provideSneatFirebaseAuth()` at the shell and add Firestore/Analytics only
 * to their lazy authenticated routes. */
export function provideSneatFirebase(
  firebaseConfig: IFirebaseConfig,
): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideSneatFirebaseAuth(firebaseConfig),
    provideSneatFirestore(firebaseConfig),
    provideSneatFirebaseAnalytics(firebaseConfig),
  ]);
}
