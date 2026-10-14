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
  let fixture: ComponentFixture<EmailLoginFormComponent>;

  beforeEach(async () => {
    localStorage.removeItem('emailForSignIn');
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
  });

  afterEach(() => {
    localStorage.removeItem('emailForSignIn');
  });

  function create(initialMode?: 'sign-in' | 'sign-up'): EmailLoginFormComponent {
    fixture = TestBed.createComponent(EmailLoginFormComponent);
    if (initialMode) {
      fixture.componentRef.setInput('initialMode', initialMode);
    }
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  function selectedMode(component: EmailLoginFormComponent): 'in' | 'up' {
    return (component as unknown as { sign: () => 'in' | 'up' }).sign();
  }

  it('preserves sign-up as the default when no remembered email exists', () => {
    expect(selectedMode(create())).toBe('up');
  });

  it('keeps the remembered-email sign-in default for existing callers', () => {
    localStorage.setItem('emailForSignIn', 'person@example.com');

    expect(selectedMode(create())).toBe('in');
  });

  it('uses an explicit initial sign-in mode even when sign-up is the default', () => {
    expect(selectedMode(create('sign-in'))).toBe('in');
  });

  it('uses an explicit initial sign-up mode even with a remembered email', () => {
    localStorage.setItem('emailForSignIn', 'person@example.com');

    expect(selectedMode(create('sign-up'))).toBe('up');
  });

  it('allows the user to switch modes after initialization', () => {
    const component = create('sign-in');
    const sign = (component as unknown as { sign: { set(value: 'in' | 'up'): void } }).sign;
    sign.set('up');

    expect(selectedMode(component)).toBe('up');
  });
});
