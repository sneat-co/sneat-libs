import { EnvironmentProviders, Type } from '@angular/core';
import { getAnalytics, provideAnalytics } from '@angular/fire/analytics';
import {
  Auth,
  connectAuthEmulator,
  indexedDBLocalPersistence,
  initializeAuth,
  provideAuth,
} from '@angular/fire/auth';
import {
  FirebaseApp,
  initializeApp,
  provideFirebaseApp,
} from '@angular/fire/app';
import {
  connectFirestoreEmulator,
  getFirestore,
  provideFirestore,
} from '@angular/fire/firestore';
import { Capacitor } from '@capacitor/core';
import { IFirebaseConfig } from '@sneat/core';
import { getAuth } from 'firebase/auth';

function emulatorAllowed(enabled: boolean): boolean {
  if (!enabled) return false;
  const hostname = typeof location === 'undefined' ? '' : location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
  console.error(
    '[init-firebase] Emulator config present on a non-localhost host ' +
      `("${hostname || '?'}") — ignoring it.`,
  );
  return false;
}
function initFirebase(config: IFirebaseConfig): FirebaseApp {
  return initializeApp(config);
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
      const firestore = getFirestore(injector.get(FirebaseApp));
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
    }),
    provideAuth((injector) => {
      const app = injector.get<FirebaseApp>(FirebaseApp as Type<FirebaseApp>);
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
    }),
  ];
  if (firebaseConfig.measurementId !== 'G-PROVIDE_IF_NEEDED') {
    providers.push(provideAnalytics(() => getAnalytics()));
  }
  return providers;
}
