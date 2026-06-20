import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ErrorLogger } from '@sneat/core';

import { EmailsFormComponent } from './emails-form.component';

describe('EmailsFormComponent', () => {
  let component: EmailsFormComponent;
  let fixture: ComponentFixture<EmailsFormComponent>;

  beforeEach(waitForAsync(async () => {
    await TestBed.configureTestingModule({
      imports: [EmailsFormComponent, FormsModule],
      providers: [
        {
          provide: ErrorLogger,
          useValue: {
            logError: vi.fn(),
            logErrorHandler: vi.fn(() => vi.fn()),
          },
        },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(EmailsFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = () => component as any;
  const stop = () => ({ stopPropagation: vi.fn() }) as unknown as Event;

  it('emits non-empty emails when an address changes', () => {
    const emit = vi.spyOn(component.emailsChange, 'emit');
    c().emailInputs = [
      { type: 'personal', address: 'a@b.com' },
      { type: 'work', address: '' },
    ];
    c().addressChanged(stop());
    expect(emit).toHaveBeenCalledWith([{ type: 'personal', address: 'a@b.com' }]);
  });

  it('emits undefined when all addresses are empty', () => {
    const emit = vi.spyOn(component.emailsChange, 'emit');
    c().emailInputs = [
      { type: 'personal', address: '' },
      { type: 'work', address: '' },
    ];
    c().typeChanged(stop());
    expect(emit).toHaveBeenCalledWith(undefined);
  });

  it('resets to empty inputs when there are no emails on change', () => {
    component.emails = [];
    component.ngOnChanges({ emails: {} as never });
    expect(c().emailInputs.length).toBe(2);
  });
});
