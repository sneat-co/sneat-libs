import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import {
  IonButton,
  IonCard,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonTitle,
  IonToolbar,
  NavController,
} from '@ionic/angular/standalone';
import { SneatAuthStateService } from '@sneat/auth-core';
import { ErrorLogger, IErrorLogger } from '@sneat/core';

@Component({
  selector: 'sneat-sign-in-from-email-link-page',
  templateUrl: 'sign-in-from-email-link-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonCard,
    IonItem,
    IonIcon,
    IonInput,
    IonButton,
    IonLabel,
  ],
})
export class SignInFromEmailLinkPageComponent {
  private readonly errorLogger = inject<IErrorLogger>(ErrorLogger);
  private readonly authStateService = inject(SneatAuthStateService);
  private readonly navController = inject(NavController);

  protected readonly email = signal('');
  protected readonly emailFromStorage = signal(false);
  protected readonly isSigning = signal(false);

  constructor() {
    const email = localStorage.getItem('emailForSignIn') || '';
    this.email.set(email);
    this.emailFromStorage.set(!!email);
    if (email) {
      this.signIn();
    }
  }

  public signIn(): void {
    this.isSigning.set(true);
    this.authStateService.signInWithEmailLink(this.email()).subscribe({
      next: () => {
        this.navController
          .navigateRoot('/')
          .catch(
            this.errorLogger.logErrorHandler(
              'Failed to navigate to root page after signing in with email link',
            ),
          );
      },
      error: (err) => {
        this.isSigning.set(false);
        this.emailFromStorage.set(false);
        this.errorLogger.logError(err, 'Failed to sign in with email link');
      },
    });
  }
}
