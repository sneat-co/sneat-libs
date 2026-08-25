import { inject } from '@angular/core';
import { CanActivateFn, Router, RouterStateSnapshot } from '@angular/router';
import { filter, firstValueFrom } from 'rxjs';
import { AuthStatuses, SneatAuthStateService } from './sneat-auth-state-service';

/**
 * Redirect target for an unauthenticated visitor: `/login`, or
 * `/login#<path>` for a non-root path so the login page can send them back
 * to it after signing in. Matches the URL shape the fleet's
 * `@angular/fire/auth-guard`-based `redirectToLoginIfNotSignedIn` pipe (see
 * `./sneat-auth-guard`) has always produced.
 */
export function loginRedirectPath(path: string): string {
  return path && path !== '/' ? `/login#${path}` : '/login';
}

/**
 * Functional route guard — the `@angular/fire`-free replacement for the
 * fleet's one uniform pattern:
 *
 *   import { AuthGuard } from '@angular/fire/auth-guard';
 *   import { redirectToLoginIfNotSignedIn } from '@sneat/auth-core';
 *   {
 *     canActivate: [AuthGuard],
 *     data: { authGuardPipe: () => redirectToLoginIfNotSignedIn },
 *   }
 *
 * becomes simply:
 *
 *   import { sneatAuthGuard } from '@sneat/auth-core';
 *   { canActivate: [sneatAuthGuard] }
 *
 * Admits a signed-in visitor; redirects everyone else to `/login` (preserving
 * the attempted path as a hash fragment). Driven entirely by Sneat's own
 * `SneatAuthStateService` — no `@angular/fire` `Auth`/`AuthPipe` involved.
 *
 * Waits out the initial `'authenticating'` status (Firebase hasn't resolved
 * the session yet) before deciding, exactly like the fleet's current
 * `user(auth).pipe(take(1), redirectToLoginIfNotSignedIn)` composition does.
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
