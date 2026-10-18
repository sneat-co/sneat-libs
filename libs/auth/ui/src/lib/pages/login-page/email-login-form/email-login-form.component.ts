import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  OnInit,
  Output,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import {
  Auth,
  sendPasswordResetEmail,
  sendSignInLinkToEmail,
} from 'firebase/auth';
import { SNEAT_FIREBASE_AUTH } from '@sneat/core';
import { FormsModule } from '@angular/forms';
import {
  ToastController,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonIcon,
  IonInput,
  IonItem,
  IonItemDivider,
  IonLabel,
  IonSegment,
  IonSegmentButton,
  IonSpinner,
  IonText,
} from '@ionic/angular';
import { SneatApiService } from '@sneat/api';
import {
  IInitUserRecordRequest,
  SneatAuthStateService,
  UserRecordService,
} from '@sneat/auth-core';
import { createSetFocusToInput } from '@sneat/ui';
import {
  AnalyticsService,
  APP_INFO,
  IAnalyticsService,
  IAppInfo,
} from '@sneat/core';
import { ErrorLogger, IErrorLogger } from '@sneat/core';
import { RandomIdService } from '@sneat/random';
import { UserCredential, sendEmailVerification } from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { safeAuthReturnPath } from '../safe-auth-return-path';

export type EmailFormSigningWith = 'email' | 'emailLink' | 'resetPassword';
export type AuthPanelInitialMode = 'sign-in' | 'sign-up';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';

@Component({
  selector: 'sneat-email-login-form',
  templateUrl: 'email-login-form.component.html',
  styleUrl: 'email-login-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    IonCard,
    IonItemDivider,
    IonSegment,
    IonSegmentButton,
    IonIcon,
    IonLabel,
    IonCardContent,
    IonItem,
    IonInput,
    IonSpinner,
    IonText,
    IonButton,
    IonButtons,
  ],
})
export class EmailLoginFormComponent implements OnInit {
  readonly returnTo = input<string | undefined>();
  /**
   * Which tab the form opens on. Defaults to 'sign-in' because most visitors are
   * returning users; pass 'sign-up' to open on the registration tab.
   */
  readonly initialMode = input<AuthPanelInitialMode | undefined>();
  readonly appInfo = inject<IAppInfo>(APP_INFO);
  private readonly analyticsService =
    inject<IAnalyticsService>(AnalyticsService);
  private readonly errorLogger = inject<IErrorLogger>(ErrorLogger);
  private readonly toastController = inject(ToastController);
  private readonly afAuth = inject(SNEAT_FIREBASE_AUTH);
  private readonly randomIdService = inject(RandomIdService);
  private readonly sneatApiService = inject(SneatApiService);
  private readonly userRecordService = inject(UserRecordService);
  private readonly authStateService = inject(SneatAuthStateService, {
    optional: true,
  });

  /** The selected tab: 'in' is Sign in (existing account), 'up' is Sign up (new account). */
  protected readonly sign = signal<'in' | 'up'>('in');
  /** Set when a sign-up attempt found the email already registered; shows a hint on the Sign in tab. */
  protected readonly existingAccountHint = signal(false);
  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly firstName = signal('');
  protected readonly lastName = signal('');
  protected readonly spaceTitle = signal('');
  protected readonly wrongPassword = signal(false);

  protected readonly signingWith = signal<EmailFormSigningWith | undefined>(
    undefined,
  );

  @Output() readonly signingWithChange = new EventEmitter<
    EmailFormSigningWith | undefined
  >();
  @Output() readonly loggedIn = new EventEmitter<UserCredential>();

  protected readonly emailInput = viewChild<IonInput>('emailInput');
  protected readonly spaceTitleInput = viewChild<IonInput>('spaceTitleInput');

  public readonly setFocusToInput = createSetFocusToInput(this.errorLogger);

  constructor() {
    const email = localStorage.getItem('emailForSignIn') || '';
    this.email.set(email);
    if (this.authStateService) {
      this.authStateService.authStatus.subscribe((status) => {
        if (status === 'notAuthenticated') {
          this.setSigningWith(undefined);
        }
      });
    }
  }

  ngOnInit(): void {
    // Sign in is the default tab. A consumer can explicitly choose the first
    // view without restricting later user toggles.
    const initialMode = this.initialMode();
    if (initialMode) {
      this.sign.set(initialMode === 'sign-in' ? 'in' : 'up');
    }
  }

  public get validEmail(): boolean {
    const email = this.email(),
      i = email?.indexOf('@');
    return i > 0 && i < email.length - 1;
  }

  public getFirebaseAuth(): Auth {
    // Since 0.27.0 the injected instance IS the firebase modular `Auth`, so the
    // `as unknown as Auth` cast this used to need (angular/angularfire#3402 —
    // @angular/fire's `Auth` was a distinct nominal class) is gone.
    return this.afAuth;
  }

  public async signUp(): Promise<void> {
    if (!this.firstName()) {
      // this.toaster.showToast('Full name is required');
      return;
    }
    // this.signingWith = 'email';
    const email = this.email().trim();
    this.email.set(email);
    const firstName = this.firstName().trim();
    const lastName = this.lastName().trim();
    if (!email) {
      alert('Email is a required field');
      return;
    }
    if (!firstName) {
      alert('First name is a required field');
      return;
    }
    if (!lastName) {
      alert('Last name is a required field');
      return;
    }
    const spaceTitle = this.spaceTitle().trim();
    this.spaceTitle.set(spaceTitle);
    if (this.appInfo.requiredSpaceType && !spaceTitle) {
      alert('Company title is a required field');
      this.setFocusToSpaceTitle();
      return;
    }
    localStorage.setItem('emailForSignIn', email);
    const password = this.randomIdService.newRandomId({ len: 9 });

    this.setSigningWith('email');
    try {
      // const auth = getAuth(getApp());
      const auth = this.getFirebaseAuth();
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      this.sendVerificationEmail(userCredential);
      userCredential.user
        ?.getIdToken()
        .then((token) => {
          this.sneatApiService.setApiAuthToken(token);
          const request: IInitUserRecordRequest = {
            authProvider: 'password',
            email,
            ianaTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            names: { firstName, lastName },
            space: this.appInfo.requiredSpaceType
              ? {
                  type: this.appInfo.requiredSpaceType,
                  title: spaceTitle,
                }
              : undefined,
          };
          this.userRecordService.initUserRecord(request).subscribe({
            next: () => this.onLoggedIn(userCredential),
            error: (err) => {
              this.analyticsService.logEvent('FailedToSetUserTitle');
              this.errorLogger.logError(err, 'Failed to set user title', {
                feedback: false,
              });
              this.onLoggedIn(userCredential);
            },
          });
        })
        .catch(
          this.errorHandler(
            'Failed to get Firebase ID token',
            'FirebaseGetIdTokenFailed',
          ),
        );
    } catch (e) {
      if ((e as FirebaseError).code === 'auth/email-already-in-use') {
        this.switchToSignInForExistingAccount();
        return;
      }
      this.handleError(
        e,
        'Failed to sign up with email',
        'FailedToSignUpWithEmail',
      );
    }
  }

  public keyupEnter(): void {
    switch (this.sign()) {
      case 'in':
        this.signIn();
        break;
      case 'up':
        this.signUp().catch(() => this.errorHandler('Failed to sign up'));
        break;
    }
  }

  /**
   * The email already has an account (a returning user landed on Sign up).
   * That is not an error: move to the Sign in tab, keep the typed email and say why.
   */
  private switchToSignInForExistingAccount(): void {
    this.analyticsService.logEvent('SignUpEmailAlreadyInUse');
    this.setSigningWith(undefined);
    this.existingAccountHint.set(true);
    this.sign.set('in');
  }

  public signIn(): void {
    this.existingAccountHint.set(false);
    this.setSigningWith('email');
    this.email.set(this.email().trim());
    this.wrongPassword.set(false);
    this.saveEmailForReuse();
    // const auth = getAuth(getApp());
    const auth = this.getFirebaseAuth();
    signInWithEmailAndPassword(auth, this.email(), this.password())
      .then((userCredential) => {
        this.onLoggedIn(userCredential); // TODO: add analytics event
      })
      .catch(
        this.errorHandler('Failed to sign in with email & password', 'email'),
      );
  }

  private saveEmailForReuse(): void {
    localStorage.setItem('emailForSignIn', this.email());
  }

  public sendSignInLink(): void {
    this.setSigningWith('emailLink');
    this.email.set(this.email().trim());
    this.saveEmailForReuse();
    const actionURL = new URL('sign-in-from-email-link', document.baseURI);
    const returnTo = safeAuthReturnPath(this.returnTo());
    if (returnTo) actionURL.searchParams.set('returnTo', returnTo);
    sendSignInLinkToEmail(this.afAuth, this.email(), {
      url: actionURL.toString(),
      handleCodeInApp: true,
    })
      .then(() => {
        this.showToast(`Sign-in link has been sent to email: ${this.email()}`);
        this.setSigningWith(undefined);
      })
      .catch(
        this.errorHandler(
          'Failed to send sign in link to email',
          'FailedToSendSignInLinkToEmail',
        ),
      );
  }

  private showToast(message: string): void {
    this.toastController
      .create({
        message,
        position: 'middle',
        keyboardClose: true,
        duration: 3000,
        color: 'tertiary',
        icon: 'send-outline',
        buttons: [{ icon: 'close', role: 'cancel' }],
      })
      .then((toast) => {
        toast
          .present()
          .catch(
            this.errorLogger.logErrorHandler(
              'Failed to present toast about password reset email sent success',
            ),
          );
      });
  }

  public resetPassword(): void {
    this.setSigningWith('resetPassword');
    sendPasswordResetEmail(this.afAuth, this.email())
      .then(() => {
        this.setSigningWith(undefined);
        this.showToast(
          `Password reset link has been sent to email: ${this.email()}`,
        );
      })
      .catch(
        this.errorHandler(
          'Failed to send password reset email',
          'FailedToSendPasswordResetEmail',
        ),
      );
  }

  private sendVerificationEmail(userCredential: UserCredential): void {
    setTimeout(async () => {
      try {
        await sendEmailVerification(userCredential.user);
      } catch (e) {
        this.handleError(e, 'Failed to send verification email');
      }
    });
  }

  private onLoggedIn(userCredential: UserCredential): void {
    this.setSigningWith(undefined);
    this.loggedIn.emit(userCredential);
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
    this.setSigningWith(undefined);
    if (eventName) {
      this.analyticsService.logEvent(eventName, eventParams);
    }
    if ((err as FirebaseError).code === 'auth/wrong-password') {
      this.wrongPassword.set(true);
      return;
    }
    this.errorLogger.logError(err, m, {
      report: !(err as { code: unknown }).code,
    });
  }

  private setSigningWith(signingWith?: EmailFormSigningWith): void {
    this.signingWith.set(signingWith);
    this.signingWithChange.emit(signingWith);
  }

  signChanged(): void {
    if (this.sign() === 'up') {
      this.existingAccountHint.set(false);
    }
    this.setFocusToEmail();
  }

  ionViewDidEnter(): void {
    this.setSigningWith(undefined);
    this.setFocusToEmail();
  }

  // Focus is deliberately not moved (the inputs are not referenced from the template, and a programmatic focus
  // opens the on-screen keyboard on mobile). These used to call setFocusToInput(undefined), which only logged
  // "can not set focus to undefined input" to the console, three times on every login page.
  private setFocusToEmail(): void {
    // no-op
  }

  private setFocusToSpaceTitle(): void {
    // no-op
  }
}
