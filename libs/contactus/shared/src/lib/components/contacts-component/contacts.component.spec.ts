import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ErrorLogger } from '@sneat/core';
import { ClassName } from '@sneat/ui';
import { SpaceNavService } from '@sneat/space-services';

import { Subject } from 'rxjs';
import { ContactsComponent } from './contacts.component';

describe('ContactsComponent', () => {
  let component: ContactsComponent;
  let fixture: ComponentFixture<ContactsComponent>;

  beforeEach(waitForAsync(async () => {
    await TestBed.configureTestingModule({
      imports: [ContactsComponent, NoopAnimationsModule],
      providers: [
        { provide: ClassName, useValue: 'ContactsComponent' },
        {
          provide: ErrorLogger,
          useValue: {
            logError: vi.fn(),
            logErrorHandler: vi.fn(() => vi.fn()),
          },
        },
        {
          provide: SpaceNavService,
          useValue: {
            navigateForwardToSpacePage: vi.fn(() => Promise.resolve(true)),
          },
        },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
      .overrideComponent(ContactsComponent, {
        set: { imports: [], template: '' },
      })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ContactsComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('$space', { id: 'test-space' });
    fixture.componentRef.setInput('$allContacts', []);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = () => component as any;
  const stopEvent = () =>
    ({ stopPropagation: vi.fn(), preventDefault: vi.fn() }) as unknown as Event;
  const spaceNav = () =>
    TestBed.inject(SpaceNavService) as unknown as {
      navigateForwardToSpacePage: ReturnType<typeof vi.fn>;
    };

  const withContacts = (contacts: unknown[], space = { id: 's1', type: 'family' }) => {
    fixture.componentRef.setInput('$space', space);
    fixture.componentRef.setInput('$allContacts', contacts);
    fixture.detectChanges();
  };

  it('$showTabs is true only for a family space without a fixed role', () => {
    withContacts([], { id: 's1', type: 'family' });
    expect(c().$showTabs()).toBe(true);
    fixture.componentRef.setInput('$roleID', 'tenant');
    fixture.detectChanges();
    expect(c().$showTabs()).toBe(false);
  });

  it('$canAdd is false for tenant/landlord roles', () => {
    fixture.componentRef.setInput('$roleID', 'tenant');
    fixture.detectChanges();
    expect(c().$canAdd()).toBe(false);
    fixture.componentRef.setInput('$roleID', 'buyer');
    fixture.detectChanges();
    expect(c().$canAdd()).toBe(true);
  });

  it('contactsNumber counts contacts per role', () => {
    withContacts([
      { id: 'a', brief: { roles: ['buyer'] } },
      { id: 'b', brief: { roles: ['buyer', 'trucker'] } },
    ]);
    expect(component.contactsNumber('')).toBe(2);
    expect(component.contactsNumber('buyer')).toBe(2);
    expect(component.contactsNumber('trucker')).toBe(1);
  });

  it('onFilterChanged updates the filter signal', () => {
    c().onFilterChanged('bob');
    expect(c().$filter()).toBe('bob');
  });

  it('onRoleChanged emits the selected role', () => {
    const emit = vi.spyOn(component.roleChange, 'emit');
    c().onRoleChanged({ ...stopEvent(), detail: { value: 'buyer' } });
    expect(emit).toHaveBeenCalledWith('buyer');
  });

  it('addGroup alerts not implemented', () => {
    const alertSpy = vi.fn();
    vi.stubGlobal('alert', alertSpy);
    c().addGroup(stopEvent());
    expect(alertSpy).toHaveBeenCalled();
  });

  it('contactClicked navigates to the contact page', () => {
    component.contactClicked(stopEvent(), { id: 'c1' } as never);
    expect(spaceNav().navigateForwardToSpacePage).toHaveBeenCalledWith(
      expect.anything(),
      'contact/c1',
      expect.anything(),
    );
  });

  it('goGroup navigates to the group page', () => {
    c().goGroup({ id: 'g1' });
    expect(spaceNav().navigateForwardToSpacePage).toHaveBeenCalledWith(
      expect.anything(),
      'group/g1',
      expect.anything(),
    );
  });

  it('addNewContact navigates to the new-contact page', async () => {
    await c().addNewContact(stopEvent());
    expect(spaceNav().navigateForwardToSpacePage).toHaveBeenCalledWith(
      expect.anything(),
      'new-contact',
      expect.anything(),
    );
  });

  it('contactSelectionChanged emits the toggled contacts', () => {
    withContacts([{ id: 'a', isChecked: false }]);
    const emit = vi.spyOn(component.contactsChange, 'emit');
    c().contactSelectionChanged({ id: 'a', checked: true });
    expect(emit).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'a', isChecked: true }),
    ]);
  });

  it('addNewContact emits addContactClick when not navigating to a page', async () => {
    component.goToNewContactPage = false;
    const emit = vi.spyOn(component.addContactClick, 'emit');
    await c().addNewContact(stopEvent());
    expect(emit).toHaveBeenCalled();
  });

  describe('ngOnInit command handling', () => {
    it('resets selected contacts on the reset_selected command', () => {
      const command$ = new Subject<{ name: string; event?: Event }>();
      component.command = command$;
      withContacts([{ id: 'a', isChecked: true }]);
      component.ngOnInit();
      const emit = vi.spyOn(component.contactsChange, 'emit');
      command$.next({ name: 'reset_selected' });
      expect(emit).toHaveBeenCalledWith([
        expect.objectContaining({ id: 'a', isChecked: false }),
      ]);
    });
  });
});
