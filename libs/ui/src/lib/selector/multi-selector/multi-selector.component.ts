import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ChangeDetectionStrategy,
  input
} from '@angular/core';
import {
  IonButton,
  IonButtons,
  IonCard,
  IonIcon,
  IonItem,
  IonItemDivider,
  IonLabel,
  IonList,
  ModalController,
} from '@ionic/angular';
import { ClassName } from '../../components';
import { ISelectItem, ISelectItemEvent } from '../selector-interfaces';
import {
  OverlayController,
  SelectorBaseComponent,
} from '../selector-base.component';

@Component({
  selector: 'sneat-multi-selector',
  templateUrl: './multi-selector.component.html',
  imports: [
    IonCard,
    IonItemDivider,
    IonLabel,
    IonButtons,
    IonButton,
    IonItem,
    IonIcon,
    IonList,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: ClassName,
      useValue: 'MultiSelectorComponent',
    },
    {
      provide: OverlayController,
      useClass: ModalController,
    },
  ],
})
export class MultiSelectorComponent<T = ISelectItem>
  extends SelectorBaseComponent<T>
  implements OnChanges
{
  readonly title = input('Select');

  readonly canRemove = input(false);
  // TODO: Skipped for migration because:
  //  Your application code writes to the input. This prevents migration.
  @Input() public allItems?: ISelectItem[];
  // TODO: Skipped for migration because:
  //  Your application code writes to the input. This prevents migration.
  @Input() public selectedIDs?: readonly string[];

  @Output() readonly removeItems = new EventEmitter<ISelectItemEvent[]>();
  @Output() readonly addItems = new EventEmitter<ISelectItemEvent[]>();

  protected selectedItems?: ISelectItem[];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['allItems']) {
      this.selectedItems = this.allItems?.filter((item) =>
        this.selectedIDs?.includes(item.id),
      );
    }
  }

  protected removeItem(event: Event, item: ISelectItem): void {
    event.stopPropagation();
    this.selectedItems = this.selectedItems?.filter((i) => i.id !== item.id);
    this.removeItems.emit([{ event, item }]);
  }
}
