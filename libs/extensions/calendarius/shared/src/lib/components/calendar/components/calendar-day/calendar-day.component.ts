import {
  ChangeDetectionStrategy,
  Component,
  input,
  Input,
  OnChanges,
  OnDestroy,
  signal,
  SimpleChanges,
  inject,
} from '@angular/core';
import {
  IonButton,
  IonButtons,
  IonIcon,
  IonItem,
  IonItemDivider,
  IonLabel,
  IonSpinner,
} from '@ionic/angular/standalone';
import { dateToIso } from '@sneat/core';
import { ScheduleNavService, ScheduleNavServiceModule } from '@sneat/extension-calendarius-core';
import { ISlotUIContext, jsDayToWeekday, NewHappeningParams, sortSlotItems, WeekdayNumber } from '@sneat/extension-calendarius-contract';
import { WithSpaceInput } from '@sneat/space-services';
import { ClassName } from '@sneat/ui';
import { Subscription } from 'rxjs';
import {
  emptyCalendarFilter,
  CalendarFilterService,
} from '../../../calendar-filter.service';
import { isSlotVisible } from '../../../calendar-slots';
import { Weekday } from '../../weekday';
import { isToday, isTomorrow } from '../../../calendar-core';
import { DaySlotItemComponent } from '../day-slot-item/day-slot-item.component';

@Component({
  imports: [
    ScheduleNavServiceModule,
    DaySlotItemComponent,
    IonItem,
    IonSpinner,
    IonLabel,
    IonItemDivider,
    IonButtons,
    IonIcon,
    IonButton,
  ],
  providers: [{ provide: ClassName, useValue: 'CalendarDayComponent' }],
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'sneat-calendar-day',
  templateUrl: './calendar-day.component.html',
})
export class CalendarDayComponent
  extends WithSpaceInput
  implements OnChanges, OnDestroy
{
  private readonly filterService = inject(CalendarFilterService);
  private readonly scheduleNavService = inject(ScheduleNavService);

  private slotsSubscription?: Subscription;
  private filter = emptyCalendarFilter;
  // @Input() filter?: ICalendarFilter;
  // @Input() showRegulars = true;
  // @Input() showEvents = true;

  public readonly $weekday = input.required<Weekday | undefined>();

  @Input({ required: false }) hideAddButtons = false;
  @Input() hideLastBorder = false;

  protected readonly $isToday = signal<boolean>(false);
  protected readonly $isTomorrow = signal<boolean>(false);

  public readonly allSlots = signal<ISlotUIContext[] | undefined>(undefined);
  public readonly slots = signal<ISlotUIContext[] | undefined>(undefined);
  public readonly slotsHiddenByFilter = signal<number | undefined>(undefined);

  public constructor() {
    super();
    const filterService = this.filterService;

    filterService.filter.pipe(this.takeUntilDestroyed()).subscribe({
      next: (filter) => {
        this.filter = filter;
        this.applyFilter();
      },
    });
  }

  protected readonly resetFilter = (event: Event) =>
    this.filterService.resetScheduleFilter(event);

  ngOnChanges(changes: SimpleChanges): void {
    const weekdayChange = changes['$weekday'];
    if (weekdayChange) {
      const date = this.$weekday()?.day?.date;
      this.$isToday.set(!date || isToday(date));
      this.$isTomorrow.set(isTomorrow(date));
      // if (weekdayChange.firstChange && !weekdayChange.currentValue) {
      // 	return; // TODO: comment with explanation why we need this
      // }
      this.subscribeForSlots();
    }
  }

  private applyFilter(): void {
    const allSlots = this.allSlots();
    if (allSlots?.length) {
      const slots = allSlots
        .filter((slot) => isSlotVisible(slot, this.filter))
        .toSorted(sortSlotItems);
      this.slots.set(slots);
      this.slotsHiddenByFilter.set(allSlots.length - slots.length);
    } else {
      // console.log(this.logPrefix() + '.applyFilter() for empty slots');
      this.slots.set(allSlots);
      this.slotsHiddenByFilter.set(0);
    }
  }

  private subscribeForSlots(): void {
    this.slotsSubscription?.unsubscribe();
    const weekday = this.$weekday();
    if (weekday?.day) {
      this.slotsSubscription = weekday.day.slots$
        .pipe(this.takeUntilDestroyed())
        .subscribe(this.processSlots);
    } else {
      this.slots.set(undefined);
      this.slotsHiddenByFilter.set(undefined);
    }
  }

  private readonly processSlots = (slots?: ISlotUIContext[]) => {
    this.allSlots.set(slots);
    this.applyFilter();
  };

  private readonly logPrefix = () =>
    `CalendarDayComponent{dateID=${this.$weekday()?.day?.dateID}}`;

  protected goNewHappening(params: NewHappeningParams): void {
    const space = this.$space();
    if (!space) {
      return;
    }
    const date = this.$weekday()?.day?.date;
    if (!date) {
      return;
    }
    params = {
      ...params,
      wd: jsDayToWeekday(date.getDay() as WeekdayNumber),
      date: dateToIso(date),
    };
    this.scheduleNavService.goNewHappening(space, params);
  }
}
