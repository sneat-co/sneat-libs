import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonMenuButton,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { SpaceServiceModule } from '@sneat/space-services';
import { ClassName } from '@sneat/ui';
import { HappeningBasePage } from './happening-base-page';
import {
  HappeningComponentBaseParams,
  HappeningComponentBaseParamsModule,
  HappeningFormComponent,
  HappeningServiceModule,
} from '@sneat/extension-calendarius-shared';

@Component({
  imports: [
    HappeningServiceModule,
    HappeningFormComponent,
    HappeningComponentBaseParamsModule,
    SpaceServiceModule,
    IonHeader,
    IonButtons,
    IonToolbar,
    IonMenuButton,
    IonBackButton,
    IonTitle,
    IonContent,
  ],
  providers: [{ provide: ClassName, useValue: 'HappeningPageComponent' }],
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'sneat-happening-page',
  templateUrl: './happening-page.component.html',
})
export class HappeningPageComponent extends HappeningBasePage {
  public constructor() {
    super(inject(HappeningComponentBaseParams));
  }
}
