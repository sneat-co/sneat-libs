import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, filter, map, take } from 'rxjs';

export const SneatApiNotAuthenticatedError =
  'User is not authenticated yet - no Firebase ID token';

type AuthTokenState =
  | { readonly status: 'unavailable' | 'pending' | 'unauthenticated' }
  | { readonly status: 'authenticated'; readonly token: string };

export interface ISneatApiAuthResolution {
  resolve(token?: string): void;
}

/** Root-scoped, Firebase-free bridge shared by API clients created before a
 * lazy authenticated route. The adapter marks it pending synchronously, then
 * resolves token/unauthenticated when Firebase readiness completes. */
@Injectable({ providedIn: 'root' })
export class SneatApiAuthTokenBridge {
  private generation = 0;
  private readonly state = new BehaviorSubject<AuthTokenState>({
    status: 'unavailable',
  });

  beginAuthentication(): ISneatApiAuthResolution {
    const generation = ++this.generation;
    this.state.next({ status: 'pending' });
    return {
      resolve: (token?: string) => {
        if (generation !== this.generation) return;
        this.state.next(
          token
            ? { status: 'authenticated', token }
            : { status: 'unauthenticated' },
        );
      },
    };
  }

  setExplicitToken(token?: string): void {
    ++this.generation;
    this.state.next(
      token ? { status: 'authenticated', token } : { status: 'unauthenticated' },
    );
  }

  resolvedToken(): Observable<string> {
    return this.state.pipe(
      filter((state) => state.status !== 'pending'),
      take(1),
      map((state) => {
        if (state.status !== 'authenticated') {
          throw SneatApiNotAuthenticatedError;
        }
        return state.token;
      }),
    );
  }
}
