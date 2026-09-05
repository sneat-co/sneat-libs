import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FirebaseError } from 'firebase/app';
import { PhoneVerificationComponent } from './phone-verification.component';
import {
  PhoneVerificationService,
  PhoneVerificationStateError,
} from './phone-verification.service';

describe('PhoneVerificationComponent', () => {
  const phoneVerification = {
    currentPhoneNumber: '',
    requestCode: vi.fn().mockResolvedValue('verification-1'),
    reset: vi.fn(),
    verifyCode: vi.fn().mockResolvedValue(undefined),
  };
  let fixture: ComponentFixture<PhoneVerificationComponent>;
  let component: PhoneVerificationComponent;
  let view: {
    errorMessage: { (): string | undefined };
    phoneNumber: { (): string; set(value: string): void };
    requestCode(): Promise<void>;
    useAnotherNumber(): void;
    verificationCode: { (): string; set(value: string): void };
    verificationId: { (): string | undefined };
    verifyCode(): Promise<void>;
    verifiedPhoneNumber: { (): string | undefined };
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [PhoneVerificationComponent],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
      .overrideComponent(PhoneVerificationComponent, {
        set: {
          imports: [],
          providers: [
            { provide: PhoneVerificationService, useValue: phoneVerification },
          ],
          schemas: [CUSTOM_ELEMENTS_SCHEMA],
          template: '<div #recaptchaContainer></div>',
        },
      })
      .compileComponents();
    fixture = TestBed.createComponent(PhoneVerificationComponent);
    component = fixture.componentInstance;
    view = component as unknown as typeof view;
    fixture.detectChanges();
  });

  it('requests an SMS, verifies the code, and emits completion', async () => {
    const completed = vi.fn();
    component.verified.subscribe(completed);
    view.phoneNumber.set(' +353871234567 ');

    await view.requestCode();
    expect(phoneVerification.requestCode).toHaveBeenCalledWith(
      '+353871234567',
      expect.any(HTMLElement),
    );
    expect(view.verificationId()).toBe('verification-1');

    view.verificationCode.set('123456');
    await view.verifyCode();
    expect(phoneVerification.verifyCode).toHaveBeenCalledWith(
      'verification-1',
      '123456',
    );
    expect(view.verifiedPhoneNumber()).toBe('+353871234567');
    expect(completed).toHaveBeenCalledOnce();
  });

  it('validates E.164 input before contacting Firebase', async () => {
    view.phoneNumber.set('087 123 4567');

    await view.requestCode();

    expect(phoneVerification.requestCode).not.toHaveBeenCalled();
    expect(view.errorMessage()).toContain('international phone number');
  });

  it('shows safe retryable messages for Firebase and session errors', async () => {
    view.phoneNumber.set('+353871234567');
    phoneVerification.requestCode.mockRejectedValueOnce(
      new FirebaseError('auth/too-many-requests', 'internal detail'),
    );
    await view.requestCode();
    expect(view.errorMessage()).toContain('wait before trying again');

    phoneVerification.requestCode.mockRejectedValueOnce(
      new PhoneVerificationStateError('anonymous-user'),
    );
    await view.requestCode();
    expect(view.errorMessage()).toContain('Sign in with your account');
    expect(view.errorMessage()).not.toContain('internal detail');
  });

  it('resets the pending verification when another number is chosen', async () => {
    view.phoneNumber.set('+353871234567');
    await view.requestCode();

    view.useAnotherNumber();

    expect(phoneVerification.reset).toHaveBeenCalled();
    expect(view.verificationId()).toBeUndefined();
  });

  it('cleans verification state when destroyed', () => {
    fixture.destroy();
    expect(phoneVerification.reset).toHaveBeenCalled();
  });
});
