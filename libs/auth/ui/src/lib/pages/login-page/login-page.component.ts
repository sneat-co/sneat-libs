import { Component, computed, signal, inject, effect, ChangeDetectionStrategy } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import {
  NavController,
  IonBackButton,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCol,
  IonContent,
  IonGrid,
  IonHeader,
  IonIcon,
  IonItem,
  IonItemDivider,
  IonLabel,
  IonList,
  IonRow,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import {
  AuthProviderID,
  AuthStatuses,
  ILoginEventsHandler,
  ISneatAuthState,
  LoginEventsHandler,
  SneatAuthStateService,
} from '@sneat/auth-core';
import { SneatUserService } from '@sneat/auth-core';
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
import { Subject, takeUntil } from 'rxjs';
import {
  EmailFormSigningWith,
  EmailLoginFormComponent,
} from './email-login-form/email-login-form.component';
import { UserCredential } from 'firebase/auth';
import { LoginWithTelegramComponent } from './login-with-telegram.component';

type Action = 'join' | 'refuse'; // TODO: inject provider for action descriptions/messages.

@Component({
  selector: 'sneat-login',
  templateUrl: './login-page.component.html',
  imports: [
    FormsModule,
    RouterLink,
    LoginWithTelegramComponent,
    EmailLoginFormComponent,
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
    IonItemDivider,
    IonLabel,
    IonRow,
    IonCol,
    IonItem,
    IonSpinner,
    IonIcon,
    IonList,
    IonGrid,
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

  protected readonly signingWith = signal<AuthProviderID | undefined>(
    undefined,
  );
  private readonly redirectTo?: string;
  protected readonly to?: string;
  // Free-text explanation of WHY sign-in is needed, passed by the calling page
  // as query params (rendered as escaped text — never as HTML):
  //   reason       — short heading, e.g. "Sign in to create a new game"
  //   reasonDetail — optional sub-heading / one-line elaboration
  protected readonly reason?: string;
  protected readonly reasonDetail?: string;
  protected readonly action?: Action; // TODO: document possible values?

  protected readonly isNativePlatform = Capacitor.isNativePlatform();

  protected readonly appTitle: string;

  // Surfaces the Firebase auth state on the login page itself: if the user is
  // already signed in (e.g. the app failed to navigate them onward) we show a
  // "you are already signed in as X" panel instead of the sign-in form, so an
  // authenticated-but-stuck state is obvious rather than looking like sign-in
  // is broken.
  protected readonly isAuthenticated = computed(
    () => this.authStatus() === 'authenticated',
  );
  // While Firebase is still resolving the session — the initial state, and the
  // brief window right after a signInWithRedirect return — show a "signing you
  // in" spinner instead of flashing the sign-in form before we navigate onward.
  protected readonly isAuthenticating = computed(
    () => this.authStatus() === 'authenticating',
  );
  private readonly authStatus = toSignal(this.authStateService.authStatus);
  private readonly authUser = toSignal(this.authStateService.authUser);
  private readonly userState = toSignal(this.userService.userState);
  protected readonly signedInAs = computed(() => {
    const u = this.authUser();
    return u?.displayName || u?.email || u?.uid || '';
  });

  constructor() {
    super();
    effect(() => {
      if (this.authStatus() === 'notAuthenticated') {
        this.signingWith.set(undefined);
      }
    });

    const appInfo = this.appInfo;
    this.appTitle = appInfo.appTitle || 'Sneat.app';
    if (location.hash.startsWith('#/')) {
      this.redirectTo = location.hash.substring(1);
    }
    this.to = this.route.snapshot.queryParams['to']; // should we subscribe? I believe no.
    this.reason = this.route.snapshot.queryParams['reason'];
    this.reasonDetail = this.route.snapshot.queryParams['reasonDetail'];
    const action = location.hash.match(/[#&]action=(\w+)/);
    this.action = action?.[1] as Action;

    const userRecordLoaded = new Subject<void>();
    this.userService.userState
      .pipe(takeUntil(userRecordLoaded), this.takeUntilDestroyed())
      .subscribe({
        next: (userState) => {
          if (userState.record) {
            userRecordLoaded.next();
          } else {
            return;
          }
          // Fall back to the persisted current space so it is restored after login,
          // but only if the user actually has access to it.
          const space = readCurrentSpace();
          const hasAccess = !!space && (
            userState.record.spaceIDs?.includes(space.id) ||
            (!!userState.record.spaces && space.id in userState.record.spaces)
          );
          if (space && !hasAccess) {
            clearCurrentSpace();
          }
          const activePath = hasAccess ? currentSpacePath() : undefined;
          const family = Object.entries(userState.record.spaces || {}).find(
            ([, brief]) => brief.type === SpaceTypeFamily,
          );
          const familyPath = family
            ? `/space/${SpaceTypeFamily}/${family[0]}`
            : undefined;
          const redirectTo = this.redirectTo || activePath || familyPath || '/';
          this.navController
            .navigateRoot(redirectTo)
            .catch((err) => {
              this.signingWith.set(undefined);
              this.errorLogger.logError(
                err,
                'Failed to navigate back to ' + redirectTo,
              );
            });
        },
        error: this.errorHandler('Failed to get user state after login'),
      });
  }

  ionViewDidEnter(): void {
    this.signingWith.set(undefined);
  }

  protected onEmailFormStatusChanged(signingWith?: EmailFormSigningWith): void {
    this.signingWith.set(signingWith as AuthProviderID);
  }

  // Proceed into the app from the "already signed in" panel.
  protected continueToApp(): void {
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
        this.signingWith.set(undefined);
        this.errorLogger.logError(
          err,
          'Failed to navigate to ' + redirectTo,
        );
      });
  }

  // Sign out so the sign-in form is shown again (e.g. to log in as someone else).
  protected reLogin(): void {
    clearCurrentSpace();
    this.authStateService
      .signOut()
      .catch(this.errorLogger.logErrorHandler('Failed to sign out for re-login'));
  }

  protected async loginWith(provider: AuthProviderID) {
    this.signingWith.set(provider);
    try {
      await this.authStateService.signInWith(provider);
      // We do not reset this.signingWith in case of succesful sign in as we should redirect from login page
      // and not to allow user to do a double sign-in.
    } catch (e) {
      const errMsg = (e as { errorMessage?: string }).errorMessage;
      if (
        errMsg !== 'The user canceled the sign-in flow.' &&
        !errMsg?.includes(
          'com.apple.AuthenticationServices.AuthorizationError error 1001.',
        )
      ) {
        this.errorLogger.logError(e, `Failed to sign-in with ${provider}`);
      }
      this.signingWith.set(undefined);
    }
  }

  protected onLoggedIn(userCredential: UserCredential): void {
    this.signingWith.set(undefined);
    if (!userCredential.user) {
      return;
    }
    if (userCredential.user.email) {
      const prevEmail = localStorage.getItem('emailForSignIn') || '';
      if (!prevEmail) {
        localStorage.setItem('emailForSignIn', userCredential.user.email);
      }
    }
    const authState: ISneatAuthState = {
      status: AuthStatuses.authenticated,
      user: userCredential.user,
    };
    this.userService.onUserSignedIn(authState);
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
    this.signingWith.set(undefined);
  }
}
