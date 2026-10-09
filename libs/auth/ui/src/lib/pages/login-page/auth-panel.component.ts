import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  EventEmitter,
  OnInit,
  Output,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import {
  AuthProviderID,
  AuthStatuses,
  ISneatAuthState,
  SneatAuthStateService,
  SneatUserService,
} from '@sneat/auth-core';
import { ErrorLogger, IErrorLogger } from '@sneat/core';
import { UserCredential } from 'firebase/auth';
import {
  IonButton,
  IonCard,
  IonCol,
  IonGrid,
  IonIcon,
  IonItem,
  IonItemDivider,
  IonLabel,
  IonList,
  IonRow,
  IonSpinner,
  IonText,
} from '@ionic/angular';
import {
  EmailFormSigningWith,
  EmailLoginFormComponent,
} from './email-login-form/email-login-form.component';
import { LoginWithTelegramComponent } from './login-with-telegram.component';
import { safeAuthReturnPath } from './safe-auth-return-path';
import { combineLatest } from 'rxjs';
import { RandomIdService } from '@sneat/random';

export interface AuthPanelAccountReadyChange {
  readonly uid?: string;
  readonly ready: boolean;
}

/** Shared auth methods without page-shell or navigation side effects. */
@Component({
  selector: 'sneat-auth-panel',
  templateUrl: './auth-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    EmailLoginFormComponent,
    LoginWithTelegramComponent,
    IonButton,
    IonCard,
    IonCol,
    IonGrid,
    IonIcon,
    IonItem,
    IonItemDivider,
    IonLabel,
    IonList,
    IonRow,
    IonSpinner,
    IonText,
  ],
  providers: [RandomIdService],
})
export class AuthPanelComponent implements OnInit {
  readonly returnTo = input<string | undefined>();
  readonly showIntro = input(true);
  readonly showCredentials = input(true);
  @Output() readonly accountReadyChange =
    new EventEmitter<AuthPanelAccountReadyChange>();

  protected readonly signingWith = signal<
    AuthProviderID | EmailFormSigningWith | undefined
  >(undefined);
  protected readonly authRecoveryNeeded = signal(false);
  protected readonly recordState = signal<
    'signed-out' | 'loading' | 'ready' | 'failed'
  >('loading');
  protected readonly isNativePlatform = Capacitor.isNativePlatform();
  protected readonly safeReturnTo = computed(() =>
    safeAuthReturnPath(this.returnTo()),
  );
  protected readonly ssoQueryParams = computed(() => {
    const returnTo = this.safeReturnTo();
    return returnTo ? { returnTo } : undefined;
  });

  private readonly authStateService = inject(SneatAuthStateService);
  private readonly userService = inject(SneatUserService);
  private readonly errorLogger = inject<IErrorLogger>(ErrorLogger);
  private readonly destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    // This initial BehaviorSubject value is emitted after inputs and output
    // listeners are connected. Consumers can gate account-dependent work until
    // the matching user record is ready, even when auth resolved before mount.
    combineLatest([
      this.authStateService.authState,
      this.userService.userState,
    ])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([authState, userState]) => {
        const uid = authState.user?.uid;
        const sameIdentity =
          !!uid &&
          userState.status === 'authenticated' &&
          userState.user?.uid === uid &&
          !userState.user.isAnonymous;
        const ready =
          authState.status === 'authenticated' &&
          !authState.user?.isAnonymous &&
          sameIdentity &&
          userState.userRecordStatus === 'ready' &&
          !!userState.record;
        const failed =
          authState.status === 'authenticated' &&
          !authState.user?.isAnonymous &&
          sameIdentity &&
          userState.userRecordStatus === 'failed';
        const signedOut =
          authState.status === 'notAuthenticated' ||
          authState.user?.isAnonymous === true;
        const authRecoveryNeeded =
          authState.status === AuthStatuses.authenticating &&
          authState.loadingPhase === 'failed' &&
          !!authState.user;
        this.authRecoveryNeeded.set(authRecoveryNeeded);
        this.recordState.set(
          ready
            ? 'ready'
            : failed
              ? 'failed'
              : signedOut || authRecoveryNeeded
                ? 'signed-out'
                : 'loading',
        );
        if (ready || authState.status === 'notAuthenticated') {
          this.signingWith.set(undefined);
        }
        this.accountReadyChange.emit({
          uid,
          ready,
        });
      });
  }

  protected retryUserRecordInitialization(): void {
    this.userService.retryUserRecordInitialization();
  }

  protected onEmailFormStatusChanged(signingWith?: EmailFormSigningWith): void {
    this.signingWith.set(signingWith);
  }

  protected async loginWith(provider: AuthProviderID): Promise<void> {
    this.signingWith.set(provider);
    try {
      await this.authStateService.signInWith(provider);
    } catch (error) {
      const message = (error as { errorMessage?: string }).errorMessage;
      if (
        message !== 'The user canceled the sign-in flow.' &&
        !message?.includes(
          'com.apple.AuthenticationServices.AuthorizationError error 1001.',
        )
      ) {
        this.errorLogger.logError(error, `Failed to sign-in with ${provider}`);
      }
      this.signingWith.set(undefined);
    }
  }

  protected onLoggedIn(userCredential: UserCredential): void {
    this.signingWith.set(undefined);
    if (!userCredential.user) return;
    if (userCredential.user.email) {
      const previousEmail = localStorage.getItem('emailForSignIn') || '';
      if (!previousEmail) {
        localStorage.setItem('emailForSignIn', userCredential.user.email);
      }
    }
    const authState: ISneatAuthState = {
      status: AuthStatuses.authenticated,
      user: userCredential.user,
    };
    this.userService.onUserSignedIn(authState);
  }
}
