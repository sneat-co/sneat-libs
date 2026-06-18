import { EnvironmentProviders, Type } from '@angular/core';
import { getAnalytics, provideAnalytics } from '@angular/fire/analytics';
import {
  Auth,
  connectAuthEmulator,
  indexedDBLocalPersistence,
  initializeAuth,
  provideAuth,
} from '@angular/fire/auth';
import { connectFirestoreEmulator } from '@angular/fire/firestore';
import { Capacitor } from '@capacitor/core';
import { IFirebaseConfig } from '@sneat/core';
import {
  provideFirebaseApp,
  initializeApp,
  FirebaseApp,
} from '@angular/fire/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { isLocalhost } from './init-helpers';

// Defense in depth: a production bundle should never carry emulator config
// (use appEnvironmentConfig()), but if one slips through, refuse to point real
// users at 127.0.0.1 — that just yields "refused to connect". Warn loudly so a
// post-deploy smoke test (and the console) surfaces the misconfiguration.
function emulatorAllowed(hasEmulator: boolean): boolean {
  if (!hasEmulator) {
    return false;
  }
  if (isLocalhost()) {
    return true;
  }
  console.error(
    '[init-firebase] Emulator config present on a non-localhost host ' +
      `("${typeof location !== 'undefined' ? location.hostname : '?'}") — ` +
      'ignoring it. This is a build/deploy misconfiguration: a production ' +
      'build shipped the emulator environment.',
  );
  return false;
}

export function provideFireApp(firebaseConfig: IFirebaseConfig) {
  return provideFirebaseApp(() => initFirebase(firebaseConfig));
}

export function getAngularFireProviders(
  firebaseConfig: IFirebaseConfig,
): EnvironmentProviders[] {
  const providers = [
    provideFirebaseApp(() => initFirebase(firebaseConfig)),
    provideFirestore((injector) => {
      // console.log('AngularFire: provideFirestore');
      const fbApp = injector.get(FirebaseApp);
      const firestore = getFirestore(fbApp);
      const { emulator } = firebaseConfig;
      if (emulator && emulatorAllowed(!!emulator)) {
        connectFirestoreEmulator(
          firestore,
          emulator.firestoreHost || '127.0.0.1',
          emulator.firestorePort,
        );
        if (emulator.firestorePort === 443) {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-expect-error
          firestore['_settings']['ssl'] = true;
        }
      }
      return firestore;
    }),
    provideAuth((injector) => {
      // console.log('AngularFire: provideAuth');
      const fbApp = injector.get<FirebaseApp>(FirebaseApp as Type<FirebaseApp>);
      let auth: Auth;
      if (Capacitor.isNativePlatform()) {
        auth = initializeAuth(fbApp, {
          persistence: indexedDBLocalPersistence,
        });
      } else {
        auth = getAuth(fbApp);
      }
      const { emulator } = firebaseConfig;
      if (emulator?.authPort && emulatorAllowed(!!emulator)) {
        // alert('Using firebase auth emulator');
        const authUrl = `${emulator.authPort === 443 ? 'https' : 'http'}://${emulator.authHost || '127.0.0.1'}:${emulator.authPort}`;
        // console.log('authUrl: ', authUrl);
        // noinspection HttpUrlsUsage
        connectAuthEmulator(auth, authUrl);
      }
      return auth;
    }),
  ];
  if (firebaseConfig?.measurementId !== 'G-PROVIDE_IF_NEEDED') {
    providers.push(
      provideAnalytics(() => {
        // const fbApp = injector.get<FirebaseApp>(
        // 	FirebaseApp as Type<FirebaseApp>,
        // );
        // const fbAnalytics = getAnalytics(fbApp);
        const fbAnalytics = getAnalytics();
        return fbAnalytics;
      }),
    );
  }
  return providers;
}

function initFirebase(firebaseConfig: IFirebaseConfig): FirebaseApp {
  return initializeApp(firebaseConfig);
}
