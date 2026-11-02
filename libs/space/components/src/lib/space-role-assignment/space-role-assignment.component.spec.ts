import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ISpaceRoleAssignment } from '@sneat/space-models';
import { ContactRoleAssignmentComponent } from '../contact-role-assignment/contact-role-assignment.component';
import { SpaceRoleAssignmentComponent } from './space-role-assignment.component';

const target = {
  spaceID: 'owner',
  module: 'datatug',
  collection: 'projects',
  itemID: 'project',
};
const team = { spaceID: 'team', title: 'Team' };

describe('SpaceRoleAssignmentComponent', () => {
  it('uses host-filtered options, defaults Viewer, and acknowledges asynchronous typed save without manual detection', async () => {
    TestBed.configureTestingModule({
      imports: [SpaceRoleAssignmentComponent],
      providers: [provideZonelessChangeDetection()],
    });
    const fixture = TestBed.createComponent(SpaceRoleAssignmentComponent);
    let resolve!: (rows: readonly ISpaceRoleAssignment[]) => void;
    const save = vi.fn(
      () =>
        new Promise<readonly ISpaceRoleAssignment[]>((yes) => (resolve = yes)),
    );
    for (const [key, value] of Object.entries({
      target,
      space: { id: 'owner' },
      assignments: [],
      options: [team],
      roles: [{ id: 'viewer', label: 'Viewer' }],
      defaultRoleIDs: ['viewer'],
      readonly: false,
      savePort: { save },
    }))
      fixture.componentRef.setInput(key, value);
    await fixture.whenStable();
    const editor = fixture.debugElement.query(
      By.directive(ContactRoleAssignmentComponent),
    ).componentInstance as ContactRoleAssignmentComponent;
    const adding = editor.addContact();
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Team');
    const choose = fixture.debugElement
      .queryAll(By.css('ion-button'))
      .find((button) => button.nativeElement.textContent.trim() === 'Choose');
    if (!choose) throw new Error('Expected eligible Space chooser');
    choose.triggerEventHandler('click');
    await adding;
    await fixture.whenStable();
    expect(editor.draft()[0].roleIDs).toEqual(['viewer']);
    const saving = editor.save();
    await fixture.whenStable();
    expect(save).toHaveBeenCalledWith({
      target,
      before: [],
      after: [{ ...team, roleIDs: ['viewer'] }],
    });
    resolve([{ ...team, roleIDs: [] }]);
    await saving;
    await fixture.whenStable();
    expect(editor.draft()[0].roleIDs).toEqual([]);
    expect(editor.pending()).toBe(false);
  });

  it('cancels a pending picker when its authorized options change', async () => {
    TestBed.configureTestingModule({
      imports: [SpaceRoleAssignmentComponent],
      providers: [provideZonelessChangeDetection()],
    });
    const fixture = TestBed.createComponent(SpaceRoleAssignmentComponent);
    const save = vi.fn();
    for (const [key, value] of Object.entries({
      target,
      space: { id: 'owner' },
      assignments: [],
      options: [team],
      roles: [{ id: 'viewer', label: 'Viewer' }],
      readonly: false,
      savePort: { save },
    }))
      fixture.componentRef.setInput(key, value);
    await fixture.whenStable();
    const editor = fixture.debugElement.query(
      By.directive(ContactRoleAssignmentComponent),
    ).componentInstance as ContactRoleAssignmentComponent;
    const adding = editor.addContact();
    await fixture.whenStable();
    fixture.componentRef.setInput('options', []);
    await fixture.whenStable();
    await adding;
    expect(editor.draft()).toEqual([]);
    expect(save).not.toHaveBeenCalled();
    expect(
      fixture.nativeElement.querySelector(
        'ion-list[aria-label="Choose a Space"]',
      ),
    ).toBeNull();
  });
});
