import { Provider } from '@angular/core';
import { SPACE_NAV_SERVICE } from '@sneat/space-services';
import { SpaceNavRouterService } from './services/space-nav-router.service';

/**
 * Binds the plain Angular `Router`-backed `ISpaceNavService` implementation
 * to the `SPACE_NAV_SERVICE` contract token. Consumed at non-Ionic (e.g.
 * PrimeNG) app bootstrap.
 */
export function provideSpaceNavRouterInternal(): Provider[] {
  return [
    SpaceNavRouterService,
    { provide: SPACE_NAV_SERVICE, useExisting: SpaceNavRouterService },
  ];
}
