import {
  Component,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  inject,
  ChangeDetectionStrategy,
  input
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import {
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonSegment,
  IonSegmentButton,
  IonSkeletonText,
} from '@ionic/angular';
import { IRecord } from '@sneat/data';
import { ErrorLogger, IErrorLogger } from '@sneat/core';
import { Observable } from 'rxjs';

export interface ICardTab {
  id: string;
  title: string;
}

interface IOptionallyTitled {
  id?: string;
  title?: string;
}

@Component({
  selector: 'sneat-card-list',
  templateUrl: './sneat-card-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterModule,
    IonCard,
    IonItem,
    IonIcon,
    IonLabel,
    IonInput,
    IonButtons,
    IonButton,
    IonSegment,
    IonSegmentButton,
    FormsModule,
    IonCardContent,
    IonSkeletonText,
    IonList,
  ],
})
export class SneatCardListComponent {
  private readonly errorLogger = inject<IErrorLogger>(ErrorLogger);

  // TODO: Skipped for migration because:
  //  This input is used in a control flow expression (e.g. `@if` or `*ngIf`)
  //  and migrating would break narrowing currently.
  @Input() title?: string;
  readonly isFilterable = input<boolean>();
  readonly isLoading = input<boolean>();
  // TODO: Skipped for migration because:
  //  Your application code writes to the input. This prevents migration.
  @Input() items?: { id?: unknown; title?: string }[];
  // TODO: Skipped for migration because:
  //  Your application code writes to the input. This prevents migration.
  @Input() create?: (name: string) => Observable<IRecord<IOptionallyTitled>>;
  // TODO: Skipped for migration because:
  //  This input is used in a control flow expression (e.g. `@if` or `*ngIf`)
  //  and migrating would break narrowing currently.
  @Input() itemIcon?: string;
  // TODO: Skipped for migration because:
  //  Your application code writes to the input. This prevents migration.
  @Input() tab?: string;
  // TODO: Skipped for migration because:
  //  This input is used in a control flow expression (e.g. `@if` or `*ngIf`)
  //  and migrating would break narrowing currently.
  @Input() tabs?: ICardTab[];
  // TODO: Skipped for migration because:
  //  This input is used in a control flow expression (e.g. `@if` or `*ngIf`)
  //  and migrating would break narrowing currently.
  @Input() noItemsText?: string;
  readonly getRouterLink = input<(item: unknown) => string>(() => undefined as unknown as string);

  @Output() readonly cardTitleClick = new EventEmitter<void>();
  @Output() readonly itemClick = new EventEmitter<unknown>();
  @Output() readonly tabChanged = new EventEmitter<string>();

  @ViewChild(IonInput, { static: false }) addInput?: IonInput;

  filter = '';

  protected mode: 'list' | 'add' = 'list';
  protected name = '';
  protected isAdding?: boolean;

  protected click(event: Event, item: unknown): void {
    event.preventDefault();
    event.stopPropagation();
    this.itemClick.emit(item);
  }

  protected showAddForm(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.mode = 'add';
    setTimeout(() => {
      // console.log(this.addInput);
      if (this.addInput) {
        this.addInput
          ?.setFocus()
          .catch((err) =>
            this.errorLogger.logError(err, 'Failed to set focus'),
          );
      }
    }, 200);
  }

  protected tryCreate(): void {
    this.isAdding = true;
    if (this.create) {
      this.create(this.name.trim()).subscribe({
        next: (item) => {
          this.items?.push(item);
          this.isAdding = false;
          this.mode = 'list';
          this.name = '';
        },
        error: (err) => {
          this.errorLogger.logError(err, 'Failed to create new item');
          this.isAdding = false;
        },
      });
    }
  }
}
