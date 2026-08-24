import {
  ChangeDetectionStrategy,
  Component,
  Input,
  inject,
  input
} from '@angular/core';
import {
  IonBadge,
  IonButton,
  IonButtons,
  IonIcon,
  IonItem,
  IonLabel,
} from '@ionic/angular';
import { WdToWeekdayPipe } from '../../pipes/wd-to-weekday.pipe';
import { emptyHappeningSlot, IHappeningContext, IHappeningSlotWithID } from '@sneat/extension-calendarius-contract';
import { HappeningSlotModalService } from '../happening-slot-form/happening-slot-modal.service';

@Component({
  selector: 'sneat-happening-slot',
  templateUrl: 'happening-slot.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    // TODO(help-wanted): Can we import just specific pipe?
    WdToWeekdayPipe,
    IonItem,
    IonBadge,
    IonLabel,
    IonButtons,
    IonButton,
    IonIcon,
  ],
})
export class HappeningSlotComponent {
  private readonly happeningSlotModalService = inject(
    HappeningSlotModalService,
  );

  public readonly happening = input.required<IHappeningContext | undefined>();
  // TODO: Skipped for migration because:
  //  This input is used in a control flow expression (e.g. `@if` or `*ngIf`)
  //  and migrating would break narrowing currently.
  @Input({ required: true }) public slot: IHappeningSlotWithID =
    emptyHappeningSlot;

  protected deleting = false;

  protected async editHappeningSlot(event: Event): Promise<void> {
    const happening = this.happening();
    if (!happening) {
      return Promise.reject('no happening');
    }
    if (!happening) {
      return Promise.reject('no happening');
    }
    await this.happeningSlotModalService.editSingleHappeningSlot(
      event,
      happening,
      undefined,
      this.slot,
    );
  }
}
