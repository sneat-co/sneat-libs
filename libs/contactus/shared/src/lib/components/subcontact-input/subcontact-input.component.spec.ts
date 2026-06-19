import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ErrorLogger } from '@sneat/core';
import { ModalController } from '@ionic/angular/standalone';
import { ContactsSelectorService } from '../contacts-selector/contacts-selector.service';

import { SubcontactInputComponent } from './subcontact-input.component';

describe('SubcontactInputComponent', () => {
  let component: SubcontactInputComponent;
  let fixture: ComponentFixture<SubcontactInputComponent>;

  beforeEach(waitForAsync(async () => {
    await TestBed.configureTestingModule({
      imports: [SubcontactInputComponent],
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
      .overrideComponent(SubcontactInputComponent, {
        set: { imports: [], template: '' },
      })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SubcontactInputComponent);
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

  it('labelText defaults to Contact and capitalises the role', () => {
    expect(component.labelText).toBe('Contact');
    component.role = 'buyer';
    expect(component.labelText).toBe('Buyer');
  });

  it('contactLink builds the url', () => {
    component.space = { id: 's1', type: 'family' };
    component.contact = { id: 'c1' } as never;
    expect(component.contactLink).toBe('/company/family/s1/contact/c1');
  });

  it('reset clears the contact and emits undefined', () => {
    component.contact = { id: 'c1' } as never;
    const emit = vi.spyOn(component.contactChange, 'emit');
    component.reset(stop());
    expect(component.contact).toBeUndefined();
    expect(emit).toHaveBeenCalledWith(undefined);
  });

  it('openContactSelector logs an error without a space', () => {
    component.space = undefined;
    component.openContactSelector(stop());
    expect(selectorSvc().selectSingleInModal).not.toHaveBeenCalled();
  });

  it('openContactSelector emits the picked contact', async () => {
    const picked = { id: 'c9' };
    selectorSvc().selectSingleInModal.mockReturnValue(Promise.resolve(picked));
    component.space = { id: 's1' };
    const emit = vi.spyOn(component.contactChange, 'emit');
    component.openContactSelector(stop());
    await Promise.resolve();
    expect(emit).toHaveBeenCalledWith(picked);
  });
});
