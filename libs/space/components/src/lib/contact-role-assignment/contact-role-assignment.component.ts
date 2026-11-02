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
  untracked,
} from '@angular/core';
import {
  IonButton,
  IonCheckbox,
  IonItem,
  IonLabel,
  IonList,
  IonSpinner,
} from '@ionic/angular';
import { ISpaceModuleItemRef } from '@sneat/dto';
import {
  CONTACT_ROLE_ASSIGNMENT_PICKER,
  IAssignmentRowsSavePort,
  IContactAssignmentRoleOption,
  IContactRoleAssignment,
  IContactRoleAssignmentPicker,
  IContactRoleAssignmentSavePort,
  IRelatedItemChange,
  ISpaceContext,
} from '@sneat/space-models';

const refKey = (ref: ISpaceModuleItemRef) =>
  JSON.stringify([
    ref.spaceID,
    ref.module,
    ref.collection,
    ref.itemID,
    ref.subPath || '',
  ]);
const validContact = (ref: ISpaceModuleItemRef, spaceID: string) =>
  ref.spaceID === spaceID &&
  ref.module === 'contactus' &&
  ref.collection === 'contacts' &&
  !!ref.itemID &&
  !/[@/]/.test(ref.itemID) &&
  !ref.subPath;
const copyAssignments = (rows: readonly IContactRoleAssignment[]) =>
  rows.map((row) => ({
    ...row,
    contact: { ...row.contact },
    roleIDs: [...row.roleIDs],
  }));

/** No role or commercial policy lives here. Missing product configuration is readonly. */
@Component({
  selector: 'sneat-contact-role-assignment',
  templateUrl: './contact-role-assignment.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonButton, IonCheckbox, IonItem, IonLabel, IonList, IonSpinner],
})
export class ContactRoleAssignmentComponent {
  /** Space mode is opt-in; existing contact consumers retain same-Space and nonempty-role guards. */
  readonly endpointKind = input<'contact' | 'space'>('contact');
  readonly assignmentRowsPort = input<IAssignmentRowsSavePort>();
  readonly defaultRoleIDs = input<readonly string[]>([]);
  readonly target = input<ISpaceModuleItemRef>();
  readonly space = input<ISpaceContext>();
  readonly assignments = input<readonly IContactRoleAssignment[]>([]);
  readonly roles = input<readonly IContactAssignmentRoleOption[]>([]);
  readonly roleDirection = input<'rolesOfItem' | 'rolesToItem'>();
  readonly readonly = input(true);
  readonly busy = input(false);
  readonly savePort = input<IContactRoleAssignmentSavePort>();
  readonly picker = input<IContactRoleAssignmentPicker>();
  readonly saved = output<readonly IContactRoleAssignment[]>();
  private readonly injectedPicker = inject(CONTACT_ROLE_ASSIGNMENT_PICKER, {
    optional: true,
  });
  private baseline: readonly IContactRoleAssignment[] = [];
  private epoch = 0;
  readonly draft = signal<readonly IContactRoleAssignment[]>([]);
  readonly pending = signal(false);
  readonly error = signal('');
  readonly locked = computed(() => this.busy() || this.pending());
  readonly configured = computed(() => {
    const target = this.target();
    const options = this.roles();
    return (
      !!target?.spaceID &&
      !!target.module &&
      !!target.collection &&
      !!target.itemID &&
      !target.subPath &&
      target.spaceID === this.space()?.id &&
      !!this.roleDirection() &&
      (this.endpointKind() === 'space'
        ? !!this.assignmentRowsPort()
        : !!this.savePort()) &&
      !!(this.picker() || this.injectedPicker) &&
      options.length > 0 &&
      options.every((role) => !!role.id.trim() && !!role.label.trim()) &&
      new Set(options.map((role) => role.id)).size === options.length &&
      this.assignments().every(
        (row) =>
          this.validEndpoint(row.contact, target.spaceID || '') &&
          new Set(row.roleIDs).size === row.roleIDs.length,
      ) &&
      new Set(this.assignments().map((row) => refKey(row.contact))).size ===
        this.assignments().length
    );
  });
  readonly canEdit = computed(
    () => this.configured() && !this.readonly() && !this.locked(),
  );
  readonly changed = computed(
    () =>
      this.changes().length > 0 ||
      this.baseline.some(
        (row) =>
          !this.draft().some((after) => this.key(after) === this.key(row)),
      ) ||
      this.draft().some(
        (row) =>
          !this.baseline.some((before) => this.key(before) === this.key(row)),
      ),
  );

  constructor() {
    inject(DestroyRef).onDestroy(() => this.epoch++);
    effect(() => {
      const rows = this.assignments();
      // Changes of authorization/configuration invalidate every outstanding async operation.
      this.target();
      this.space();
      this.roles();
      this.readonly();
      this.savePort();
      this.picker();
      this.roleDirection();
      this.endpointKind();
      this.assignmentRowsPort();
      this.defaultRoleIDs();
      untracked(() => {
        this.epoch++;
        this.baseline = copyAssignments(rows);
        this.draft.set(copyAssignments(rows));
        this.pending.set(false);
        this.error.set('');
      });
    });
  }

  private contextSignature(): string {
    return JSON.stringify([
      this.target(),
      this.space()?.id,
      this.roles(),
      this.assignments(),
      this.readonly(),
      this.roleDirection(),
      this.endpointKind(),
      this.defaultRoleIDs(),
    ]);
  }
  private captureContext(): () => boolean {
    const epoch = this.epoch;
    const signature = this.contextSignature();
    const port = this.savePort();
    const picker = this.picker();
    const rowsPort = this.assignmentRowsPort();
    // Compare immediately too: an Angular effect can run after a Promise continuation.
    return () =>
      epoch === this.epoch &&
      signature === this.contextSignature() &&
      port === this.savePort() &&
      picker === this.picker() &&
      rowsPort === this.assignmentRowsPort();
  }

  private validEndpoint(
    ref: ISpaceModuleItemRef,
    targetSpaceID: string,
  ): boolean {
    return this.endpointKind() === 'contact'
      ? validContact(ref, targetSpaceID)
      : !!ref.spaceID &&
          /^[A-Za-z0-9_-]{1,128}$/.test(ref.spaceID) &&
          ref.module === 'spaceus' &&
          ref.collection === 'spaces' &&
          ref.itemID === ref.spaceID &&
          !ref.subPath;
  }
  key(row: IContactRoleAssignment): string {
    return refKey(row.contact);
  }
  hasUnknownRole(row: IContactRoleAssignment): boolean {
    return row.roleIDs.some(
      (role) => !this.roles().some((option) => option.id === role),
    );
  }
  setRole(row: IContactRoleAssignment, role: string, enabled: boolean): void {
    if (
      !this.canEdit() ||
      this.hasUnknownRole(row) ||
      !this.roles().some((r) => r.id === role)
    )
      return;
    this.draft.update((rows) =>
      rows.map((current) =>
        this.key(current) === this.key(row)
          ? {
              ...current,
              roleIDs: enabled
                ? [...new Set([...current.roleIDs, role])]
                : current.roleIDs.filter((r) => r !== role),
            }
          : current,
      ),
    );
  }
  remove(row: IContactRoleAssignment): void {
    if (!this.canEdit() || this.hasUnknownRole(row)) return;
    this.draft.update((rows) =>
      rows.filter((current) => this.key(current) !== this.key(row)),
    );
  }
  cancel(): void {
    if (this.locked()) return;
    this.draft.set(copyAssignments(this.baseline));
    this.error.set('');
  }
  async addContact(): Promise<void> {
    const picker = this.picker() || this.injectedPicker;
    const space = this.space();
    if (!this.canEdit() || !picker || !space) return;
    const current = this.captureContext();
    this.pending.set(true);
    this.error.set('');
    try {
      const row = await picker.selectContact({
        space: { ...space },
        exclude: this.draft().map((r) => ({ ...r.contact })),
      });
      if (!current() || !row) return;
      if (!this.validEndpoint(row.contact, space.id))
        throw new Error('The selected contact does not belong to this Space.');
      if (
        !this.draft().some(
          (current) => this.key(current) === refKey(row.contact),
        )
      )
        this.draft.update((rows) => [
          ...rows,
          {
            ...row,
            contact: { ...row.contact },
            roleIDs: [...this.defaultRoleIDs()],
          },
        ]);
    } catch {
      if (current())
        this.error.set('Could not select a contact. Please try again.');
    } finally {
      if (current()) this.pending.set(false);
    }
  }
  private changes(): readonly IRelatedItemChange[] {
    const current = new Map(this.draft().map((row) => [this.key(row), row]));
    const previous = new Map(this.baseline.map((row) => [this.key(row), row]));
    const direction = this.roleDirection();
    if (!direction) return [];
    return [...new Set([...previous.keys(), ...current.keys()])].flatMap(
      (key) => {
        const before = previous.get(key);
        const after = current.get(key);
        const row = after || before;
        if (!row) return [];
        const add = (after?.roleIDs || []).filter(
          (role) => !before?.roleIDs.includes(role),
        );
        const remove = (before?.roleIDs || []).filter(
          (role) => !after?.roleIDs.includes(role),
        );
        return add.length || remove.length
          ? [
              {
                itemRef: { ...row.contact },
                ...(add.length ? { add: { [direction]: add } } : {}),
                ...(remove.length ? { remove: { [direction]: remove } } : {}),
              },
            ]
          : [];
      },
    );
  }
  async save(): Promise<void> {
    const port = this.assignmentRowsPort() || this.savePort();
    const target = this.target();
    const changes = this.changes();
    if (!this.canEdit() || !port || !target) return;
    if (
      this.endpointKind() === 'contact' &&
      this.draft().some((row) => !row.roleIDs.length)
    ) {
      this.error.set('Choose at least one role for each contact.');
      return;
    }
    if (!this.changed()) return;
    const current = this.captureContext();
    this.pending.set(true);
    this.error.set('');
    try {
      const rowsPort = this.assignmentRowsPort();
      let rows: readonly IContactRoleAssignment[];
      if (rowsPort) {
        rows = await rowsPort.save({
          target: { ...target },
          before: copyAssignments(this.baseline),
          after: copyAssignments(this.draft()),
        });
      } else {
        const contactPort = this.savePort();
        if (!contactPort) return;
        rows = await contactPort.save({ target: { ...target }, changes });
      }
      if (!current()) return;
      if (
        new Set(rows.map((row) => refKey(row.contact))).size !== rows.length ||
        rows.some(
          (row) =>
            !this.validEndpoint(row.contact, target.spaceID || '') ||
            (this.endpointKind() === 'contact' && !row.roleIDs.length) ||
            new Set(row.roleIDs).size !== row.roleIDs.length,
        )
      )
        throw new Error('Invalid assignments response');
      this.baseline = copyAssignments(rows);
      this.draft.set(copyAssignments(rows));
      this.saved.emit(copyAssignments(rows));
    } catch (error) {
      if (current()) {
        let message: string | undefined;
        try {
          message = port.errorMessage?.(error);
        } catch {
          /* Keep the safe fallback. */
        }
        this.error.set(
          message || 'Assignments were not saved. Your changes are retained.',
        );
      }
    } finally {
      if (current()) this.pending.set(false);
    }
  }
}
