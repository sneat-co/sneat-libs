import {
  EnvironmentProviders,
  DestroyRef,
  Injectable,
  inject,
  makeEnvironmentProviders,
  provideEnvironmentInitializer,
} from '@angular/core';
import { Auth, onIdTokenChanged } from '@angular/fire/auth';
import { SneatApiAuthTokenBridge } from '@sneat/api-public';

/** Firebase-only adapter. It writes to the root bridge; it never creates a
 * route-local API client, so services created before this route see readiness. */
@Injectable()
export class FirebaseSneatApiAuthAdapter {
  private readonly auth = inject(Auth);
  private readonly bridge = inject(SneatApiAuthTokenBridge);
  private readonly destroyRef = inject(DestroyRef);
  private started = false;

  start(): void {
    if (this.started) return;
    this.started = true;
    this.bridge.beginAuthentication();
    const unsubscribe = onIdTokenChanged(this.auth, {
      next: (user) => {
        const readiness = this.bridge.beginAuthentication();
        if (!user) {
          readiness.resolve();
          return;
        }
        user
          .getIdToken()
          .then((token) => readiness.resolve(token))
          .catch((error) => {
            readiness.resolve();
            console.error('getIdToken() error:', error);
          });
      },
      error: (error) => {
        this.bridge.beginAuthentication().resolve();
        console.error('onIdTokenChanged() error:', error);
      },
      complete: () => undefined,
    });
    this.destroyRef.onDestroy(unsubscribe);
  }
}

/** Install only in a lazy authenticated route's providers. */
export function provideFirebaseSneatApiAuth(): EnvironmentProviders {
  return makeEnvironmentProviders([
    FirebaseSneatApiAuthAdapter,
    provideEnvironmentInitializer(() =>
      inject(FirebaseSneatApiAuthAdapter).start(),
    ),
  ]);
}
