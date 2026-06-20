import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { ContactsPageComponent } from './contacts-page.component';
import { provideContactusMocks } from '../../testing/test-utils';

describe('ContactsPageComponent', () => {
  let component: ContactsPageComponent;
  let fixture: ComponentFixture<ContactsPageComponent>;

  beforeEach(waitForAsync(async () => {
    await TestBed.configureTestingModule({
      imports: [ContactsPageComponent],
      providers: [provideContactusMocks()],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
      .overrideComponent(ContactsPageComponent, {
        set: { imports: [], providers: [] },
      })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ContactsPageComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  type Testable = {
    $role: { set(v: unknown): void };
    $allContacts: { set(v: unknown): void };
    $pageTitle(): string;
    $titleIcon(): string;
    $selectedContacts(): unknown;
    onRoleChanged(r?: string): void;
    sendCommand(e: Event, name: string): void;
    command: { next: ReturnType<typeof vi.fn> };
  };
  const t = () => component as unknown as Testable;

  describe('$pageTitle / $titleIcon', () => {
    it('defaults to Contacts with the index icon', () => {
      t().$role.set(undefined);
      expect(t().$pageTitle()).toBe('Contacts');
      expect(t().$titleIcon()).toBe('📇');
    });

    it('derives a role-specific title and icon', () => {
      t().$role.set('tenant');
      expect(t().$pageTitle()).toContain('Tenant');
      expect(t().$titleIcon()).toBe('🤠');
      t().$role.set('landlord');
      expect(t().$titleIcon()).toBe('🤴');
      t().$role.set('applicant');
      expect(t().$titleIcon()).toBe('🤔');
    });
  });

  describe('$selectedContacts', () => {
    it('returns only checked contacts', () => {
      t().$allContacts.set([
        { id: 'a', isChecked: true },
        { id: 'b', isChecked: false },
      ]);
      expect(t().$selectedContacts()).toEqual([{ id: 'a', isChecked: true }]);
    });
  });

  describe('onRoleChanged', () => {
    it('updates the role signal and rewrites the url query', () => {
      const replaceState = vi.spyOn(history, 'replaceState');
      t().onRoleChanged('landlord');
      expect(t().$role()).toBe('landlord');
      expect(replaceState).toHaveBeenCalled();
    });
  });

  describe('sendCommand', () => {
    it('pushes a named command with the event', () => {
      const next = vi.spyOn(t().command, 'next');
      const event = new Event('click');
      t().sendCommand(event, 'refresh' as never);
      expect(next).toHaveBeenCalledWith({ name: 'refresh', event });
    });
  });

  it('ngOnDestroy completes the command subject', () => {
    const complete = vi.spyOn(t().command, 'complete');
    component.ngOnDestroy();
    expect(complete).toHaveBeenCalled();
  });

  it('$selectedContacts is undefined before contacts load', () => {
    expect(t().$selectedContacts()).toBeUndefined();
  });
});
