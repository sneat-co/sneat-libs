import { inject, Injectable, InjectionToken, NgZone, OnDestroy } from '@angular/core';
import { SNEAT_FIREBASE_AUTH } from '@sneat/core';
import {
  ApplicationVerifier,
  Auth,
  getIdToken,
  PhoneAuthCredential,
  PhoneAuthProvider,
  RecaptchaVerifier,
  updatePhoneNumber,
  User,
} from 'firebase/auth';

interface PhoneAuthAdapter {
  createRecaptcha(auth: Auth, container: HTMLElement): RecaptchaVerifier;
  getCredential(verificationId: string, code: string): PhoneAuthCredential;
  getIdToken(user: User): Promise<string>;
  updatePhoneNumber(user: User, credential: PhoneAuthCredential): Promise<void>;
  verifyPhoneNumber(
    auth: Auth,
    phoneNumber: string,
    verifier: ApplicationVerifier,
  ): Promise<string>;
}

export const PHONE_AUTH_ADAPTER = new InjectionToken<PhoneAuthAdapter>(
  'PHONE_AUTH_ADAPTER',
  {
    providedIn: 'root',
    factory: (): PhoneAuthAdapter => ({
      createRecaptcha: (auth, container) =>
        new RecaptchaVerifier(auth, container, { size: 'normal' }),
      getCredential: (verificationId, code) =>
        PhoneAuthProvider.credential(verificationId, code),
      getIdToken: (user) => getIdToken(user, true),
      updatePhoneNumber,
      verifyPhoneNumber: (auth, phoneNumber, verifier) =>
        new PhoneAuthProvider(auth).verifyPhoneNumber(phoneNumber, verifier),
    }),
  },
);

export class PhoneVerificationStateError extends Error {
  constructor(readonly code: 'no-user' | 'anonymous-user' | 'user-changed') {
    super(code);
  }
}

@Injectable()
export class PhoneVerificationService implements OnDestroy {
  private readonly auth = inject(SNEAT_FIREBASE_AUTH);
  private readonly adapter = inject(PHONE_AUTH_ADAPTER);
  private readonly zone = inject(NgZone);

  private recaptcha?: RecaptchaVerifier;
  private verificationUserUid?: string;

  get currentPhoneNumber(): string {
    return this.auth.currentUser?.phoneNumber ?? '';
  }

  async requestCode(
    phoneNumber: string,
    recaptchaContainer: HTMLElement,
  ): Promise<string> {
    const user = this.requireEligibleUser();
    this.verificationUserUid = user.uid;
    this.clearRecaptcha();
    try {
      this.recaptcha = this.zone.runOutsideAngular(() =>
        this.adapter.createRecaptcha(this.auth, recaptchaContainer),
      );
      return await this.zone.runOutsideAngular(() =>
        this.adapter.verifyPhoneNumber(
          this.auth,
          phoneNumber,
          this.recaptcha as RecaptchaVerifier,
        ),
      );
    } catch (error) {
      this.verificationUserUid = undefined;
      throw error;
    } finally {
      this.clearRecaptcha();
    }
  }

  async verifyCode(verificationId: string, code: string): Promise<void> {
    const user = this.requireEligibleUser();
    if (!this.verificationUserUid || user.uid !== this.verificationUserUid) {
      throw new PhoneVerificationStateError('user-changed');
    }
    const credential = this.adapter.getCredential(verificationId, code);
    await this.zone.runOutsideAngular(() =>
      this.adapter.updatePhoneNumber(user, credential),
    );
    await this.zone.runOutsideAngular(() => this.adapter.getIdToken(user));
    this.verificationUserUid = undefined;
  }

  reset(): void {
    this.verificationUserUid = undefined;
    this.clearRecaptcha();
  }

  ngOnDestroy(): void {
    this.reset();
  }

  private requireEligibleUser(): User {
    const user = this.auth.currentUser;
    if (!user) {
      throw new PhoneVerificationStateError('no-user');
    }
    if (user.isAnonymous) {
      throw new PhoneVerificationStateError('anonymous-user');
    }
    return user;
  }

  private clearRecaptcha(): void {
    this.recaptcha?.clear();
    this.recaptcha = undefined;
  }
}
