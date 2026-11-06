import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { IonButton, IonItem, IonLabel, IonList } from '@ionic/angular';
import { ISpaceModuleItemRef } from '@sneat/dto';
import {
  IAssignmentRowsSavePort,
  IContactRoleAssignment,
  IContactRoleAssignmentPicker,
  IContactAssignmentRoleOption,
  ISpaceRoleAssignment,
  ISpaceRoleAssignmentOption,
  ISpaceRoleAssignmentSavePort,
} from '@sneat/space-models';
import { ContactRoleAssignmentComponent } from '../contact-role-assignment/contact-role-assignment.component';

const toRow = (row: ISpaceRoleAssignment): IContactRoleAssignment => ({
  contact: {
    spaceID: row.spaceID,
    module: 'spaceus',
    collection: 'spaces',
    itemID: row.spaceID,
  },
  title: row.title,
  roleIDs: [...row.roleIDs],
});
const fromRow = (row: IContactRoleAssignment): ISpaceRoleAssignment => ({
  spaceID: row.contact.spaceID || '',
  title: row.title,
  roleIDs: [...row.roleIDs],
});

/** Typed root-Space facade over the shared assignment editor. Options are host-filtered, never authority. */
@Component({
  selector: 'sneat-space-role-assignment',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ContactRoleAssignmentComponent,
    IonButton,
    IonItem,
    IonLabel,
    IonList,
  ],
  template: `
    <sneat-contact-role-assignment
      endpointKind="space"
      [target]="target()"
      [space]="space()"
      [assignments]="rows()"
      [roles]="roles()"
      roleDirection="rolesOfItem"
      [readonly]="readonly()"
      [busy]="busy()"
      [defaultRoleIDs]="defaultRoleIDs()"
      [assignmentRowsPort]="rowsPort()"
      [picker]="picker"
      (saved)="emitSaved($event)"
    />
    @if (choosing()) {
      <ion-list aria-label="Choose a Space">
        @for (option of available(); track option.spaceID) {
          <ion-item
            ><ion-label>{{ option.title }}</ion-label
            ><ion-button
              slot="end"
              (click)="choose(option)"
              [attr.aria-label]="'Choose ' + option.title"
              >Choose</ion-button
            ></ion-item
          >
        } @empty {
          <ion-item
            ><ion-label>No eligible spaces are available.</ion-label></ion-item
          >
        }
      </ion-list>
      <ion-button (click)="cancelPicker()">Cancel selection</ion-button>
    }
  `,
})
export class SpaceRoleAssignmentComponent {
  readonly target = input<ISpaceModuleItemRef>();
  readonly space = input<{ readonly id: string }>();
  readonly assignments = input<readonly ISpaceRoleAssignment[]>([]);
  readonly options = input<readonly ISpaceRoleAssignmentOption[]>([]);
  readonly roles = input<readonly IContactAssignmentRoleOption[]>([]);
  readonly defaultRoleIDs = input<readonly string[]>([]);
  readonly readonly = input(true);
  readonly busy = input(false);
  readonly savePort = input<ISpaceRoleAssignmentSavePort>();
  readonly saved = output<readonly ISpaceRoleAssignment[]>();
  protected readonly rows = computed(() => this.assignments().map(toRow));
  protected readonly choosing = signal(false);
  private readonly excluded = signal<readonly string[]>([]);
  protected readonly available = computed(() =>
    this.options().filter(
      (option) => !this.excluded().includes(option.spaceID),
    ),
  );
  private resolvePicker?: (
    row: Omit<IContactRoleAssignment, 'roleIDs'> | undefined,
  ) => void;
  protected readonly picker: IContactRoleAssignmentPicker = {
    selectContact: (request) =>
      new Promise((resolve) => {
        this.cancelPicker();
        this.excluded.set(request.exclude.map((ref) => ref.spaceID || ''));
        this.resolvePicker = resolve;
        this.choosing.set(true);
      }),
  };
  protected readonly rowsPort = computed<IAssignmentRowsSavePort | undefined>(
    () => {
      const port = this.savePort();
      return port
        ? {
            errorMessage: (error) => port.errorMessage?.(error),
            save: async (request) =>
              (
                await port.save({
                  target: request.target,
                  before: request.before.map(fromRow),
                  after: request.after.map(fromRow),
                })
              ).map(toRow),
          }
        : undefined;
    },
  );
  constructor() {
    inject(DestroyRef).onDestroy(() => this.cancelPicker());
    effect(() => {
      this.target();
      this.space();
      this.options();
      this.readonly();
      this.savePort();
      this.cancelPicker();
    });
  }
  protected choose(option: ISpaceRoleAssignmentOption): void {
    if (
      !this.choosing() ||
      !this.available().some((current) => current.spaceID === option.spaceID)
    )
      return;
    const resolve = this.resolvePicker;
    this.resolvePicker = undefined;
    this.choosing.set(false);
    resolve?.(toRow({ ...option, roleIDs: [] }));
  }
  protected cancelPicker(): void {
    const resolve = this.resolvePicker;
    this.resolvePicker = undefined;
    this.choosing.set(false);
    resolve?.(undefined);
  }
  protected emitSaved(rows: readonly IContactRoleAssignment[]): void {
    this.saved.emit(rows.map(fromRow));
  }
}
