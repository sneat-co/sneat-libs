import { Component, computed, inject, ChangeDetectionStrategy, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import {
  NavController,
  IonBackButton,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import {
  ILoginEventsHandler,
  ISneatAuthState,
  LoginEventsHandler,
  SneatAuthStateService,
  ISneatUserState,
  SneatUserService,
  isSneatAccountReady,
} from '@sneat/auth-core';
import {
  AnalyticsService,
  APP_INFO,
  clearCurrentSpace,
  currentSpacePath,
  IAnalyticsService,
  IAppInfo,
  readCurrentSpace,
  SpaceTypeFamily,
} from '@sneat/core';
import { RandomIdService } from '@sneat/random';
import { ClassName, SneatBaseComponent } from '@sneat/ui';
import { combineLatest } from 'rxjs';
import { AuthPanelComponent } from './auth-panel.component';
import { safeAuthReturnPath } from './safe-auth-return-path';
import {
  clearLoginRedirectIntent,
  consumeLoginRedirectIntent,
} from './login-redirect-intent';
import type { AuthPanelInitialMode } from './email-login-form/email-login-form.component';

type Action = 'join' | 'refuse'; // TODO: inject provider for action descriptions/messages.

@Component({
  selector: 'sneat-login',
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.scss',
  imports: [
    AuthPanelComponent,
    IonHeader,
    IonToolbar,
    IonButton,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    IonCardContent,
    IonText,
    IonCard,
    IonSpinner,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: ClassName,
      useValue: 'LoginPageComponent',
    },
    RandomIdService,
  ],
})
export class LoginPageComponent extends SneatBaseComponent {
  private readonly analyticsService =
    inject<IAnalyticsService>(AnalyticsService);
  private readonly route = inject(ActivatedRoute);
  private readonly navController = inject(NavController);
  private readonly userService = inject(SneatUserService);
  private readonly authStateService = inject(SneatAuthStateService);
  private appInfo = inject<IAppInfo>(APP_INFO);
  private readonly loginEventsHandler = inject<ILoginEventsHandler>(
    LoginEventsHandler,
    { optional: true },
  );

  protected redirectTo?: string;
  protected readonly to?: string;
  // Free-text explanation of WHY sign-in is needed, passed by the calling page
  // as query params (rendered as escaped text — never as HTML):
  //   reason       — short heading, e.g. "Sign in to create a new game"
  //   reasonDetail — optional sub-heading / one-line elaboration
  protected readonly reason?: string;
  protected readonly reasonDetail?: string;
  protected readonly action?: Action; // TODO: document possible values?
  // Optional `?mode=sign-up` or `?mode=sign-in` picks the tab the email form opens on.
  // Absent or unknown values leave the form on its default (Sign in).
  protected readonly initialMode?: AuthPanelInitialMode;

  protected readonly appTitle: string;

  // Surfaces the Firebase auth state on the login page itself: if the user is
  // already signed in (e.g. the app failed to navigate them onward) we show a
  // "you are already signed in as X" panel instead of the sign-in form, so an
  // authenticated-but-stuck state is obvious rather than looking like sign-in
  // is broken.
  protected readonly isAuthenticated = computed(
    () =>
      this.authState()?.status === 'authenticated' &&
      !!this.authState()?.user?.uid &&
      !this.authState()?.user?.isAnonymous,
  );
  private readonly loginEntry = signal<'resolving' | 'signed-out' | 'existing-session' | 'fresh-sign-in'>('resolving');
  private pageActive = true;
  private loginEntryResolved = false;
  private redirectStarted = false;
  private loginRedirectIntent = consumeLoginRedirectIntent();
  protected readonly showAccountChoice = computed(
    () => this.loginEntry() === 'existing-session' && this.isAuthenticated(),
  );
  // While Firebase is still resolving the session — the initial state, and the
  // brief window right after a signInWithRedirect return — show a "signing you
  // in" spinner instead of flashing the sign-in form before we navigate onward.
  protected readonly isAuthenticating = computed(
    () =>
      this.authState()?.status === 'authenticating' &&
      this.authState()?.loadingPhase !== 'failed',
  );
  protected readonly isPreparingFreshAccount = computed(
    () =>
      this.loginEntry() === 'fresh-sign-in' &&
      this.isAuthenticated() &&
      !this.isAccountReady() &&
      this.authState()?.loadingPhase !== 'failed' &&
      this.userState()?.userRecordStatus !== 'failed',
  );
  protected readonly isRedirectingAfterFreshSignIn = computed(
    () =>
      this.loginEntry() === 'fresh-sign-in' &&
      this.isAuthenticated() &&
      this.isAccountReady(),
  );
  private readonly authState = toSignal(this.authStateService.authState);
  private readonly userState = toSignal(this.userService.userState);
  protected readonly isAccountReady = computed(() => {
    const userState = this.userState();
    const authState = this.authState();
    return isSneatAccountReady(authState, userState);
  });
  protected readonly signedInAs = computed(() => {
    const u = this.authState()?.user;
    return u?.displayName || u?.email || u?.uid || '';
  });
  protected readonly signedInWith = computed(() => {
    const user = this.authState()?.user;
    // providerId is the current provider only when Firebase has a single
    // provider identity. Linked accounts expose a generic "firebase" value;
    // do not mistake one of their linked providers for the active session.
    const providerID = user?.providerId;
    switch (providerID) {
      case 'google.com': return 'Google';
      case 'microsoft.com': return 'Microsoft';
      case 'github.com': return 'GitHub';
      case 'apple.com': return 'Apple';
      case 'facebook.com': return 'Facebook';
      case 'password': return 'email and password';
      case 'phone': return 'phone';
      default: return undefined;
    }
  });

  constructor() {
    super();
    const appInfo = this.appInfo;
    this.appTitle = appInfo.appTitle || 'Sneat.app';
    this.refreshRedirectTarget();
    this.to = this.route.snapshot.queryParams['to']; // should we subscribe? I believe no.
    this.reason = this.route.snapshot.queryParams['reason'];
    this.reasonDetail = this.route.snapshot.queryParams['reasonDetail'];
    const mode = this.route.snapshot.queryParams['mode'];
    this.initialMode =
      mode === 'sign-up' || mode === 'sign-in' ? mode : undefined;
    const action = location.hash.match(/[#&]action=(\w+)/);
    this.action = action?.[1] as Action;

    combineLatest([this.authStateService.authState, this.userService.userState])
      .pipe(this.takeUntilDestroyed())
      .subscribe({
        next: ([authState, userState]) => this.handleAuthAndUserState(authState, userState),
        error: this.errorHandler('Failed to get user state after login'),
      });
  }

  // Ionic caches routed pages in its navigation stack. Refresh the target and
  // auth-entry decision on each return to this page, and ignore auth updates
  // while the page is covered by another view.
  ionViewWillEnter(): void {
    this.pageActive = true;
    this.loginEntry.set('resolving');
    this.loginEntryResolved = false;
    this.redirectStarted = false;
    this.refreshRedirectTarget();
    const authState = this.authState();
    if (authState && !this.loginEntryResolved) {
      this.resolveLoginEntry(authState);
    }
    const userState = this.userState();
    if (authState && userState) {
      this.handleAuthAndUserState(authState, userState);
    }
  }

  ionViewWillLeave(): void {
    this.pageActive = false;
  }

  private refreshRedirectTarget(): void {
    const hashTarget = location.hash.startsWith('#/')
      ? safeAuthReturnPath(location.hash.substring(1))
      : undefined;
    this.redirectTo =
      hashTarget ||
      safeAuthReturnPath(this.route.snapshot.queryParams['returnTo']) ||
      this.loginRedirectIntent?.returnTo;
  }

  private resolveLoginEntry(authState: ISneatAuthState): void {
    // A session-check placeholder is not evidence that this visit began with
    // an existing account or with a completed sign-in.
    if (
      authState.status === 'authenticating' &&
      authState.loadingPhase === 'checking-session' &&
      !authState.user
    ) return;
    this.loginEntryResolved = true;
    const hasSignedInIdentity =
      (authState.status === 'authenticated' || !!authState.user?.uid) &&
      authState.loadingPhase !== 'failed' &&
      authState.user?.isAnonymous !== true;
    this.loginEntry.set(
      hasSignedInIdentity
        ? this.loginRedirectIntent
          ? 'fresh-sign-in'
          : 'existing-session'
        : 'signed-out',
    );
  }

  private handleAuthAndUserState(
    authState: ISneatAuthState,
    userState: ISneatUserState,
  ): void {
    if (!this.pageActive) return;
    if (!this.loginEntryResolved) {
      this.resolveLoginEntry(authState);
      if (!this.loginEntryResolved) return;
      if (this.loginEntry() === 'existing-session') return;
    } else if (
      this.loginEntry() === 'signed-out' &&
      (authState.status === 'authenticated' || !!authState.user?.uid)
    ) {
      this.loginEntry.set('fresh-sign-in');
    }

    const userRecord = userState.record;
    if (
      this.loginEntry() !== 'fresh-sign-in' ||
      !userRecord ||
      !isSneatAccountReady(authState, userState) ||
      this.redirectStarted
    ) return;
    clearLoginRedirectIntent();
    this.loginRedirectIntent = undefined;
    this.redirectStarted = true;
    // Fall back to the persisted current space so it is restored after login,
    // but only if the user actually has access to it.
    const space = readCurrentSpace();
    const hasAccess = !!space && (
      userRecord.spaceIDs?.includes(space.id) ||
      (!!userRecord.spaces && space.id in userRecord.spaces)
    );
    if (space && !hasAccess) {
      clearCurrentSpace();
    }
    const activePath = hasAccess ? currentSpacePath() : undefined;
    const family = Object.entries(userRecord.spaces || {}).find(
      ([, brief]) => brief.type === SpaceTypeFamily,
    );
    const familyPath = family
      ? `/space/${SpaceTypeFamily}/${family[0]}`
      : undefined;
    const redirectTo = this.redirectTo || activePath || familyPath || '/';
    this.navController
      .navigateRoot(redirectTo)
      .catch((err) => {
        this.redirectStarted = false;
        this.errorLogger.logError(
          err,
          'Failed to navigate back to ' + redirectTo,
        );
      });
  }

  // Proceed into the app from the "already signed in" panel.
  protected continueToApp(): void {
    if (!this.showAccountChoice() || !this.isAccountReady()) return;
    const space = readCurrentSpace();
    const userState = this.userState();
    const hasAccess = !!space && !!userState?.record && (
      userState.record.spaceIDs?.includes(space.id) ||
      (!!userState.record.spaces && space.id in userState.record.spaces)
    );
    if (space && !hasAccess) {
      clearCurrentSpace();
    }
    const activePath = hasAccess ? currentSpacePath() : undefined;
    const family = Object.entries(userState?.record?.spaces || {}).find(
      ([, brief]) => brief.type === SpaceTypeFamily,
    );
    const familyPath = family
      ? `/space/${SpaceTypeFamily}/${family[0]}`
      : undefined;
    const redirectTo = this.redirectTo || activePath || familyPath || '/';
    this.navController
      .navigateRoot(redirectTo)
      .catch((err) => {
        this.errorLogger.logError(
          err,
          'Failed to navigate to ' + redirectTo,
        );
      });
  }

  // Sign out so the sign-in form is shown again (e.g. to log in as someone else).
  protected reLogin(): void {
    clearCurrentSpace();
    this.loginEntry.set('signed-out');
    this.loginEntryResolved = true;
    this.authStateService
      .signOut()
      .catch(this.errorLogger.logErrorHandler('Failed to sign out for re-login'));
  }

  private errorHandler(
    m: string,
    eventName?: string,
    eventParams?: Record<string, string>,
  ): (err: unknown) => void {
    return (err) => this.handleError(err, m, eventName, eventParams);
  }

  private handleError(
    err: unknown,
    m: string,
    eventName?: string,
    eventParams?: Record<string, string>,
  ): void {
    if (eventName) {
      this.analyticsService.logEvent(eventName, eventParams);
    }
    this.errorLogger.logError(err, m, {
      report: !(err as { code: unknown }).code,
    });
  }
}
