import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonInput,
  IonItem,
  IonNote,
  IonSpinner,
  IonText,
} from '@ionic/angular';
import { FirebaseError } from 'firebase/app';
import {
  PhoneVerificationService,
  PhoneVerificationStateError,
} from './phone-verification.service';

type PendingAction = 'sending' | 'verifying';

@Component({
  selector: 'sneat-phone-verification',
  templateUrl: './phone-verification.component.html',
  styleUrl: './phone-verification.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    IonButton,
    IonInput,
    IonItem,
    IonNote,
    IonSpinner,
    IonText,
  ],
  providers: [PhoneVerificationService],
})
export class PhoneVerificationComponent implements OnDestroy {
  private readonly phoneVerification = inject(PhoneVerificationService);
  private readonly recaptchaContainer =
    viewChild<ElementRef<HTMLDivElement>>('recaptchaContainer');

  readonly verified = output<void>();

  protected readonly phoneNumber = signal(
    this.phoneVerification.currentPhoneNumber,
  );
  protected readonly verificationCode = signal('');
  protected readonly verificationId = signal<string | undefined>(undefined);
  protected readonly verifiedPhoneNumber = signal<string | undefined>(
    undefined,
  );
  protected readonly pending = signal<PendingAction | undefined>(undefined);
  protected readonly errorMessage = signal<string | undefined>(undefined);

  protected get isPhoneNumberValid(): boolean {
    return /^\+[1-9]\d{7,14}$/.test(this.phoneNumber().trim());
  }

  protected get isVerificationCodeValid(): boolean {
    return /^\d{6}$/.test(this.verificationCode().trim());
  }

  protected async requestCode(): Promise<void> {
    if (this.pending()) return;
    const phoneNumber = this.phoneNumber().trim();
    this.phoneNumber.set(phoneNumber);
    if (!this.isPhoneNumberValid) {
      this.errorMessage.set(
        'Enter a valid international phone number, including the country code.',
      );
      return;
    }
    const container = this.recaptchaContainer()?.nativeElement;
    if (!container) {
      this.errorMessage.set(
        'Phone verification is temporarily unavailable. Please try again.',
      );
      return;
    }

    this.errorMessage.set(undefined);
    this.pending.set('sending');
    try {
      const verificationId = await this.phoneVerification.requestCode(
        phoneNumber,
        container,
      );
      this.verificationId.set(verificationId);
      this.verificationCode.set('');
    } catch (error) {
      this.errorMessage.set(this.safeErrorMessage(error));
    } finally {
      this.pending.set(undefined);
    }
  }

  protected async verifyCode(): Promise<void> {
    if (this.pending()) return;
    const verificationId = this.verificationId();
    const code = this.verificationCode().trim();
    this.verificationCode.set(code);
    if (!verificationId) {
      this.errorMessage.set('Request a new verification code.');
      return;
    }
    if (!this.isVerificationCodeValid) {
      this.errorMessage.set('Enter the six-digit code from the SMS.');
      return;
    }

    this.errorMessage.set(undefined);
    this.pending.set('verifying');
    try {
      await this.phoneVerification.verifyCode(verificationId, code);
      this.verifiedPhoneNumber.set(this.phoneNumber());
      this.verificationId.set(undefined);
      this.verificationCode.set('');
      this.verified.emit();
    } catch (error) {
      this.errorMessage.set(this.safeErrorMessage(error));
    } finally {
      this.pending.set(undefined);
    }
  }

  protected useAnotherNumber(): void {
    if (this.pending()) return;
    this.phoneVerification.reset();
    this.verificationId.set(undefined);
    this.verificationCode.set('');
    this.errorMessage.set(undefined);
  }

  ngOnDestroy(): void {
    this.phoneVerification.reset();
  }

  private safeErrorMessage(error: unknown): string {
    if (error instanceof PhoneVerificationStateError) {
      return error.code === 'user-changed'
        ? 'Your sign-in changed. Start phone verification again.'
        : 'Sign in with your account before verifying a phone number.';
    }
    if (!(error instanceof FirebaseError)) {
      return 'Phone verification failed. Please try again.';
    }
    switch (error.code) {
      case 'auth/invalid-phone-number':
      case 'auth/missing-phone-number':
        return 'Enter a valid international phone number, including the country code.';
      case 'auth/invalid-verification-code':
        return 'That verification code is not correct. Check the SMS and try again.';
      case 'auth/code-expired':
      case 'auth/session-expired':
        return 'That code has expired. Request a new verification code.';
      case 'auth/credential-already-in-use':
      case 'auth/account-exists-with-different-credential':
        return 'That phone number is already linked to another account.';
      case 'auth/requires-recent-login':
        return 'For security, sign in again before changing your phone number.';
      case 'auth/quota-exceeded':
      case 'auth/too-many-requests':
        return 'Too many verification attempts. Please wait before trying again.';
      default:
        return 'Phone verification failed. Please try again.';
    }
  }
}
