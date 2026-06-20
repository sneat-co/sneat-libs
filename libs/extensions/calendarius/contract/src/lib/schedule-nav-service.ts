import { InjectionToken } from '@angular/core';
import { ISpaceContext } from '@sneat/space-models';
import { ISchedulePageParams } from './view-models';

export interface IScheduleNavService {
  goCalendar(
    space: ISpaceContext,
    queryParams?: ISchedulePageParams,
  ): Promise<boolean>;
}

export const SCHEDULE_NAV_SERVICE = new InjectionToken<IScheduleNavService>(
  'ScheduleNavService',
);
