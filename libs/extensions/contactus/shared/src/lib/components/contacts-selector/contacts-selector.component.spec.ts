import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { CONTACTUS_SPACE_SERVICE } from '@sneat/extension-contactus-contract';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ErrorLogger } from '@sneat/core';
import { ModalController } from '@ionic/angular/standalone';
import { CONTACT_ROLES_BY_TYPE } from '@sneat/app';
import { ClassName, OverlayController } from '@sneat/ui';
import { of } from 'rxjs';

import { ContactsSelectorComponent } from './contacts-selector.component';

describe('ContactsSelectorComponent', () => {
  let component: ContactsSelectorComponent;
  let fixture: ComponentFixture<ContactsSelectorComponent>;

  beforeEach(waitForAsync(async () => {
    await TestBed.configureTestingModule({
      imports: [ContactsSelectorComponent],
      providers: [
        { provide: ClassName, useValue: 'ContactsSelectorComponent' },
        {
          provide: ErrorLogger,
          useValue: {
            logError: vi.fn(),
            logErrorHandler: vi.fn(() => vi.fn()),
          },
        },
        {
          provide: OverlayController,
          useValue: {
            create: vi.fn(),
            dismiss: vi.fn(() => Promise.resolve(true)),
          },
        },
        {
          provide: ModalController,
          useValue: {
            create: vi.fn(),
            dismiss: vi.fn(() => Promise.resolve(true)),
          },
        },
        { provide: CONTACT_ROLES_BY_TYPE, useValue: {} },
        {
          provide: CONTACTUS_SPACE_SERVICE,
          useValue: { watchContactBriefs: vi.fn(() => of([])) },
        },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
      .overrideComponent(ContactsSelectorComponent, {
        set: { imports: [], template: '', providers: [] },
      })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ContactsSelectorComponent);
    component = fixture.componentInstance;
    component.space = { id: 'test-space' };
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = () => component as any;

  it('label capitalises the contact role or defaults to Contact', () => {
    expect(component.label).toBe('Contact');
    component.contactRoleID = 'buyer';
    expect(component.label).toBe('Buyer');
  });

  it('$contactWithDbo synthesises a dbo from the brief', () => {
    c().$contact.set({ id: 'c1', brief: { title: 'Bob' } });
    expect(c().$contactWithDbo()).toEqual(
      expect.objectContaining({ id: 'c1', dbo: { title: 'Bob' } }),
    );
  });

  it('$selectedContacts and count reflect checked contacts', () => {
    c().$contacts.set([
      { id: 'a', isChecked: true },
      { id: 'b', isChecked: false },
    ]);
    expect(c().$selectedContacts().map((x: { id: string }) => x.id)).toEqual([
      'a',
    ]);
    expect(c().$selectedContactsCount()).toBe(1);
  });

  it('onParentTabChanged / onContactTabChanged update the tab signals', () => {
    c().onParentTabChanged({ detail: { value: 'new' } });
    expect(c().$parentTab()).toBe('new');
    c().onContactTabChanged({ detail: { value: 'new' } });
    expect(c().$contactTab()).toBe('new');
  });

  it('onContactChanged / onNewContactChanged set the contact signal', () => {
    c().onContactChanged({ id: 'c1' });
    expect(c().$contact().id).toBe('c1');
    c().onNewContactChanged({ id: 'c2', space: { id: 's1' }, dbo: {} });
    expect(c().$contact().id).toBe('c2');
  });

  it('onContactSelected emits the selected contact through onSelected', () => {
    const onSelected = vi.fn(() => Promise.resolve());
    component.onSelected = onSelected;
    c().$contacts.set([{ id: 'c1', brief: { title: 'Bob' } }]);
    c().onContactSelected('c1');
    expect(onSelected).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'c1' }),
    ]);
  });

  it('submitSelected calls onSelected with the selected contacts', async () => {
    const onSelected = vi.fn(() => Promise.resolve());
    component.onSelected = onSelected;
    c().$contacts.set([{ id: 'c1', isChecked: true }]);
    await c().submitSelected({
      stopPropagation: vi.fn(),
      preventDefault: vi.fn(),
    });
    expect(onSelected).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'c1' }),
    ]);
  });

  it('onContactCreated marks the contact checked and emits it', () => {
    const onSelected = vi.fn(() => Promise.resolve());
    component.onSelected = onSelected;
    c().onContactCreated({ id: 'c9', brief: { title: 'New' } });
    expect(onSelected).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'c9', isChecked: true }),
    ]);
  });

  it('onParentContactCreated selects the created parent', () => {
    c().onParentContactCreated({
      id: 'p1',
      dbo: { title: 'Parent' },
      space: { id: 'test-space' },
    });
    expect(c().selectedParent()?.id).toBe('p1');
    expect(c().parentContactID()).toBe('p1');
  });

  it('onParentContactIDChanged selects the matching parent', () => {
    c().parentContacts.set([{ id: 'p1', brief: { title: 'Parent' } }]);
    c().onParentContactIDChanged('p1');
    expect(c().selectedParent()?.id).toBe('p1');
    expect(c().parentContactID()).toBe('p1');
  });

  it('emitOnSelected warns when no callback is set', () => {
    component.onSelected = undefined;
    expect(() =>
      c().emitOnSelected({ id: 'c1', space: { id: 's1' } }),
    ).not.toThrow();
  });
});
