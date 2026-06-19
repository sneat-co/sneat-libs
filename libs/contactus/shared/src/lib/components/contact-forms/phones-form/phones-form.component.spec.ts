import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ErrorLogger } from '@sneat/core';

import { PhonesFormComponent } from './phones-form.component';

describe('PhonesFormComponent', () => {
  let component: PhonesFormComponent;
  let fixture: ComponentFixture<PhonesFormComponent>;

  beforeEach(waitForAsync(async () => {
    await TestBed.configureTestingModule({
      imports: [PhonesFormComponent, FormsModule],
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
    fixture = TestBed.createComponent(PhonesFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = () => component as any;
  const ce = (value: string) =>
    ({ stopPropagation: vi.fn(), detail: { value } }) as unknown as Event;

  it('typeChanged updates the phone type at the index', () => {
    component.phones = [{ type: 'personal', number: '123' }];
    c().typeChanged(ce('mobile'), 0);
    expect(component.phones[0]).toEqual({ type: 'mobile', number: '123' });
  });

  it('numberChanged updates the phone number at the index', () => {
    component.phones = [{ type: 'personal', number: '' }];
    c().numberChanged(ce('555'), 0);
    expect(component.phones[0]).toEqual({ type: 'personal', number: '555' });
  });

  it('resets to empty phones when phones become falsy', () => {
    component.phones = undefined;
    component.ngOnChanges({
      phones: { currentValue: undefined } as never,
    });
    expect(component.phones?.length).toBe(2);
  });
});
