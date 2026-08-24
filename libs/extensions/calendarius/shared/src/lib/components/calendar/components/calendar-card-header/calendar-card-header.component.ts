import { Component, ChangeDetectionStrategy, input } from '@angular/core';

@Component({
  selector: 'sneat-calendar-card-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: 'calendar-card-header.component.html',
})
export class CalendarCardHeaderComponent {
  readonly date = input(new Date());
  readonly tab = input<'day' | 'week'>();

  // isCurrentWeek(): boolean {
  // 	const monday = this.activeWeek && this.activeWeek.startDate;
  // 	const today = new Date();
  // 	return !monday || monday.getTime() === getWeekdayDate(today, 0)
  // 		.getTime();
  // }
}
