import { Provider } from '@angular/core';
import { SCHEDULE_NAV_SERVICE } from '@sneat/extension-calendarius-contract';
import { ScheduleNavService } from './services';

/**
 * Provides the concrete calendarius services and binds them to the
 * contract injection tokens. Consumed at app bootstrap; other
 * extensions must NOT import this.
 */
export function provideCalendariusInternal(): Provider[] {
  return [
    ScheduleNavService,
    { provide: SCHEDULE_NAV_SERVICE, useExisting: ScheduleNavService },
  ];
}
