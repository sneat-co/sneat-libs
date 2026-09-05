import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToastController } from '@ionic/angular';
import { SneatApiService } from '@sneat/api';
import { UserRecordService } from '@sneat/auth-core';
import {
  AnalyticsService,
  APP_INFO,
  ErrorLogger,
  SNEAT_FIREBASE_AUTH,
} from '@sneat/core';
import { RandomIdService } from '@sneat/random';
import { EmailLoginFormComponent } from './email-login-form.component';

describe('EmailLoginFormComponent', () => {
  let component: EmailLoginFormComponent;
  let fixture: ComponentFixture<EmailLoginFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmailLoginFormComponent],
      providers: [
        {
          provide: APP_INFO,
          useValue: { appId: 'test', appTitle: 'Test' },
        },
        {
          provide: AnalyticsService,
          useValue: { logEvent: vi.fn() },
        },
        {
          provide: ErrorLogger,
          useValue: { logError: vi.fn(), logErrorHandler: () => vi.fn() },
        },
        { provide: ToastController, useValue: { create: vi.fn() } },
        { provide: SNEAT_FIREBASE_AUTH, useValue: {} },
        {
          provide: RandomIdService,
          useValue: { newRandomId: () => 'test-id' },
        },
        {
          provide: SneatApiService,
          useValue: { post: vi.fn(), setApiAuthToken: vi.fn() },
        },
        {
          provide: UserRecordService,
          useValue: { initUserRecord: vi.fn() },
        },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
      .overrideComponent(EmailLoginFormComponent, {
        set: { imports: [], schemas: [CUSTOM_ELEMENTS_SCHEMA] },
      })
      .compileComponents();
    fixture = TestBed.createComponent(EmailLoginFormComponent);
    component = fixture.componentInstance;

    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
