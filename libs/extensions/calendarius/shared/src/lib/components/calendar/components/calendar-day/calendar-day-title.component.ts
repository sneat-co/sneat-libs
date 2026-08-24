import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { LongMonthNamePipe } from '@sneat/components';
import { WdToWeekdayPipe } from '../../../../pipes/wd-to-weekday.pipe';
import { isToday, isTomorrow } from '../../../calendar-core';
import { Weekday } from '../../weekday';

@Component({
  selector: 'sneat-calendar-day-title',
  templateUrl: 'calendar-day-title.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [WdToWeekdayPipe, LongMonthNamePipe],
})
export class CalendarDayTitleComponent {
  // TODO: Skipped for migration because:
  //  This input is used in a control flow expression (e.g. `@if` or `*ngIf`)
  //  and migrating would break narrowing currently.
  @Input({ required: true }) weekday?: Weekday;

  protected get date(): Date | undefined {
    return this.weekday?.day?.date;
  }

  protected isToday(): boolean {
    const date = this.date;
    return !date || isToday(date);
  }

  protected isTomorrow(): boolean {
    return isTomorrow(this.date);
  }
}
