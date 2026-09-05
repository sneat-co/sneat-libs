import { inject } from '@angular/core';
import { CanActivateFn, Router, RouterStateSnapshot } from '@angular/router';
import { filter, firstValueFrom } from 'rxjs';
import { AuthStatuses, SneatAuthStateService } from './sneat-auth-state-service';

/**
 * Redirect target for an unauthenticated visitor: `/login`, or
 * `/login#<path>` for a non-root path so the login page can send them back
 * to it after signing in. Matches the URL shape the fleet's
 * `@angular/fire/auth-guard`-based `redirectToLoginIfNotSignedIn` pipe always
 * produced — that pipe was removed in 0.27.0 together with `@angular/fire`.
 */
export function loginRedirectPath(path: string): string {
  return path && path !== '/' ? `/login#${path}` : '/login';
}

/**
 * Functional route guard — the `@angular/fire`-free replacement for the
 * fleet's one uniform pattern. Before 0.27.0 a protected route read:
 *
 *   import { AuthGuard } from '@angular/fire/auth-guard';
 *   import { redirectToLoginIfNotSignedIn } from '@sneat/auth-core';
 *   {
 *     canActivate: [AuthGuard],
 *     data: { authGuardPipe: () => redirectToLoginIfNotSignedIn },
 *   }
 *
 * Since 0.27.0 — where both `AuthGuard` and `redirectToLoginIfNotSignedIn`
 * are gone — it reads simply:
 *
 *   import { sneatAuthGuard } from '@sneat/auth-core';
 *   { canActivate: [sneatAuthGuard] }
 *
 * Admits a signed-in visitor; redirects everyone else to `/login` (preserving
 * the attempted path as a hash fragment). Driven entirely by Sneat's own
 * `SneatAuthStateService` — no `@angular/fire` `Auth`/`AuthPipe` involved.
 *
 * The attempted path comes from `RouterStateSnapshot.url`, which is already
 * router-relative, so this needs none of the `<base href>` stripping the old
 * `location.pathname`-based pipe did.
 *
 * Waits out the initial `'authenticating'` status (Firebase hasn't resolved
 * the session yet) before deciding, exactly like the old
 * `user(auth).pipe(take(1), redirectToLoginIfNotSignedIn)` composition did.
 */
export const sneatAuthGuard: CanActivateFn = async (
  _route,
  state: RouterStateSnapshot,
) => {
  const authState = inject(SneatAuthStateService);
  const router = inject(Router);
  const status = await firstValueFrom(
    authState.authStatus.pipe(
      filter((s) => s !== AuthStatuses.authenticating),
    ),
  );
  if (status === AuthStatuses.authenticated) {
    return true;
  }
  return router.parseUrl(loginRedirectPath(state.url));
};
