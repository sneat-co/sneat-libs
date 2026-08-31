import { TitleCasePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { IonSelect, IonSelectOption, MenuController } from '@ionic/angular';
import { ISneatUserState } from '@sneat/auth-core';
import { IUserSpaceBrief } from '@sneat/auth-models';
import { IIdAndBrief } from '@sneat/core';
import { zipMapBriefsWithIDs } from '@sneat/space-models';
import { SpaceServiceModule } from '@sneat/space-services';
import { ClassName } from '@sneat/ui';
import { takeUntil } from 'rxjs/operators';
import { SpaceBaseComponent } from '../space-base-component.directive';
import { SpaceComponentBaseParams } from '../space-component-base-params.service';

/**
 * Switches the active space and, by default, navigates to that space's default
 * page. Hosts that need to preserve their own sub-route can handle selection
 * through `spaceSelected` and turn off the default navigation.
 *
 * It is deliberately presentation-only: callers place it in a menu section,
 * a card header, or another Ionic item and opt into closing a surrounding menu.
 */
@Component({
  selector: 'sneat-space-selector',
  styles: `
    ion-select::part(label) {
      color: var(--ion-color-medium);
    }
  `,
  template: `
    <ion-select
      label="Space"
      [value]="$space().id"
      [justify]="justify()"
      interface="popover"
      (ionChange)="onSpaceSelected($event)"
      style="font-weight: bold"
    >
      @for (userSpace of $spaces(); track userSpace.id) {
        <ion-select-option [value]="userSpace.id">
          {{
            userSpace.brief.title ||
              (userSpace.brief.type | titlecase) ||
              userSpace.id
          }}
        </ion-select-option>
      } @empty {
        @let space = $space();
        <ion-select-option [value]="$safeNavigationMigration(space?.id)">
          @if (!space || (!space?.id && !space?.type)) {
            Loading...
          } @else {
            {{ space.brief?.title || (space.type | titlecase) || space.id }}
          }
        </ion-select-option>
      }
    </ion-select>
  `,
  imports: [TitleCasePipe, SpaceServiceModule, IonSelect, IonSelectOption],
  providers: [
    { provide: ClassName, useValue: 'SpaceSelectorComponent' },
    SpaceComponentBaseParams,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpaceSelectorComponent extends SpaceBaseComponent {
  /** Whether a containing Ionic menu should close after a space is selected. */
  readonly closeMenuOnSelection = input(false);
  /** Align the label and selected space within the enclosing item. */
  readonly justify = input<'start' | 'end' | 'space-between'>('start');
  /** Whether selection should navigate to the selected space's default page. */
  readonly navigateOnSelection = input(true);
  /** Emits the selected space so a host can preserve its contextual sub-route. */
  readonly spaceSelected = output<IIdAndBrief<IUserSpaceBrief>>();

  protected readonly $spaces = signal<
    readonly IIdAndBrief<IUserSpaceBrief>[] | undefined
  >(undefined);

  private readonly menuCtrl = inject(MenuController);

  constructor() {
    super();
    this.spaceParams.userService.userState
      .pipe(takeUntil(this.destroyed$))
      .subscribe({
        next: (userState: ISneatUserState) =>
          this.$spaces.set(
            userState?.record
              ? zipMapBriefsWithIDs(userState.record.spaces) || []
              : undefined,
          ),
        error: this.errorLogger.logErrorHandler('failed to get user state'),
      });
  }

  protected onSpaceSelected(event: Event): void {
    const spaceID = (event as CustomEvent).detail.value as string;
    if (spaceID === this.space?.id) {
      return;
    }
    const space = this.$spaces()?.find((candidate) => candidate.id === spaceID);
    if (space) {
      this.setSpaceRef(space);
      this.spaceSelected.emit(space);
      if (this.navigateOnSelection()) {
        this.spaceNav
          .navigateToSpace(space)
          .catch(
            this.errorLogger.logErrorHandler(
              'Failed to navigate to selected space',
            ),
          );
      }
    }
    if (this.closeMenuOnSelection()) {
      this.menuCtrl.close().catch(this.errorLogger.logError);
    }
  }
}
