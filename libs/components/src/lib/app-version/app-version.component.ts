import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { IonItem } from '@ionic/angular/ion-item';
import { IonItemDivider } from '@ionic/angular/ion-item-divider';
import { IonLabel } from '@ionic/angular/ion-label';
import { IonNote } from '@ionic/angular/ion-note';
import { BUILD_INFO, IBuildInfo } from '@sneat/core-public';
import { buildInfo as placeholderBuildInfo } from './build-info';

@Component({
  selector: 'sneat-app-version',
  templateUrl: 'app-version.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonItemDivider, IonLabel, IonItem, IonNote],
})
export class AppVersionComponent {
  // BUILD_INFO is optional so @sneat/components keeps working, unchanged,
  // for every consumer that has not called provideBuildInfo() yet — it
  // falls back to the never-restamped placeholders committed to
  // ./build-info.ts. See @sneat/core-public's build-info.ts for why this is
  // a runtime DI contract rather than a compile-time import.
  protected readonly buildInfo: IBuildInfo =
    inject(BUILD_INFO, { optional: true }) ?? placeholderBuildInfo;
  protected readonly shortGitHash = this.buildInfo.gitHash.substring(0, 7);
}
