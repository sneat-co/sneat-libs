import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SneatApiService } from '@sneat/api';
import {
  SneatAuthStateService,
  SneatUserService,
  UserRecordService,
} from '@sneat/auth-core';
import {
  APP_INFO,
  AnalyticsService,
  ErrorLogger,
  SNEAT_FIREBASE_AUTH,
} from '@sneat/core';
import { RANDOM_ID_OPTIONS } from '@sneat/random';
import { ToastController } from '@ionic/angular';
import { BehaviorSubject, NEVER, of } from 'rxjs';
import { TelegramLoginConfig } from './telegram-login-config';
import { AuthPanelComponent } from './auth-panel.component';

describe('AuthPanelComponent composition', () => {
  it('renders real auth children with the panel-owned random ID provider', async () => {
    const user = { uid: 'buyer', isAnonymous: false };
    const authState = new BehaviorSubject({ status: 'authenticated', user });
    const userState = new BehaviorSubject({
      status: 'authenticated',
      user,
      record: { title: 'Buyer' },
      userRecordStatus: 'ready',
    });
    const logger = { logError: vi.fn(), logErrorHandler: () => vi.fn() };

    await TestBed.configureTestingModule({
      imports: [AuthPanelComponent],
      providers: [
        provideRouter([]),
        {
          provide: SneatAuthStateService,
          useValue: {
            authState,
            authStatus: of('authenticated'),
            signInWith: vi.fn(),
          },
        },
        {
          provide: SneatUserService,
          useValue: {
            userState,
            onUserSignedIn: vi.fn(),
            retryUserRecordInitialization: vi.fn(),
          },
        },
        { provide: APP_INFO, useValue: {} },
        { provide: AnalyticsService, useValue: { logEvent: vi.fn() } },
        { provide: ErrorLogger, useValue: logger },
        { provide: SNEAT_FIREBASE_AUTH, useValue: {} },
        {
          provide: SneatApiService,
          useValue: { postAsAnonymous: () => NEVER },
        },
        {
          provide: UserRecordService,
          useValue: { initUserRecord: () => NEVER },
        },
        { provide: ToastController, useValue: { create: vi.fn() } },
        { provide: RANDOM_ID_OPTIONS, useValue: { len: 9 } },
        { provide: TelegramLoginConfig, useValue: { botID: '' } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(AuthPanelComponent);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('sneat-email-login-form'),
    ).not.toBeNull();
    expect(
      fixture.nativeElement.querySelector('sneat-login-with-telegram'),
    ).not.toBeNull();
    fixture.destroy();
    TestBed.resetTestingModule();
  });
});
