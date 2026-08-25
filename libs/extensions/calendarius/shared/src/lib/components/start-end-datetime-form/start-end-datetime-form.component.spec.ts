import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModalController } from '@ionic/angular';
import { ErrorLogger } from '@sneat/core';
import { StartEndDatetimeFormComponent } from './start-end-datetime-form.component';

describe('StartEndDatetimeFormComponent', () => {
  let component: StartEndDatetimeFormComponent;
  let fixture: ComponentFixture<StartEndDatetimeFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StartEndDatetimeFormComponent],
      providers: [
        {
          provide: ErrorLogger,
          useValue: { logError: vi.fn(), logErrorHandler: () => vi.fn() },
        },
        { provide: ModalController, useValue: { dismiss: vi.fn() } },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
      .overrideComponent(StartEndDatetimeFormComponent, {
        set: { imports: [], schemas: [CUSTOM_ELEMENTS_SCHEMA], template: '' },
      })
      .compileComponents();
    fixture = TestBed.createComponent(StartEndDatetimeFormComponent);
    component = fixture.componentInstance;

    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
