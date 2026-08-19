import { Provider } from '@angular/core';
import { SPACE_NAV_SERVICE } from '@sneat/space-services';
import { SpaceNavIonicService } from './services/space-nav-ionic.service';

/**
 * Binds the `NavController`-backed `ISpaceNavService` implementation to the
 * `SPACE_NAV_SERVICE` contract token. Consumed at Ionic app bootstrap.
 */
export function provideSpaceNavIonicInternal(): Provider[] {
  return [
    SpaceNavIonicService,
    { provide: SPACE_NAV_SERVICE, useExisting: SpaceNavIonicService },
  ];
}
