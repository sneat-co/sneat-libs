import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ErrorLogger } from '@sneat/core';
import { ClassName } from '@sneat/ui';
import { ContactusSpaceService } from '@sneat/contactus-services';
import { of } from 'rxjs';

import { ContactsChecklistComponent } from './contacts-checklist.component';

describe('ContactsChecklistComponent', () => {
  let component: ContactsChecklistComponent;
  let fixture: ComponentFixture<ContactsChecklistComponent>;

  beforeEach(waitForAsync(async () => {
    await TestBed.configureTestingModule({
      imports: [ContactsChecklistComponent],
      providers: [
        { provide: ClassName, useValue: 'ContactsChecklistComponent' },
        {
          provide: ErrorLogger,
          useValue: {
            logError: vi.fn(),
            logErrorHandler: vi.fn(() => vi.fn()),
          },
        },
        {
          provide: ContactusSpaceService,
          useValue: { watchContactBriefs: vi.fn(() => of([])) },
        },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
      .overrideComponent(ContactsChecklistComponent, {
        set: { imports: [], template: '' },
      })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ContactsChecklistComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('$space', { id: 'test-space' });
    fixture.componentRef.setInput('$checkedContactIDs', []);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = () => component as any;

  const loadContacts = (contacts: unknown[]) => {
    (
      TestBed.inject(ContactusSpaceService) as unknown as {
        watchContactBriefs: ReturnType<typeof vi.fn>;
      }
    ).watchContactBriefs.mockReturnValue(of(contacts));
    // Re-trigger the space-id effect to re-subscribe with the new data.
    fixture.componentRef.setInput('$space', { id: 'space2' });
    fixture.detectChanges();
  };

  it('$checkedContactIDsOfSpace strips the space suffix and filters by space', () => {
    fixture.componentRef.setInput('$checkedContactIDs', [
      'a@space2',
      'b@other',
      'c',
    ]);
    loadContacts([]);
    expect(c().$checkedContactIDsOfSpace()).toEqual(['a', 'c']);
  });

  it('$contactsToDisplay filters by included role and marks checked', () => {
    fixture.componentRef.setInput('$checkedContactIDs', ['m1@space2']);
    fixture.componentRef.setInput('$spaceRoles', ['member']);
    loadContacts([
      { id: 'm1', brief: { roles: ['member'] } },
      { id: 'g1', brief: { roles: ['guest'] } },
    ]);
    const display = c().$contactsToDisplay();
    expect(display.map((x: { id: string }) => x.id)).toEqual(['m1']);
    expect(display[0].isChecked).toBe(true);
  });

  it('$contactsToDisplay excludes contacts with an excluded role', () => {
    fixture.componentRef.setInput('$checkedContactIDs', []);
    fixture.componentRef.setInput('$spaceRoles', []);
    fixture.componentRef.setInput('$spaceRolesToExclude', ['guest']);
    loadContacts([
      { id: 'm1', brief: { roles: ['member'] } },
      { id: 'g1', brief: { roles: ['guest'] } },
    ]);
    expect(
      c().$contactsToDisplay().map((x: { id: string }) => x.id),
    ).toEqual(['m1']);
  });

  it('onCheckboxChange emits a checkedChange and tracks in-progress', () => {
    const emit = vi.spyOn(component.checkedChange, 'emit');
    c().onCheckboxChange(
      { detail: { checked: true } } as unknown as Event,
      { id: 'm1', brief: {} },
    );
    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'm1', checked: true }),
    );
    expect(c().$checkedInProgress()).toContain('m1');
  });
});
