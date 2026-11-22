// Firebase Analytics lives in its own module, apart from the App/Auth/Firestore
// providers in ./provide-sneat-firebase. `firebase/analytics` registers its
// component when the module loads, so a bundler keeps it whenever the module
// that imports it is kept. With the import here, an app that only uses
// provideSneatFirebaseAuth()/provideSneatFirestore() (AskMic, for one) no
// longer ships Firebase Analytics in its main bundle; apps that install
// provideSneatFirebaseAnalytics() or provideSneatFirebase() get it as before.
// Keep every `firebase/analytics` import of this library in this file.

import {
  EnvironmentProviders,
  inject,
  makeEnvironmentProviders,
} from '@angular/core';
import {
  IFirebaseConfig,
  SNEAT_FIREBASE_ANALYTICS,
  SNEAT_FIREBASE_APP,
} from '@sneat/core';
import { Analytics, getAnalytics } from 'firebase/analytics';
import {
  provideSneatFirebaseAuth,
  provideSneatFirestore,
} from './provide-sneat-firebase';

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
