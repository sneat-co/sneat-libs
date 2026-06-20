import {
  Directive,
  OnDestroy,
  Injector,
  inject,
  signal,
  computed,
} from '@angular/core';
import {
  CONTACTUS_SPACE_SERVICE,
  IContactusSpaceDboAndID,
} from '@sneat/extension-contactus-contract';
import { UiState } from '@sneat/dto';
import { WithSpaceInput } from '@sneat/space-services';
import { takeUntil, filter } from 'rxjs';
import { CalendarDayService } from '../../services/calendar-day.service';
import { CalendariusSpaceService } from '../../services/calendarius-space.service';
import { HappeningService } from '../../services/happening.service';
import { IHappeningWithUiState } from '@sneat/extension-calendarius-core';
import { zipMapBriefsWithIDs } from '@sneat/space-models';
import { CalendarDataProvider } from '../../services/calendar-data-provider';
import { isToday } from '../calendar-core';

const emptyUiState: UiState = {};

@Directive()
export abstract class CalendarBaseComponent
  extends WithSpaceInput
  implements OnDestroy
{
  protected $date = signal(new Date());
  protected readonly $isToday = computed(() => isToday(this.$date()));

  // private readonly $calendariusSpaceDbo = signal<
  // 	ICalendariusSpaceDbo | null | undefined
  // >(undefined);

  public readonly $contactusSpace = signal<IContactusSpaceDboAndID | undefined>(
    undefined,
  );

  protected readonly $recurringStates = signal<
    Readonly<Record<string, UiState>>
  >({});

  protected readonly $allRecurrings = computed<
    readonly IHappeningWithUiState[] | undefined
  >(() => {
    const recurringsBySpaceID = this.spaceDaysProvider.$recurringsBySpaceID();
    if (Object.keys(recurringsBySpaceID).length === 0) {
      return undefined;
    }
    const allRecurrings: IHappeningWithUiState[] = [];
    // We are not updating $recurringStates here so there us no circular dependency
    const recurringStates = this.$recurringStates();
    Object.entries(recurringsBySpaceID).forEach(
      ([spaceId, recurringBriefs]) => {
        const spaceRecurrings =
          zipMapBriefsWithIDs(recurringBriefs || {})?.map((rh) => {
            const { id } = rh;
            const prevState = recurringStates[id + '@' + spaceId];
            const result: IHappeningWithUiState = {
              id,
              brief: rh.brief,
              state: prevState || emptyUiState,
              space: { id: spaceId },
            };
            return result;
          }) || [];
        allRecurrings.push(...spaceRecurrings);
      },
    );
    return allRecurrings;
  });

  protected readonly spaceDaysProvider: CalendarDataProvider;
  protected readonly injector = inject(Injector);

  private readonly contactusSpaceService = inject(CONTACTUS_SPACE_SERVICE);

  protected constructor() {
    super();
    const calendariusSpaceService = inject(CalendariusSpaceService);
    const happeningService = inject(HappeningService);
    const calendarDayService = inject(CalendarDayService);

    this.spaceDaysProvider = new CalendarDataProvider(
      this.injector,
      this.$spaceID,
      this.errorLogger,
      happeningService,
      calendarDayService,
      calendariusSpaceService,
    );
    this.spaceID$.subscribe({
      next: (spaceID) => {
        if (!spaceID) {
          return;
        }

        this.contactusSpaceService
          .watchSpaceModuleRecord(spaceID)
          .pipe(
            this.takeUntilDestroyed(),
            takeUntil(this.spaceID$.pipe(filter((id) => id !== spaceID))),
          )
          .subscribe((contactusSpace) => {
            this.$contactusSpace.set(contactusSpace);
          });
      },
    });
  }

  override ngOnDestroy(): void {
    super.ngOnDestroy();
    this.spaceDaysProvider.destroy();
  }

  protected setDay(source: string, d: Date): void {
    if (!d) {
      return;
    }
    this.onDayChanged(d);
  }

  protected abstract onDayChanged(d: Date): void;
}
