import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { SneatUserService } from '@sneat/auth-core';
import { currentSpacePath, SpaceTypeFamily } from '@sneat/core';
import { filter, firstValueFrom } from 'rxjs';

/**
 * Builds a route guard that sends a signed-in user from a space-less "home"
 * route straight to a space-scoped page — so apps never have to show a
 * spaces-list just to get the user into their space.
 *
 *   1. If a space is already active (remembered in local storage) -> that
 *      space's `<page>`: /space/{type}/{id}/<page>.
 *   2. Otherwise wait for the signed-in user's record and redirect to their
 *      FAMILY space's `<page>`: /space/family/{id}/<page>.
 *   3. If the user has no family space (e.g. brand-new, no spaces yet) -> allow
 *      the guarded route to render its fallback (typically a spaces list, where
 *      they can create/pick a space).
 *
 * Runs AFTER an auth guard, so the user is already authenticated here.
 *
 * Generalises the per-app "redirect home to my space" guard: each extension app
 * passes the trailing segment of its own main page (e.g. assetus -> `'assets'`,
 * requoter -> `'requoter'`).
 *
 * @param page bare space-scoped segment to land on (no leading slash), appended
 *   after the resolved space path.
 */
export function spaceHomeRedirectGuard(page: string): CanActivateFn {
  return async (): Promise<boolean | UrlTree> => {
    const router = inject(Router);
    const userService = inject(SneatUserService);

    // 1. Fast path: an active space is remembered (currentSpacePath() already
    //    yields `/space/{type}/{id}`, so just append the page segment).
    const activePath = currentSpacePath();
    if (activePath) {
      return router.parseUrl(`${activePath}/${page}`);
    }

    // 2. Await the user record (loads asynchronously from Firestore after auth),
    //    then redirect to the family space.
    const state = await firstValueFrom(
      userService.userState.pipe(
        filter((s) => s.status !== 'authenticating' && s.record !== undefined),
      ),
    );
    const spaces = state.record?.spaces ?? {};
    const family = Object.entries(spaces).find(
      ([, brief]) => brief.type === SpaceTypeFamily,
    );
    if (family) {
      return router.parseUrl(`/space/${SpaceTypeFamily}/${family[0]}/${page}`);
    }

    // 3. No active space and no family space — render the fallback.
    return true;
  };
}
