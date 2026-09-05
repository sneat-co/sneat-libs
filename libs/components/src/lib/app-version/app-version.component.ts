import { Component, ChangeDetectionStrategy } from '@angular/core';
import { IonInput } from '@ionic/angular/ion-input';
import { IonItem } from '@ionic/angular/ion-item';
import { IonItemDivider } from '@ionic/angular/ion-item-divider';
import { IonLabel } from '@ionic/angular/ion-label';
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
