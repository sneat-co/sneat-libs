import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  input,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  signal,
  SimpleChanges,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonSegment, IonSegmentButton } from '@ionic/angular/standalone';
import { IContactusSpaceDboAndID } from '@sneat/contactus-core';
import { ISlotUIEvent } from '@sneat/extension-calendarius-core';
import { IHappeningContext } from '@sneat/extension-calendarius-core';
import { WithSpaceInput } from '@sneat/space-services';
import { HappeningService } from '../../../../services/happening.service';
import { Observable, Subscription } from 'rxjs';
import { SingleHappeningsListComponent } from './single-happenings-list.component';
import { ClassName } from '@sneat/ui';

@Component({
  imports: [
    SingleHappeningsListComponent,
    IonSegment,
    IonSegmentButton,
    FormsModule,
  ],
  providers: [{ provide: ClassName, useValue: 'SinglesTabComponent' }],
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'sneat-singles-tab',
  templateUrl: 'singles-tab.component.html',
})
export class SinglesTabComponent
  extends WithSpaceInput
  implements OnChanges, OnDestroy
{
  private readonly happeningService = inject(HappeningService);

  private upcomingSinglesSubscription?: Subscription;
  protected readonly upcomingSingles = signal<IHappeningContext[] | undefined>(
    undefined,
  );

  private pastSinglesSubscription?: Subscription;
  protected readonly pastSingles = signal<IHappeningContext[] | undefined>(
    undefined,
  );

  private recentSinglesSubscription?: Subscription;
  protected readonly recentSingles = signal<IHappeningContext[] | undefined>(
    undefined,
  );

  public readonly tab = signal<'upcoming' | 'past' | 'recent'>('upcoming');

  @Output() readonly slotClicked = new EventEmitter<ISlotUIEvent>();

  @Input() onDateSelected?: (date: Date) => void;

  public readonly $contactusSpace = input.required<
    IContactusSpaceDboAndID | undefined
  >();

  public constructor() {
    super();
  }

  public ngOnChanges(changes: SimpleChanges): void {
    // console.log('SinglesTabComponent.ngOnChanges()', changes);
    const spaceChange = changes['$space'];
    if (spaceChange) {
      if (this.$spaceID() !== spaceChange.previousValue?.id) {
        switch (this.tab()) {
          case 'upcoming':
            this.watchUpcomingSingles();
            break;
          case 'past':
            this.watchPastSingles();
            break;
        }
      }
    }
  }

  protected onTabChanged(event: Event): void {
    event.stopPropagation();
    switch (this.tab()) {
      case 'upcoming':
        if (!this.upcomingSinglesSubscription) {
          this.watchUpcomingSingles();
        }
        break;
      case 'past':
        if (!this.pastSinglesSubscription) {
          this.watchPastSingles();
        }
        break;
      case 'recent':
        if (!this.recentSinglesSubscription) {
          this.watchRecentSingles();
        }
        break;
    }
  }

  private watchUpcomingSingles(): void {
    const space = this.$space();
    if (!space) {
      return;
    }
    this.upcomingSinglesSubscription = this.watchSingles(
      this.happeningService.watchUpcomingSingles(space),
      this.upcomingSinglesSubscription,
      (singles) => this.upcomingSingles.set(singles),
    );
  }

  private watchPastSingles(): void {
    const space = this.$space();
    if (!space) {
      return;
    }
    this.pastSinglesSubscription = this.watchSingles(
      this.happeningService.watchPastSingles(space),
      this.pastSinglesSubscription,
      (singles) => this.pastSingles.set(singles),
    );
  }

  private watchRecentSingles(): void {
    const space = this.$space();
    if (!space) {
      return;
    }
    this.recentSinglesSubscription = this.watchSingles(
      this.happeningService.watchRecentlyCreatedSingles(space),
      this.recentSinglesSubscription,
      (singles) => this.recentSingles.set(singles),
    );
  }

  private watchSingles(
    singles$: Observable<IHappeningContext[]>,
    sub: Subscription | undefined,
    processSingles: (singles: IHappeningContext[]) => void,
  ): Subscription | undefined {
    sub?.unsubscribe();
    const space = this.$space();
    if (!space) {
      return;
    }
    return singles$.pipe(this.takeUntilDestroyed()).subscribe({
      next: (singles) => {
        processSingles(singles);
      },
      error: this.errorLogger.logErrorHandler('Failed to load past happenings'),
    });
  }
}
