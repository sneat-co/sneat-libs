import { WeekdayCode2 } from '@sneat/extension-calendarius-core';
import { CalendarDay } from '../../services/calendar-day';

export interface Weekday {
  // This is used to
  readonly id: WeekdayCode2;
  readonly longTitle: string;
  readonly day?: CalendarDay;
}
