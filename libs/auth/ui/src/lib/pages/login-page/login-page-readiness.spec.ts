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
import {
  clearLoginRedirectIntent,
  markLoginRedirectIntent,
} from './login-redirect-intent';
import { LoginPageComponent } from './login-page.component';

describe('LoginPageComponent persisted record readiness', () => {
  let fixture: ComponentFixture<LoginPageComponent>;
  let authState: BehaviorSubject<ISneatAuthState>;
  let authStatus: BehaviorSubject<string>;
  let authUser: BehaviorSubject<ISneatAuthState['user']>;
  let userState: BehaviorSubject<ISneatUserState>;
  let navigateRoot: ReturnType<typeof vi.fn>;
  let retryUserRecordInitialization: ReturnType<typeof vi.fn>;
  let queryParams: Record<string, string>;

  beforeEach(async () => {
    authState = new BehaviorSubject<ISneatAuthState>({
      status: 'authenticating',
      loadingPhase: 'checking-session',
    });
    authStatus = new BehaviorSubject('authenticating');
    authUser = new BehaviorSubject<ISneatAuthState['user']>(undefined);
    userState = new BehaviorSubject<ISneatUserState>({
      status: 'authenticating',
    });
    navigateRoot = vi.fn().mockResolvedValue(true);
    retryUserRecordInitialization = vi.fn();
    queryParams = {};

    await TestBed.configureTestingModule({
      imports: [LoginPageComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParams } },
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

  function create(resolveSignedOut = true): void {
    fixture = TestBed.createComponent(LoginPageComponent);
    fixture.detectChanges();
    if (resolveSignedOut) {
      authState.next({ status: 'notAuthenticated', loadingPhase: 'ready' });
      userState.next({ status: 'notAuthenticated' });
      fixture.detectChanges();
    }
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
    expect(fixture.nativeElement.textContent).toContain('Signing you in');
    expect(fixture.nativeElement.textContent).not.toContain('Login with Google');
    expect(fixture.nativeElement.querySelector('sneat-auth-panel')).toBeNull();
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

  it('redirects after the newly signed-in matching persisted record is ready', () => {
    create();
    signedInState('ready', 'buyer');

    expect(navigateRoot).toHaveBeenCalledOnce();
    expect(fixture.nativeElement.textContent).toContain('Signing you in');
    expect(fixture.nativeElement.textContent).not.toContain('Continue to Sneat');
  });

  it('keeps an already-authenticated login visit on the account choice panel', () => {
    const user = {
      uid: 'buyer',
      isAnonymous: false,
      displayName: 'Olive Chicken',
      providerId: 'google.com',
      providerData: [{ providerId: 'google.com' }],
    } as ISneatAuthState['user'];
    authState.next({
      status: 'authenticated',
      loadingPhase: 'ready',
      token: 'buyer-token',
      user,
    });
    userState.next({
      status: 'authenticated',
      user: user as ISneatUserState['user'],
      record: { title: 'Buyer' },
      userRecordStatus: 'ready',
    });
    create(false);

    expect(navigateRoot).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain(
      'You’re signed in as Olive Chicken',
    );
    expect(fixture.nativeElement.textContent).toContain('Signed in with Google');
    expect(fixture.nativeElement.textContent).toContain('Continue to Sneat');
    expect(fixture.nativeElement.textContent).toContain('Use another account');
    expect(fixture.nativeElement.querySelector('ion-card[color="success"]')).toBeNull();
    const continueButton = Array.from(
      fixture.nativeElement.querySelectorAll('ion-button'),
    ).find((button) => button.textContent.includes('Continue to Sneat'));
    continueButton?.click();
    expect(navigateRoot).toHaveBeenCalledOnce();
  });

  it('does not guess the current provider from several linked providers', () => {
    const user = {
      uid: 'buyer',
      isAnonymous: false,
      displayName: 'Olive Chicken',
      providerId: 'firebase',
      providerData: [
        { providerId: 'google.com' },
        { providerId: 'github.com' },
      ],
    } as ISneatAuthState['user'];
    authState.next({ status: 'authenticated', loadingPhase: 'ready', token: 'token', user });
    userState.next({
      status: 'authenticated',
      user: user as ISneatUserState['user'],
      record: { title: 'Buyer' },
      userRecordStatus: 'ready',
    });
    create(false);

    expect(fixture.nativeElement.textContent).not.toContain('Signed in with Google');
    expect(fixture.nativeElement.textContent).not.toContain('Signed in with GitHub');
  });

  it('offers account setup retry after a fresh sign-in record initialization fails', () => {
    create();
    signedInState('failed');

    expect(fixture.nativeElement.textContent).toContain('Your account is still being prepared.');
    expect(fixture.nativeElement.textContent).toContain('Retry account setup');
    expect(fixture.nativeElement.querySelector('ion-spinner')).toBeNull();
  });

  it('auto-continues after signing in again from the existing-account panel', () => {
    const user = { uid: 'buyer', isAnonymous: false } as ISneatAuthState['user'];
    authState.next({ status: 'authenticated', loadingPhase: 'ready', token: 'old-token', user });
    userState.next({
      status: 'authenticated',
      user: user as ISneatUserState['user'],
      record: { title: 'Buyer' },
      userRecordStatus: 'ready',
    });
    create(false);

    const useAnotherAccount = Array.from(
      fixture.nativeElement.querySelectorAll('ion-button'),
    ).find((button) => button.textContent.includes('Use another account'));
    useAnotherAccount?.click();
    authState.next({ status: 'notAuthenticated', loadingPhase: 'ready' });
    userState.next({ status: 'notAuthenticated' });
    signedInState('ready');

    expect(navigateRoot).toHaveBeenCalledOnce();
  });

  it('continues to the latest returnTo after sign-in when Ionic reuses the login page', () => {
    create();
    signedInState('ready');
    expect(navigateRoot).toHaveBeenCalledOnce();

    fixture.componentInstance.ionViewWillLeave();
    authState.next({ status: 'notAuthenticated', loadingPhase: 'ready' });
    authStatus.next('notAuthenticated');
    authUser.next(undefined);
    userState.next({ status: 'notAuthenticated' });
    queryParams['returnTo'] = '/new-project?returnUrl=%2Fhome';

    fixture.componentInstance.ionViewWillEnter();
    fixture.detectChanges();
    signedInState('ready');

    expect(navigateRoot).toHaveBeenCalledTimes(2);
    expect(navigateRoot).toHaveBeenLastCalledWith(
      '/new-project?returnUrl=%2Fhome',
    );
  });

  it('shows the account choice again when a reused login page is entered with an existing session', () => {
    const user = {
      uid: 'buyer',
      isAnonymous: false,
      displayName: 'Olive Chicken',
    } as ISneatAuthState['user'];
    authState.next({
      status: 'authenticated',
      loadingPhase: 'ready',
      token: 'buyer-token',
      user,
    });
    userState.next({
      status: 'authenticated',
      user: user as ISneatUserState['user'],
      record: { title: 'Buyer' },
      userRecordStatus: 'ready',
    });
    create(false);
    fixture.componentInstance.ionViewWillLeave();
    fixture.componentInstance.ionViewWillEnter();
    fixture.detectChanges();

    expect(navigateRoot).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain(
      'You’re signed in as Olive Chicken',
    );
  });

  it('shows the account choice for an already-ready cached session and continues to its new target', () => {
    const user = { uid: 'buyer', isAnonymous: false } as ISneatAuthState['user'];
    authState.next({
      status: 'authenticated',
      loadingPhase: 'ready',
      token: 'buyer-token',
      user,
    });
    userState.next({
      status: 'authenticated',
      user: user as ISneatUserState['user'],
      record: { title: 'Buyer' },
      userRecordStatus: 'ready',
    });
    create(false);
    fixture.componentInstance.ionViewWillLeave();
    queryParams['returnTo'] = '/new-project?returnUrl=%2Fhome';

    fixture.componentInstance.ionViewWillEnter();
    fixture.detectChanges();

    expect(navigateRoot).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain(
      'You’re signed in as buyer',
    );
    const continueButton = Array.from(
      fixture.nativeElement.querySelectorAll('ion-button'),
    ).find((button) => button.textContent.includes('Continue to Sneat'));
    continueButton?.click();
    expect(navigateRoot).toHaveBeenCalledOnce();
    expect(navigateRoot).toHaveBeenCalledWith('/new-project?returnUrl=%2Fhome');
  });

  it('honors a one-use redirect intent without a custom target', () => {
    clearLoginRedirectIntent();
    markLoginRedirectIntent();
    const user = { uid: 'buyer', isAnonymous: false } as ISneatAuthState['user'];
    authState.next({
      status: 'authenticated',
      loadingPhase: 'ready',
      token: 'buyer-token',
      user,
    });
    userState.next({
      status: 'authenticated',
      user: user as ISneatUserState['user'],
      record: { title: 'Buyer' },
      userRecordStatus: 'ready',
    });
    create(false);

    expect(navigateRoot).toHaveBeenCalledOnce();
    expect(navigateRoot).toHaveBeenCalledWith('/');
    expect(fixture.nativeElement.textContent).not.toContain('Use another account');
    clearLoginRedirectIntent();
  });

  it('waits through initial auth resolution without mistaking an existing session for a fresh sign-in', () => {
    create(false);
    const user = { uid: 'buyer', isAnonymous: false } as ISneatAuthState['user'];
    authState.next({
      status: 'authenticating',
      loadingPhase: 'getting-token',
      user,
    });
    userState.next({ status: 'authenticating', user: user as ISneatUserState['user'] });
    authState.next({
      status: 'authenticated',
      loadingPhase: 'ready',
      token: 'buyer-token',
      user,
    });
    userState.next({
      status: 'authenticated',
      user: user as ISneatUserState['user'],
      record: { title: 'Buyer' },
      userRecordStatus: 'ready',
    });
    fixture.detectChanges();

    expect(navigateRoot).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('You’re signed in as buyer');
  });

  it('continues after a redirect sign-in returns through a cold auth initialization', () => {
    markLoginRedirectIntent('/reports?view=recent');
    create(false);
    const user = { uid: 'buyer', isAnonymous: false } as ISneatAuthState['user'];
    authState.next({
      status: 'authenticating',
      loadingPhase: 'getting-token',
      user,
    });
    userState.next({
      status: 'authenticating',
      user: user as ISneatUserState['user'],
      userRecordStatus: 'loading',
    });
    authState.next({
      status: 'authenticated',
      loadingPhase: 'ready',
      token: 'buyer-token',
      user,
    });
    userState.next({
      status: 'authenticated',
      user: user as ISneatUserState['user'],
      record: { title: 'Buyer' },
      userRecordStatus: 'ready',
    });

    expect(navigateRoot).toHaveBeenCalledWith('/reports?view=recent');
    expect(fixture.nativeElement.textContent).toContain('Signing you in');
    expect(fixture.nativeElement.textContent).not.toContain('Use another account');
  });

  it('uses a safe explicit returnTo after a fresh sign-in', () => {
    queryParams['returnTo'] = '/reports?view=recent';
    create();
    signedInState('ready');

    expect(navigateRoot).toHaveBeenCalledWith('/reports?view=recent');
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

  it('does not auto-continue or allow manual continuation without a current token', () => {
    create();
    const user = { uid: 'buyer', isAnonymous: false } as ISneatAuthState['user'];
    authState.next({
      status: 'authenticated',
      loadingPhase: 'ready',
      token: null,
      user,
    });
    userState.next({
      status: 'authenticated',
      user: user as ISneatUserState['user'],
      record: { title: 'Buyer' },
      userRecordStatus: 'ready',
    });
    fixture.detectChanges();

    expect(navigateRoot).not.toHaveBeenCalled();
    (
      fixture.componentInstance as unknown as { continueToApp(): void }
    ).continueToApp();
    expect(navigateRoot).not.toHaveBeenCalled();
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
