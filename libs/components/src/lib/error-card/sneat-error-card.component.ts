import { JsonPipe } from '@angular/common';
import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import {
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonItem,
  IonTextarea,
} from '@ionic/angular';

@Component({
  selector: 'sneat-datatug-error-card',
  templateUrl: './sneat-error-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonItem,
    IonTextarea,
    JsonPipe,
  ],
})
export class SneatErrorCardComponent {
  // TODO: Skipped for migration because:
  //  Your application code writes to the input. This prevents migration.
  @Input()
  error?: { message?: string };
}
