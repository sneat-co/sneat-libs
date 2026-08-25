import {
  ActivatedRouteSnapshot,
  Route,
  RouterStateSnapshot,
  UrlSegment,
  UrlTree,
} from '@angular/router';
import { Observable } from 'rxjs';
import { Injectable } from '@angular/core';

/**
 * Permissive class-based route guard: every hook returns `true`.
 *
 * @deprecated Prefer the functional `sneatAuthGuard`
 * (`./redirect-to-login.guard`), which actually blocks an unauthenticated
 * visitor and redirects them to `/login`. This guard admits everyone — it
 * never gated anything — and is kept only so existing route configs
 * referencing `SNEAT_AUTH_GUARDS` keep compiling.
 *
 * As of 0.27.0 it no longer injects Firebase `Auth`: the injected instance was
 * never read, and that injection is what coupled this file to `@angular/fire`.
 */
@Injectable({
  providedIn: 'root',
})
export class SneatAuthGuard {
  public canLoad(
    _route: Route,
    _segments: UrlSegment[],
  ):
    | Observable<boolean | UrlTree>
    | Promise<boolean | UrlTree>
    | boolean
    | UrlTree {
    return true;
  }

  public canActivate(
    _route: ActivatedRouteSnapshot,
    _state: RouterStateSnapshot,
  ) {
    return true;
  }

  canActivateChild(
    _childRoute: ActivatedRouteSnapshot,
    _state: RouterStateSnapshot,
  ) {
    return true;
  }
}

/**
 * @deprecated Use `{ canActivate: [sneatAuthGuard] }` instead — see
 * `./redirect-to-login.guard`. Retained for route configs that still reference
 * it; both hooks resolve to the permissive `SneatAuthGuard` above.
 */
export const SNEAT_AUTH_GUARDS = {
  canActivate: [SneatAuthGuard],
  canLoad: [SneatAuthGuard],
};
