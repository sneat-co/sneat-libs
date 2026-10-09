import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { NavController, ToastController } from '@ionic/angular';
import { SneatApiService } from '@sneat/api';
import {
  ISneatAuthState,
  ISneatUserState,
  SneatAuthStateService,
  SneatUserService,
  UserRecordService,
} from '@sneat/auth-core';
import {
  AnalyticsService,
  APP_INFO,
  ErrorLogger,
  SNEAT_FIREBASE_AUTH,
} from '@sneat/core';
import { RANDOM_ID_OPTIONS } from '@sneat/random';
import { BehaviorSubject, NEVER } from 'rxjs';
import { TelegramLoginConfig } from './telegram-login-config';
import { LoginPageComponent } from './login-page.component';

describe('LoginPageComponent persisted record readiness', () => {
  let fixture: ComponentFixture<LoginPageComponent>;
  let authState: BehaviorSubject<ISneatAuthState>;
  let authStatus: BehaviorSubject<string>;
  let authUser: BehaviorSubject<ISneatAuthState['user']>;
  let userState: BehaviorSubject<ISneatUserState>;
  let navigateRoot: ReturnType<typeof vi.fn>;
  let retryUserRecordInitialization: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    authState = new BehaviorSubject<ISneatAuthState>({
      status: 'authenticating',
    });
    authStatus = new BehaviorSubject('authenticating');
    authUser = new BehaviorSubject<ISneatAuthState['user']>(undefined);
    userState = new BehaviorSubject<ISneatUserState>({
      status: 'authenticating',
    });
    navigateRoot = vi.fn().mockResolvedValue(true);
    retryUserRecordInitialization = vi.fn();

    await TestBed.configureTestingModule({
      imports: [LoginPageComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParams: {} } },
        },
        {
          provide: SneatAuthStateService,
          useValue: {
            authState: authState.asObservable(),
            authStatus: authStatus.asObservable(),
            authUser: authUser.asObservable(),
            signOut: vi.fn().mockResolvedValue(undefined),
            signInWith: vi.fn(),
          },
        },
        {
          provide: SneatUserService,
          useValue: {
            userState: userState.asObservable(),
            retryUserRecordInitialization,
          },
        },
        { provide: SNEAT_FIREBASE_AUTH, useValue: {} },
        { provide: SneatApiService, useValue: { postAsAnonymous: () => NEVER } },
        { provide: UserRecordService, useValue: { initUserRecord: () => NEVER } },
        { provide: ToastController, useValue: { create: vi.fn() } },
        { provide: RANDOM_ID_OPTIONS, useValue: { len: 9 } },
        { provide: TelegramLoginConfig, useValue: { botID: '' } },
        { provide: NavController, useValue: { navigateRoot } },
        {
          provide: ErrorLogger,
          useValue: {
            logError: vi.fn(),
            logErrorHandler: vi.fn().mockReturnValue(() => undefined),
          },
        },
        { provide: AnalyticsService, useValue: { logEvent: vi.fn() } },
        { provide: APP_INFO, useValue: { appTitle: 'Sneat' } },
      ],
    }).compileComponents();
  });

  function create(): void {
    fixture = TestBed.createComponent(LoginPageComponent);
    fixture.detectChanges();
  }

  function signedInState(
    userRecordStatus: ISneatUserState['userRecordStatus'],
    uid = 'buyer',
  ): void {
    const user = { uid, isAnonymous: false } as ISneatAuthState['user'];
    authState.next({
      status: 'authenticated',
      loadingPhase: 'ready',
      token: `${uid}-token`,
      user,
    });
    authStatus.next('authenticated');
    authUser.next(user);
    userState.next({
      status: 'authenticated',
      user: user as ISneatUserState['user'],
      record: { title: 'Buyer' },
      userRecordStatus,
    });
    fixture.detectChanges();
  }

  it('keeps Firebase-authenticated accounts pending until their record is persisted', () => {
    create();
    signedInState('loading');

    expect(navigateRoot).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Preparing your account');
    expect(fixture.nativeElement.textContent).not.toContain('Login with Google');
    expect(fixture.nativeElement.querySelector('ion-button')?.textContent).toContain(
      'Re-login as someone else',
    );
  });

  it('shows the shared retry state after account initialization fails', () => {
    create();
    signedInState('failed');

    expect(navigateRoot).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain(
      'Your account is still being prepared.',
    );
    const buttons = fixture.nativeElement.querySelectorAll('ion-button');
    const retry = Array.from(buttons).find((button) =>
      button.textContent.includes('Retry account setup'),
    );
    retry?.click();
    expect(retryUserRecordInitialization).toHaveBeenCalledOnce();
  });

  it('continues only for the matching persisted user and then redirects', () => {
    create();
    signedInState('ready', 'buyer');

    expect(navigateRoot).toHaveBeenCalledOnce();
    const continueButton = Array.from(
      fixture.nativeElement.querySelectorAll('ion-button'),
    ).find((button) => button.textContent.includes('Continue'));
    expect(continueButton).toBeTruthy();
    continueButton?.click();
    expect(navigateRoot).toHaveBeenCalledTimes(2);
  });

  it('does not redirect when a ready record belongs to a different identity', () => {
    create();
    signedInState('loading');
    userState.next({
      status: 'authenticated',
      user: { uid: 'previous-buyer' } as ISneatUserState['user'],
      record: { title: 'Old buyer' },
      userRecordStatus: 'ready',
    });
    fixture.detectChanges();

    expect(navigateRoot).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).not.toContain('Continue');
  });

  it('waits for the matching token after the record snapshot arrives during refresh', () => {
    create();
    const user = { uid: 'buyer', isAnonymous: false } as ISneatAuthState['user'];
    authState.next({
      status: 'authenticating',
      loadingPhase: 'getting-token',
      token: 'old-token',
      user,
    });
    userState.next({
      status: 'authenticated',
      user: user as ISneatUserState['user'],
      record: { title: 'Buyer' },
      userRecordStatus: 'loading',
    });
    fixture.detectChanges();
    expect(navigateRoot).not.toHaveBeenCalled();

    userState.next({
      status: 'authenticated',
      user: user as ISneatUserState['user'],
      record: { title: 'Buyer' },
      userRecordStatus: 'ready',
    });
    fixture.detectChanges();
    expect(navigateRoot).not.toHaveBeenCalled();

    authState.next({
      status: 'authenticated',
      loadingPhase: 'ready',
      token: 'refreshed-token',
      user,
    });
    fixture.detectChanges();
    expect(navigateRoot).toHaveBeenCalledOnce();
  });

  it('offers shared sign-in recovery controls after token retrieval fails', () => {
    create();
    const user = { uid: 'buyer', isAnonymous: false } as ISneatAuthState['user'];
    authState.next({
      status: 'authenticating',
      loadingPhase: 'failed',
      token: null,
      user,
    });
    userState.next({
      status: 'authenticating',
      user: user as ISneatUserState['user'],
      userRecordStatus: 'loading',
    });
    fixture.detectChanges();

    expect(navigateRoot).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain(
      "We couldn't complete sign-in.",
    );
    expect(
      fixture.nativeElement.querySelector('sneat-email-login-form'),
    ).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain(
      'Sign in with company SSO',
    );
  });
});
