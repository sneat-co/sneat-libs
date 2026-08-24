import { Injectable } from '@angular/core';
import {
  BehaviorSubject,
  Observable,
  defer,
  filter,
  map,
  of,
  switchMap,
  take,
} from 'rxjs';

export const SneatApiNotAuthenticatedError =
  'User is not authenticated yet - no Firebase ID token';

type AuthTokenState =
  | { readonly status: 'unavailable' | 'pending' | 'unauthenticated' }
  | { readonly status: 'authenticated'; readonly token: string }
  | {
      readonly status: 'authenticated';
      readonly resolveToken: SneatApiAuthTokenResolver;
    };

export type SneatApiAuthTokenResolver = (
  forceRefresh: boolean,
) => Promise<string | undefined>;

export interface ISneatApiAuthResolution {
  resolve(token?: string): void;
}

export interface ISneatApiAuthTokenResolution
  extends ISneatApiAuthResolution {
  resolveWithTokenResolver(resolver: SneatApiAuthTokenResolver): void;
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

  beginAuthentication(): ISneatApiAuthTokenResolution {
    const generation = ++this.generation;
    this.state.next({ status: 'pending' });
    const resolveWithTokenResolver = (
      resolveToken: SneatApiAuthTokenResolver,
    ): void => {
      if (generation !== this.generation) return;
      this.state.next({ status: 'authenticated', resolveToken });
    };
    return {
      resolve: (token?: string) => {
        if (generation !== this.generation) return;
        this.state.next(
          token
            ? { status: 'authenticated', token }
            : { status: 'unauthenticated' },
        );
      },
      resolveWithTokenResolver,
    };
  }

  setExplicitToken(token?: string): void {
    ++this.generation;
    this.state.next(
      token
        ? { status: 'authenticated', token }
        : { status: 'unauthenticated' },
    );
  }

  resolvedToken(forceRefresh = false): Observable<string> {
    return this.state.pipe(
      filter((state) => state.status !== 'pending'),
      take(1),
      switchMap((state) => {
        if (state.status !== 'authenticated') {
          throw SneatApiNotAuthenticatedError;
        }
        if ('token' in state) return of(state.token);
        return defer(() => state.resolveToken(forceRefresh)).pipe(
          map((token) => {
            if (this.state.value !== state || !token) {
              throw SneatApiNotAuthenticatedError;
            }
            return token;
          }),
        );
      }),
    );
  }
}
