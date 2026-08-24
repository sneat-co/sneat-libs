import { Component, ChangeDetectionStrategy } from '@angular/core';
import {
  IonInput,
  IonItem,
  IonItemDivider,
  IonLabel,
} from '@ionic/angular';
import { buildInfo } from './build-info';

@Component({
  selector: 'sneat-app-version',
  templateUrl: 'app-version.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonItemDivider, IonLabel, IonItem, IonInput],
})
export class AppVersionComponent {
  protected readonly buildInfo = buildInfo;
}
