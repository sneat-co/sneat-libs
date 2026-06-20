import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CONTACT_NAV_SERVICE } from '@sneat/extension-contactus-contract';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { Subject } from 'rxjs';
import { ContactsByTypeComponent } from './contacts-by-type.component';
import { ErrorLogger } from '@sneat/core';

describe('ContactsFamilyComponent', () => {
  let component: ContactsByTypeComponent;
  let fixture: ComponentFixture<ContactsByTypeComponent>;
  let contactNav: { goNewContactPage: ReturnType<typeof vi.fn> };

  const groups = [
    {
      id: 'family',
      dbo: {
        title: 'Family',
        roles: [{ id: 'parent', brief: { title: 'Parent' } }],
      },
    },
  ];
  const contacts = [
    { id: 'c1', brief: { title: 'Bob', roles: ['parent'] }, isChecked: false },
  ];

  beforeEach(waitForAsync(async () => {
    contactNav = { goNewContactPage: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [ContactsByTypeComponent, NoopAnimationsModule],
      providers: [
        { provide: CONTACT_NAV_SERVICE, useValue: contactNav },
        {
          provide: ErrorLogger,
          useValue: {
            logError: vi.fn(),
            logErrorHandler: vi.fn(() => vi.fn()),
          },
        },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
      .overrideComponent(ContactsByTypeComponent, {
        set: { imports: [], template: '' },
      })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ContactsByTypeComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('$space', { id: 'test-space' });
    fixture.componentRef.setInput('$contactGroupDefinitions', groups);
    fixture.componentRef.setInput('$contacts', contacts);
    fixture.componentRef.setInput('$filter', '');
    fixture.detectChanges();
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = () => component as any;
  const stopEvent = () =>
    ({ stopPropagation: vi.fn(), preventDefault: vi.fn() }) as unknown as Event;

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('groups contacts by role from the definitions', () => {
    const contactGroups = c().$contactGroups();
    expect(contactGroups.length).toBe(1);
    expect(contactGroups[0].roles[0].contacts).toEqual([
      expect.objectContaining({ id: 'c1' }),
    ]);
  });

  it('find alerts that it is not implemented', () => {
    const alertSpy = vi.fn();
    vi.stubGlobal('alert', alertSpy);
    c().find(stopEvent());
    expect(alertSpy).toHaveBeenCalled();
  });

  describe('addContact', () => {
    it('emits addContactClick when not navigating to the new page', () => {
      component.goToNewContactPage = false;
      const emit = vi.spyOn(component.addContactClick, 'emit');
      c().addContact(stopEvent(), { id: 'family' }, { id: 'parent' });
      expect(emit).toHaveBeenCalled();
      expect(contactNav.goNewContactPage).not.toHaveBeenCalled();
    });

    it('navigates to the new contact page by default', () => {
      component.goToNewContactPage = true;
      c().addContact(stopEvent(), { id: 'family' }, { id: 'parent' });
      expect(contactNav.goNewContactPage).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'test-space' }),
        { group: 'family', role: 'parent' },
      );
    });
  });

  it('checkChanged emits the updated contacts and selection', () => {
    const contactsChange = vi.spyOn(component.contactsChange, 'emit');
    const selChange = vi.spyOn(component.contactSelectionChange, 'emit');
    c().checkChanged({ id: 'c1', checked: true }, 'parent');
    expect(contactsChange).toHaveBeenCalled();
    expect(selChange).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'c1', checked: true, role: 'parent' }),
    );
  });

  it('the reset_selected command unchecks all contacts', () => {
    const command$ = new Subject<{ name: string }>();
    fixture.componentRef.setInput('$contacts', [
      { id: 'c1', brief: { roles: ['parent'] }, isChecked: true },
    ]);
    component.command = command$ as never;
    fixture.detectChanges();
    component.ngOnInit();
    const emit = vi.spyOn(component.contactsChange, 'emit');
    command$.next({ name: 'reset_selected' });
    expect(emit).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'c1', isChecked: false }),
    ]);
  });
});
