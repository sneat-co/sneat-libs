import {
  EnvironmentProviders,
  DestroyRef,
  Injectable,
  inject,
  makeEnvironmentProviders,
  provideEnvironmentInitializer,
} from '@angular/core';
import { onIdTokenChanged } from 'firebase/auth';
import { SNEAT_FIREBASE_AUTH } from '@sneat/core';
import { SneatApiAuthTokenBridge } from '@sneat/api-public';

/** Firebase-only adapter. It writes to the root bridge; it never creates a
 * route-local API client, so services created before this route see readiness. */
@Injectable()
export class FirebaseSneatApiAuthAdapter {
  private readonly auth = inject(SNEAT_FIREBASE_AUTH);
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
        const resolveCurrentToken = async (
          forceRefresh: boolean,
        ): Promise<string | undefined> => {
          const currentUser = this.auth.currentUser;
          if (currentUser !== user) return undefined;
          const token = await currentUser.getIdToken(forceRefresh);
          return this.auth.currentUser === currentUser ? token : undefined;
        };
        user
          .getIdToken(false)
          .then(() =>
            readiness.resolveWithTokenResolver(resolveCurrentToken),
          )
          .catch((error) => {
            // A transient network failure must not convert an existing Firebase
            // session into a signed-out state. The next protected request asks
            // Firebase again and receives either a current token or that error.
            readiness.resolveWithTokenResolver(resolveCurrentToken);
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
