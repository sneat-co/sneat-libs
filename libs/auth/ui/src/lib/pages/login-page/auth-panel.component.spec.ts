import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  IPendingCredentialLink,
  ISneatAuthState,
  ISneatUserState,
  SneatAuthStateService,
  SneatUserService,
} from '@sneat/auth-core';
import { ErrorLogger } from '@sneat/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { AUTH_PANEL_UI_CONFIG } from './auth-panel-ui-config';
import { AuthPanelComponent } from './auth-panel.component';

describe('AuthPanelComponent', () => {
  let fixture: ComponentFixture<AuthPanelComponent>;
  let states: BehaviorSubject<ISneatUserState>;
  let authStates: BehaviorSubject<ISneatAuthState>;
  const signInWith = vi.fn();
  const retryUserRecordInitialization = vi.fn();
  let pendingCredentialLink: IPendingCredentialLink | undefined;
  let pendingCredentialLinkChanges: Subject<IPendingCredentialLink | undefined>;
  const logError = vi.fn();

  beforeEach(async () => {
    sessionStorage.clear();
    retryUserRecordInitialization.mockClear();
    signInWith.mockReset();
    logError.mockReset();
    pendingCredentialLink = undefined;
    pendingCredentialLinkChanges = new Subject();
    states = new BehaviorSubject<ISneatUserState>({ status: 'authenticating' });
    authStates = new BehaviorSubject<ISneatAuthState>({
      status: 'authenticating',
    });
    await TestBed.configureTestingModule({
      imports: [AuthPanelComponent],
      providers: [
        {
          provide: SneatAuthStateService,
          useValue: {
            authState: authStates.asObservable(),
            signInWith,
            get pendingCredentialLink() {
              return pendingCredentialLink;
            },
            get pendingCredentialLinkChanges() {
              return pendingCredentialLinkChanges.asObservable();
            },
          },
        },
        {
          provide: SneatUserService,
          useValue: {
            userState: states.asObservable(),
            onUserSignedIn: vi.fn(),
            retryUserRecordInitialization,
          },
        },
        {
          provide: ErrorLogger,
          useValue: { logError },
        },
      ],
    })
      .overrideComponent(AuthPanelComponent, {
        set: { imports: [], schemas: [CUSTOM_ELEMENTS_SCHEMA] },
      })
      .compileComponents();
  });

  function create(returnTo?: string): AuthPanelComponent {
    fixture = TestBed.createComponent(AuthPanelComponent);
    fixture.componentRef.setInput('returnTo', returnTo);
    return fixture.componentInstance;
  }

  it('preserves the default header and providers', () => {
    authStates.next({ status: 'notAuthenticated' });
    create();
    fixture.detectChanges();
    const text = fixture.nativeElement.innerHTML;
    expect(text).toContain('Quick login');
    for (const provider of [
      'Google',
      'Microsoft',
      'GitHub',
      'Apple',
      'Facebook',
    ]) {
      expect(text).toContain(`Login with ${provider}`);
    }
    expect(
      fixture.nativeElement.querySelector('sneat-login-with-telegram'),
    ).not.toBeNull();
  });

  it('applies a website provider allowlist and hidden header', () => {
    TestBed.overrideProvider(AUTH_PANEL_UI_CONFIG, {
      useValue: {
        showQuickLoginHeader: false,
        quickLoginProviders: ['google.com', 'microsoft.com', 'github.com'],
      },
    });
    authStates.next({ status: 'notAuthenticated' });
    create();
    fixture.detectChanges();
    const text = fixture.nativeElement.innerHTML;
    expect(text).not.toContain('Quick login');
    expect(text).not.toContain('Login with Apple');
    expect(text).not.toContain('Login with Facebook');
    expect(
      fixture.nativeElement.querySelector('sneat-login-with-telegram'),
    ).toBeNull();
    for (const provider of ['Google', 'Microsoft', 'GitHub']) {
      expect(text).toContain(`Login with ${provider}`);
    }
  });

  it('hides the quick login card for an empty allowlist', () => {
    TestBed.overrideProvider(AUTH_PANEL_UI_CONFIG, {
      useValue: { quickLoginProviders: [] },
    });
    authStates.next({ status: 'notAuthenticated' });
    create();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('ion-card')).toBeNull();
    expect(
      fixture.nativeElement.querySelector('sneat-email-login-form'),
    ).not.toBeNull();
  });

  it('waits for the matching user record after Firebase identity is authenticated', () => {
    const component = create('/subscribe?plan=pro&period=yearly&checkout=test');
    const ready: Array<{ uid?: string; ready: boolean }> = [];
    component.accountReadyChange.subscribe((value) => ready.push(value));

    fixture.detectChanges();
    authStates.next({
      status: 'authenticated',
      loadingPhase: 'ready',
      token: 'buyer-token',
      user: { uid: 'buyer', isAnonymous: false } as ISneatAuthState['user'],
    });
    expect(ready.at(-1)).toEqual({ uid: 'buyer', ready: false });

    // A stale record for the previous identity must not release checkout.
    states.next({
      status: 'authenticated',
      user: { uid: 'previous-buyer' } as ISneatUserState['user'],
      record: {} as NonNullable<ISneatUserState['record']>,
    });
    expect(ready.at(-1)).toEqual({ uid: 'buyer', ready: false });

    states.next({
      status: 'authenticated',
      user: { uid: 'buyer', isAnonymous: false } as ISneatUserState['user'],
    });
    expect(ready.at(-1)).toEqual({ uid: 'buyer', ready: false });

    states.next({
      status: 'authenticated',
      user: { uid: 'buyer', isAnonymous: false } as ISneatUserState['user'],
      record: {} as NonNullable<ISneatUserState['record']>,
      userRecordStatus: 'loading',
    });
    expect(ready.at(-1)).toEqual({ uid: 'buyer', ready: false });

    states.next({
      status: 'authenticated',
      user: { uid: 'buyer', isAnonymous: false } as ISneatUserState['user'],
      record: {} as NonNullable<ISneatUserState['record']>,
      userRecordStatus: 'ready',
    });
    expect(ready.at(-1)).toEqual({ uid: 'buyer', ready: true });

    authStates.next({ status: 'notAuthenticated' });
    expect(ready.at(-1)).toEqual({ uid: undefined, ready: false });
  });

  it('reports a preloaded account after the continuation input is bound', () => {
    states.next({
      status: 'authenticated',
      user: { uid: 'buyer', isAnonymous: false } as ISneatUserState['user'],
      record: {} as NonNullable<ISneatUserState['record']>,
      userRecordStatus: 'ready',
    });
    const component = create(
      '/business/checkout?planID=datatug-business-usage-annual&spaceID=space_1',
    );
    authStates.next({
      status: 'authenticated',
      loadingPhase: 'ready',
      token: 'buyer-token',
      user: { uid: 'buyer', isAnonymous: false } as ISneatAuthState['user'],
    });
    const ready: Array<{ uid?: string; ready: boolean }> = [];
    component.accountReadyChange.subscribe((value) => ready.push(value));

    fixture.detectChanges();

    expect(ready).toEqual([{ uid: 'buyer', ready: true }]);
    expect(fixture.nativeElement.textContent).toContain(
      'Sign in with company SSO',
    );
  });

  it('does not report a persisted account ready when its current token is missing', () => {
    const component = create('/subscribe?plan=pro&period=monthly');
    const ready: Array<{ uid?: string; ready: boolean }> = [];
    component.accountReadyChange.subscribe((value) => ready.push(value));
    fixture.detectChanges();
    const user = { uid: 'buyer', isAnonymous: false };
    authStates.next({
      status: 'authenticated',
      loadingPhase: 'ready',
      token: null,
      user,
    });
    states.next({
      status: 'authenticated',
      user: user as ISneatUserState['user'],
      record: {} as NonNullable<ISneatUserState['record']>,
      userRecordStatus: 'ready',
    });

    expect(ready.at(-1)).toEqual({ uid: 'buyer', ready: false });
  });

  it('does not report ready while a matching record outlives a failed token', () => {
    const component = create('/subscribe?plan=pro&period=monthly');
    const ready: Array<{ uid?: string; ready: boolean }> = [];
    component.accountReadyChange.subscribe((value) => ready.push(value));
    fixture.detectChanges();
    const user = { uid: 'buyer', isAnonymous: false };
    states.next({
      status: 'authenticated',
      user: user as ISneatUserState['user'],
      record: {} as NonNullable<ISneatUserState['record']>,
      userRecordStatus: 'ready',
    });
    authStates.next({
      status: 'authenticated',
      loadingPhase: 'failed',
      token: 'old-token',
      user,
    });
    fixture.detectChanges();

    expect(ready.at(-1)).toEqual({ uid: 'buyer', ready: false });
    expect(
      fixture.nativeElement.querySelector('sneat-email-login-form'),
    ).not.toBeNull();
  });

  it('never reports an anonymous identity as checkout-ready', () => {
    const component = create('/subscribe?plan=pro&period=monthly');
    const ready: Array<{ uid?: string; ready: boolean }> = [];
    component.accountReadyChange.subscribe((value) => ready.push(value));
    fixture.detectChanges();
    const anonymous = {
      uid: 'anon',
      isAnonymous: true,
    } as ISneatAuthState['user'];
    authStates.next({ status: 'authenticated', user: anonymous });
    states.next({
      status: 'authenticated',
      user: anonymous as ISneatUserState['user'],
      record: {} as NonNullable<ISneatUserState['record']>,
      userRecordStatus: 'ready',
    });

    expect(ready.at(-1)).toEqual({ uid: 'anon', ready: false });
  });

  it('keeps account initialization failures out of the credential form and offers retry', () => {
    const component = create('/subscribe?plan=pro&period=monthly');
    const ready: Array<{ uid?: string; ready: boolean }> = [];
    component.accountReadyChange.subscribe((value) => ready.push(value));
    fixture.detectChanges();
    const user = { uid: 'buyer', isAnonymous: false };
    authStates.next({ status: 'authenticated', user });
    states.next({
      status: 'authenticated',
      user: user as ISneatUserState['user'],
      record: { title: 'Buyer' } as NonNullable<ISneatUserState['record']>,
      userRecordStatus: 'failed',
    });
    fixture.detectChanges();

    expect(ready.at(-1)).toEqual({ uid: 'buyer', ready: false });
    expect(fixture.nativeElement.textContent).toContain(
      'Your account is still being prepared.',
    );
    const retry = fixture.nativeElement.querySelector('ion-button');
    expect(retry?.textContent).toContain('Retry account setup');
    retry?.click();
    expect(retryUserRecordInitialization).toHaveBeenCalledOnce();
  });

  it('keeps checkout unready and restores existing sign-in controls after token failure', () => {
    const component = create('/subscribe?plan=pro&period=monthly');
    const ready: Array<{ uid?: string; ready: boolean }> = [];
    component.accountReadyChange.subscribe((value) => ready.push(value));
    fixture.detectChanges();
    const user = { uid: 'buyer', isAnonymous: false };
    authStates.next({
      status: 'authenticated',
      loadingPhase: 'failed',
      user,
    });
    states.next({
      status: 'authenticated',
      user: user as ISneatUserState['user'],
      userRecordStatus: 'loading',
    });
    fixture.detectChanges();

    expect(ready.at(-1)).toEqual({ uid: 'buyer', ready: false });
    expect(fixture.nativeElement.textContent).toContain(
      "We couldn't complete sign-in.",
    );
    expect(
      fixture.nativeElement.querySelector('sneat-email-login-form'),
    ).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain(
      'Sign in with company SSO',
    );
    expect(fixture.nativeElement.textContent).not.toContain(
      'Retry account setup',
    );
    expect(retryUserRecordInitialization).not.toHaveBeenCalled();
  });

  it('restores credentials after auth failure even without a current user', () => {
    const component = create('/subscribe?plan=pro&period=monthly');
    const ready: Array<{ uid?: string; ready: boolean }> = [];
    component.accountReadyChange.subscribe((value) => ready.push(value));
    fixture.detectChanges();
    authStates.next({ status: 'authenticating', loadingPhase: 'failed' });
    states.next({ status: 'authenticating' });
    fixture.detectChanges();

    expect(ready.at(-1)).toEqual({ uid: undefined, ready: false });
    expect(
      fixture.nativeElement.querySelector('sneat-email-login-form'),
    ).not.toBeNull();
  });

  it('restores credentials after auth failure for an anonymous identity', () => {
    const component = create('/subscribe?plan=pro&period=monthly');
    const ready: Array<{ uid?: string; ready: boolean }> = [];
    component.accountReadyChange.subscribe((value) => ready.push(value));
    fixture.detectChanges();
    const anonymous = {
      uid: 'anon',
      isAnonymous: true,
    } as ISneatAuthState['user'];
    authStates.next({
      status: 'authenticated',
      loadingPhase: 'failed',
      user: anonymous,
    });
    states.next({
      status: 'authenticated',
      user: anonymous as ISneatUserState['user'],
    });
    fixture.detectChanges();

    expect(ready.at(-1)).toEqual({ uid: 'anon', ready: false });
    expect(
      fixture.nativeElement.querySelector('sneat-email-login-form'),
    ).not.toBeNull();
  });

  it('clears a resolved provider busy state when token loading later fails', async () => {
    signInWith.mockResolvedValue(undefined);
    const component = create('/subscribe?plan=pro&period=monthly');
    fixture.detectChanges();

    await (
      component as unknown as { loginWith(provider: string): Promise<void> }
    ).loginWith('google.com');
    authStates.next({
      status: 'authenticated',
      loadingPhase: 'failed',
      user: { uid: 'buyer', isAnonymous: false } as ISneatAuthState['user'],
    });
    states.next({
      status: 'authenticated',
      user: { uid: 'buyer' } as ISneatUserState['user'],
    });
    fixture.detectChanges();

    expect(signInWith).toHaveBeenCalledWith('google.com');
    expect(fixture.nativeElement.querySelector('ion-item')).not.toBeNull();
    expect(
      fixture.nativeElement.querySelector('ion-item[disabled]'),
    ).toBeNull();
  });

  it('keeps a bounded redirect intent while provider auth is pending', async () => {
    let resolveSignIn!: () => void;
    signInWith.mockReturnValue(
      new Promise<void>((resolve) => (resolveSignIn = resolve)),
    );
    const component = create('/reports?view=recent');

    const pendingSignIn = (
      component as unknown as { loginWith(provider: string): Promise<void> }
    ).loginWith('google.com');
    expect(sessionStorage.length).toBe(1);
    const key = sessionStorage.key(0);
    expect(key).toBeTruthy();
    const storedIntent = key ? sessionStorage.getItem(key) : null;
    expect(storedIntent).toBeTruthy();
    expect(JSON.parse(storedIntent || '{}').returnTo).toBe(
      '/reports?view=recent',
    );

    resolveSignIn();
    await pendingSignIn;
    expect(sessionStorage.length).toBe(0);
  });

  const githubLink: IPendingCredentialLink = {
    providerId: 'github.com',
    email: 'me@example.com',
    createdAt: 0,
    credential: {},
  };
  const accountExists = {
    code: 'auth/account-exists-with-different-credential',
  };

  it('explains how to connect a provider whose email already has an account', async () => {
    signInWith.mockImplementation(async () => {
      pendingCredentialLink = githubLink;
      pendingCredentialLinkChanges.next(githubLink);
      throw accountExists;
    });
    const component = create();
    fixture.detectChanges();

    await (
      component as unknown as { loginWith(provider: string): Promise<void> }
    ).loginWith('github.com');
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('me@example.com already has an account.');
    expect(text).toContain("we'll connect GitHub to it automatically");
    expect(logError).not.toHaveBeenCalled();
    expect(
      fixture.nativeElement.querySelector('ion-item[disabled]'),
    ).toBeNull();
  });

  it('does not promise automatic linking when no credential could be kept', async () => {
    signInWith.mockRejectedValue(accountExists);
    const component = create();
    fixture.detectChanges();

    await (
      component as unknown as { loginWith(provider: string): Promise<void> }
    ).loginWith('github.com');
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('This email already has an account.');
    expect(text).toContain('then connect GitHub from your account page');
    expect(text).not.toContain('automatically');
  });

  it('shows a pending link from a redirect sign-in that resolves after render', () => {
    create();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('already has');

    pendingCredentialLinkChanges.next(githubLink);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      "we'll connect GitHub to it automatically",
    );
  });

  it('logs other provider sign-in errors', async () => {
    signInWith.mockRejectedValue(new Error('boom'));
    const component = create();
    fixture.detectChanges();

    await (
      component as unknown as { loginWith(provider: string): Promise<void> }
    ).loginWith('github.com');

    expect(logError).toHaveBeenCalled();
  });

  it('shows auth recovery controls when the wrapper hides normal credentials', () => {
    create('/subscribe?plan=pro&period=monthly');
    fixture.componentRef.setInput('showCredentials', false);
    fixture.detectChanges();
    authStates.next({ status: 'authenticated', loadingPhase: 'failed' });
    states.next({ status: 'authenticated' });
    fixture.detectChanges();

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
