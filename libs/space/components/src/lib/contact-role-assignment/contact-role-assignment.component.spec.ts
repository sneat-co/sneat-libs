import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IContactRoleAssignment } from '@sneat/space-models';
import { ContactRoleAssignmentComponent } from './contact-role-assignment.component';

const target = {
  spaceID: 'space-1',
  module: 'demo',
  collection: 'items',
  itemID: 'item-1',
};
const contact = {
  spaceID: 'space-1',
  module: 'contactus',
  collection: 'contacts',
  itemID: 'contact-1',
};
const assignment = (
  roleIDs: readonly string[] = ['test-read'],
): IContactRoleAssignment => ({ contact, title: 'First contact', roleIDs });
const roles = [
  { id: 'test-read', label: 'Read' },
  { id: 'test-edit', label: 'Edit' },
];
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

describe('ContactRoleAssignmentComponent product-neutral workflow', () => {
  let fixture: ComponentFixture<ContactRoleAssignmentComponent>;
  let component: ContactRoleAssignmentComponent;
  let selectContact: ReturnType<typeof vi.fn>;
  let save: ReturnType<typeof vi.fn>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContactRoleAssignmentComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
    fixture = TestBed.createComponent(ContactRoleAssignmentComponent);
    component = fixture.componentInstance;
    selectContact = vi.fn().mockResolvedValue(undefined);
    save = vi.fn().mockResolvedValue([assignment(['test-read', 'test-edit'])]);
    for (const [name, value] of Object.entries({
      target,
      space: { id: 'space-1' },
      assignments: [assignment()],
      roles,
      roleDirection: 'rolesOfItem',
      readonly: false,
      picker: { selectContact },
      savePort: { save },
    }))
      fixture.componentRef.setInput(name, value);
    await fixture.whenStable();
  });

  it('stages several roles for one contact and saves exact delta, using only the acknowledged graph', async () => {
    const pending = deferred<readonly IContactRoleAssignment[]>();
    save.mockReturnValue(pending.promise);
    component.setRole(component.draft()[0], 'test-edit', true);
    expect(save).not.toHaveBeenCalled();
    const operation = component.save();
    expect(save).toHaveBeenCalledWith({
      target,
      changes: [{ itemRef: contact, add: { rolesOfItem: ['test-edit'] } }],
    });
    expect(component.pending()).toBe(true);
    await component.save();
    expect(save).toHaveBeenCalledTimes(1);
    pending.resolve([assignment(['test-edit'])]);
    await operation;
    await fixture.whenStable();
    expect(component.draft()).toEqual([assignment(['test-edit'])]);
    expect(component.changed()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('First contact');
  });
  it('removes all existing roles through one contact delta and sends no noop/cancel request', async () => {
    await component.save();
    expect(save).not.toHaveBeenCalled();
    component.remove(component.draft()[0]);
    component.cancel();
    expect(component.draft()).toEqual([assignment()]);
    expect(save).not.toHaveBeenCalled();
    component.remove(component.draft()[0]);
    save.mockResolvedValue([]);
    await component.save();
    expect(save).toHaveBeenCalledWith({
      target,
      changes: [{ itemRef: contact, remove: { rolesOfItem: ['test-read'] } }],
    });
    expect(component.draft()).toEqual([]);
  });
  it('preserves unknown existing role assignments without offering destructive changes', async () => {
    fixture.componentRef.setInput('assignments', [assignment(['legacy-role'])]);
    await fixture.whenStable();
    component.remove(component.draft()[0]);
    component.setRole(component.draft()[0], 'test-read', true);
    await component.save();
    expect(component.draft()).toEqual([assignment(['legacy-role'])]);
    expect(save).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('legacy-role');
  });
  it('cancels selection and refuses duplicate or foreign-Space contacts', async () => {
    await component.addContact();
    expect(component.draft()).toHaveLength(1);
    selectContact.mockResolvedValue({ contact, title: 'Duplicate' });
    await component.addContact();
    expect(component.draft()).toHaveLength(1);
    selectContact.mockResolvedValue({
      contact: { ...contact, spaceID: 'other-space' },
      title: 'Foreign',
    });
    await component.addContact();
    expect(component.draft()).toHaveLength(1);
    expect(component.error()).not.toBe('');
    expect(save).not.toHaveBeenCalled();
  });
  it('adds an unregistered contact, requires a role, and can cancel the empty row', async () => {
    selectContact.mockResolvedValue({
      contact: { ...contact, itemID: 'contact-2' },
      title: 'Offline contact',
    });
    await component.addContact();
    expect(component.draft()).toHaveLength(2);
    expect(component.changed()).toBe(true);
    await component.save();
    expect(save).not.toHaveBeenCalled();
    expect(component.error()).toContain('at least one role');
    component.cancel();
    expect(component.draft()).toHaveLength(1);
  });
  it('retains staged roles and displays an asynchronous rejection without a manual repaint', async () => {
    const pending = deferred<readonly IContactRoleAssignment[]>();
    save.mockReturnValue(pending.promise);
    component.setRole(component.draft()[0], 'test-edit', true);
    const operation = component.save();
    pending.reject(new Error('Product authority denied'));
    await operation;
    await fixture.whenStable();
    expect(component.draft()[0].roleIDs).toEqual(['test-read', 'test-edit']);
    expect(
      fixture.nativeElement.querySelector('[role="alert"]').textContent,
    ).toContain('not saved');
    expect(component.pending()).toBe(false);
  });
  it('discards an old picker result after the target or readonly authority changes', async () => {
    const pending = deferred<
      Omit<IContactRoleAssignment, 'roleIDs'> | undefined
    >();
    selectContact.mockReturnValue(pending.promise);
    const operation = component.addContact();
    fixture.componentRef.setInput('target', { ...target, itemID: 'item-2' });
    fixture.componentRef.setInput('readonly', true);
    await fixture.whenStable();
    pending.resolve({
      contact: { ...contact, itemID: 'contact-2' },
      title: 'Late contact',
    });
    await operation;
    expect(component.draft()).toEqual([assignment()]);
    expect(component.pending()).toBe(false);
  });
  it('does not apply an old save acknowledgement to the next target', async () => {
    const pending = deferred<readonly IContactRoleAssignment[]>();
    save.mockReturnValue(pending.promise);
    component.setRole(component.draft()[0], 'test-edit', true);
    const operation = component.save();
    fixture.componentRef.setInput('target', { ...target, itemID: 'item-2' });
    await fixture.whenStable();
    pending.resolve([]);
    await operation;
    expect(component.draft()).toEqual([assignment()]);
  });
  it.each(['roles', 'picker', 'savePort', 'roleDirection', 'target'])(
    'fails closed with missing %s',
    async (name) => {
      fixture.componentRef.setInput(name, name === 'roles' ? [] : undefined);
      await fixture.whenStable();
      await component.addContact();
      await component.save();
      expect(component.canEdit()).toBe(false);
      expect(selectContact).not.toHaveBeenCalled();
      expect(save).not.toHaveBeenCalled();
    },
  );
  it('refuses duplicate role configuration and external busy admission', async () => {
    fixture.componentRef.setInput('roles', [roles[0], roles[0]]);
    await fixture.whenStable();
    expect(component.configured()).toBe(false);
    fixture.componentRef.setInput('roles', roles);
    fixture.componentRef.setInput('busy', true);
    await fixture.whenStable();
    await component.addContact();
    expect(selectContact).not.toHaveBeenCalled();
  });
  it('refuses duplicate current assignments instead of silently merging them', async () => {
    fixture.componentRef.setInput('assignments', [
      assignment(),
      assignment(['test-edit']),
    ]);
    await fixture.whenStable();
    await component.addContact();
    await component.save();
    expect(component.canEdit()).toBe(false);
    expect(selectContact).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
  });
  it('uses the product supplied reverse role direction and preserves read-only input copies', async () => {
    const rows = [assignment()];
    fixture.componentRef.setInput('assignments', rows);
    fixture.componentRef.setInput('roleDirection', 'rolesToItem');
    await fixture.whenStable();
    component.setRole(component.draft()[0], 'test-edit', true);
    expect(rows[0].roleIDs).toEqual(['test-read']);
    await component.save();
    expect(save).toHaveBeenCalledWith({
      target,
      changes: [{ itemRef: contact, add: { rolesToItem: ['test-edit'] } }],
    });
  });
  it('rejects a malformed acknowledgement without replacing the retained draft', async () => {
    component.setRole(component.draft()[0], 'test-edit', true);
    save.mockResolvedValue([assignment(), assignment()]);
    await component.save();
    expect(component.draft()[0].roleIDs).toContain('test-edit');
    expect(component.error()).toContain('retained');
  });
  it('treats reordered equal role sets as clean and never dispatches a noop save', async () => {
    fixture.componentRef.setInput('assignments', [
      assignment(['test-read', 'test-edit']),
    ]);
    await fixture.whenStable();
    component.setRole(component.draft()[0], 'test-read', false);
    component.setRole(component.draft()[0], 'test-read', true);
    expect(component.changed()).toBe(false);
    await component.save();
    expect(save).not.toHaveBeenCalled();
  });
  it('rejects a same-turn picker continuation before the context-reset effect runs', async () => {
    const pending = deferred<
      Omit<IContactRoleAssignment, 'roleIDs'> | undefined
    >();
    selectContact.mockReturnValue(pending.promise);
    const operation = component.addContact();
    fixture.componentRef.setInput('readonly', true);
    pending.resolve({
      contact: { ...contact, itemID: 'contact-2' },
      title: 'Old choice',
    });
    await operation;
    expect(component.draft()).toEqual([assignment()]);
  });
  it('rejects same-turn save completion before effect flush and emits no stale saved event', async () => {
    const pending = deferred<readonly IContactRoleAssignment[]>();
    save.mockReturnValue(pending.promise);
    const emitted = vi.fn();
    component.saved.subscribe(emitted);
    component.setRole(component.draft()[0], 'test-edit', true);
    const operation = component.save();
    fixture.componentRef.setInput('target', { ...target, itemID: 'item-2' });
    pending.resolve([]);
    await operation;
    expect(emitted).not.toHaveBeenCalled();
  });
  it('busy prevents new operations but does not invalidate an already authorized response', async () => {
    const pending = deferred<readonly IContactRoleAssignment[]>();
    save.mockReturnValue(pending.promise);
    component.setRole(component.draft()[0], 'test-edit', true);
    const operation = component.save();
    fixture.componentRef.setInput('busy', true);
    await component.save();
    expect(save).toHaveBeenCalledTimes(1);
    pending.resolve([assignment(['test-edit'])]);
    await operation;
    expect(component.draft()).toEqual([assignment(['test-edit'])]);
  });
  it('uses only the explicit safe product error mapping, with retained staged changes', async () => {
    fixture.componentRef.setInput('savePort', {
      save,
      errorMessage: () => 'This item has reached its contact limit.',
    });
    await fixture.whenStable();
    save.mockRejectedValue(new Error('Sensitive internal exception'));
    component.setRole(component.draft()[0], 'test-edit', true);
    await component.save();
    expect(component.error()).toContain('contact limit');
    expect(component.error()).not.toContain('Sensitive');
    expect(component.changed()).toBe(true);
  });
});
