import { TitleCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, input } from '@angular/core';
import { IonTitle } from '@ionic/angular';
import { ISpaceContext } from '@sneat/space-models';

@Component({
  imports: [TitleCasePipe, IonTitle],
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'sneat-space-page-title',
  templateUrl: './space-page-title.component.html',
})
export class SpacePageTitleComponent {
  readonly icon = input<string>();
  readonly generalTitle = input<string>();
  // TODO: Skipped for migration because:
  //  This input is used in a control flow expression (e.g. `@if` or `*ngIf`)
  //  and migrating would break narrowing currently.
  @Input({ required: true }) space?: ISpaceContext;
  readonly titlesBySpaceType = input<Record<string, string>>();

  public get typeTitle(): string {
    const titlesBySpaceType = this.titlesBySpaceType();
    return this.space?.type && titlesBySpaceType
      ? titlesBySpaceType[this.space.type]
      : '';
  }
}
