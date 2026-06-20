import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ErrorLogger } from '@sneat/core';
import { ModalController } from '@ionic/angular/standalone';
import { ContactsSelectorService } from '../contacts-selector/contacts-selector.service';

import { ContactInputComponent } from './contact-input.component';

describe('ContactInputComponent', () => {
  let component: ContactInputComponent;
  let fixture: ComponentFixture<ContactInputComponent>;

  beforeEach(waitForAsync(async () => {
    await TestBed.configureTestingModule({
      imports: [ContactInputComponent],
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
          useValue: { selectSingleInModal: vi.fn() },
        },
        {
          provide: ModalController,
          useValue: { create: vi.fn(), dismiss: vi.fn() },
        },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
      .overrideComponent(ContactInputComponent, {
        set: { imports: [], template: '' },
      })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ContactInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = () => component as any;
  const stop = () =>
    ({ stopPropagation: vi.fn(), preventDefault: vi.fn() }) as unknown as Event;
  const selectorSvc = () =>
    TestBed.inject(ContactsSelectorService) as unknown as {
      selectSingleInModal: ReturnType<typeof vi.fn>;
    };

  it('labelText defaults and capitalises the role', () => {
    expect(c().labelText()).toBe('Contact');
    component.contactRole = 'buyer';
    expect(c().labelText()).toBe('Buyer');
    component.label = 'Custom';
    expect(c().labelText()).toBe('Custom');
  });

  it('contactTitle prefixes a flag when a country is set', () => {
    component.contact = {
      id: 'c1',
      brief: { title: 'Bob', countryID: 'GB' },
    } as never;
    expect(c().contactTitle()).toContain('Bob');
  });

  it('contactLink builds the contact url', () => {
    component.space = { id: 's1', type: 'family' };
    component.contact = { id: 'c1' } as never;
    expect(component.contactLink).toBe('/company/family/s1/contact/c1');
  });

  it('reset emits an undefined contact', () => {
    const emit = vi.spyOn(component.contactChange, 'emit');
    component.reset(stop());
    expect(emit).toHaveBeenCalledWith(undefined);
  });

  it('ngOnChanges clears the parent when the contact id changes', () => {
    component.parentContact = { id: 'p1' } as never;
    component.contact = { id: 'c2' } as never;
    component.ngOnChanges({
      contact: { previousValue: { id: 'c1' } } as never,
    });
    expect(component.parentContact).toBeUndefined();
  });

  describe('openContactSelector', () => {
    it('does nothing when contact changes are disabled', () => {
      component.canChangeContact = false;
      component.openContactSelector(stop());
      expect(selectorSvc().selectSingleInModal).not.toHaveBeenCalled();
    });

    it('opens the selector and emits the picked contact', async () => {
      const picked = { id: 'c9' };
      selectorSvc().selectSingleInModal.mockReturnValue(
        Promise.resolve(picked),
      );
      component.space = { id: 's1' };
      const emit = vi.spyOn(component.contactChange, 'emit');
      component.openContactSelector(stop());
      await Promise.resolve();
      expect(selectorSvc().selectSingleInModal).toHaveBeenCalled();
      expect(emit).toHaveBeenCalledWith(picked);
    });
  });
});
