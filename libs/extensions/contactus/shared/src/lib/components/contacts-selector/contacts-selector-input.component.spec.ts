import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ErrorLogger } from '@sneat/core';
import { ModalController } from '@ionic/angular/standalone';
import { ContactsSelectorService } from './contacts-selector.service';

import { ContactsSelectorInputComponent } from './contacts-selector-input.component';

describe('ContactsSelectorInputComponent', () => {
  let component: ContactsSelectorInputComponent;
  let fixture: ComponentFixture<ContactsSelectorInputComponent>;

  beforeEach(waitForAsync(async () => {
    await TestBed.configureTestingModule({
      imports: [ContactsSelectorInputComponent],
      providers: [
        {
          provide: ErrorLogger,
          useValue: {
            logError: vi.fn(),
            logErrorHandler: vi.fn(() => vi.fn()),
          },
        },
        {
          provide: ContactsSelectorService,
          useValue: { selectMultipleContacts: vi.fn() },
        },
        {
          provide: ModalController,
          useValue: { create: vi.fn(), dismiss: vi.fn() },
        },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
      .overrideComponent(ContactsSelectorInputComponent, {
        set: { imports: [], template: '' },
      })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ContactsSelectorInputComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('$space', { id: 'test-space' });
    fixture.componentRef.setInput('$contacts', []);
    fixture.componentRef.setInput('$selectedContacts', []);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = () => component as any;
  const stop = () =>
    ({ stopPropagation: vi.fn(), preventDefault: vi.fn() }) as unknown as Event;

  it('$hasSelectedContacts and selectedContactID reflect the selection', () => {
    expect(c().$hasSelectedContacts()).toBe(false);
    expect(component.selectedContactID).toBeUndefined();
    fixture.componentRef.setInput('$selectedContacts', [
      { id: 'c1', brief: {}, space: { id: 's1' } },
    ]);
    fixture.detectChanges();
    expect(c().$hasSelectedContacts()).toBe(true);
    expect(component.selectedContactID).toBe('c1');
  });

  it('$contactsWithSpace adds the space to each contact', () => {
    fixture.componentRef.setInput('$contacts', [{ id: 'c1', brief: {} }]);
    fixture.detectChanges();
    expect(c().$contactsWithSpace()).toEqual([
      expect.objectContaining({ id: 'c1', space: { id: 'test-space' } }),
    ]);
  });

  it('onRemoveMember / onSelectedMembersChanged / clear emit', () => {
    const remove = vi.spyOn(component.removeMember, 'emit');
    const changed = vi.spyOn(component.selectedContactsChange, 'emit');
    component.onRemoveMember({ id: 'c1' } as never);
    expect(remove).toHaveBeenCalledWith({ id: 'c1' });
    component.onSelectedMembersChanged([{ id: 'c2' } as never]);
    expect(changed).toHaveBeenCalledWith([{ id: 'c2' }]);
    c().clear();
    expect(changed).toHaveBeenCalledWith([]);
  });

  it('selectContacts is a no-op without a contactus space', () => {
    c().selectContacts(stop());
    expect(
      (
        TestBed.inject(ContactsSelectorService) as unknown as {
          selectMultipleContacts: ReturnType<typeof vi.fn>;
        }
      ).selectMultipleContacts,
    ).not.toHaveBeenCalled();
  });
});
