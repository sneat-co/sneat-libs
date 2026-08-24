import { Component, inject, ChangeDetectionStrategy, input } from '@angular/core';
import {
  ModalController,
  IonButton,
  IonButtons,
  IonIcon,
  IonItem,
  IonLabel,
} from '@ionic/angular';

@Component({
  selector: 'sneat-dialog-header',
  templateUrl: './dialog-header.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonItem, IonLabel, IonButtons, IonButton, IonIcon],
})
export class DialogHeaderComponent {
  private readonly modalController = inject(ModalController);

  readonly dialogTitle = input('Dialog');

  close(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.modalController.dismiss().catch(console.error);
  }
}
