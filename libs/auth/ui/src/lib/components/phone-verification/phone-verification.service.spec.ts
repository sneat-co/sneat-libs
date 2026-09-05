import { TestBed } from '@angular/core/testing';
import { SNEAT_FIREBASE_AUTH } from '@sneat/core';
import { Auth, User } from 'firebase/auth';
import {
  PHONE_AUTH_ADAPTER,
  PhoneVerificationService,
  PhoneVerificationStateError,
} from './phone-verification.service';

describe('PhoneVerificationService', () => {
  const user = {
    uid: 'user-1',
    isAnonymous: false,
    phoneNumber: null,
  } as User;
  const auth = { currentUser: user } as Auth;
  const verifier = { clear: vi.fn(), type: 'recaptcha', verify: vi.fn() };
  const credential = { providerId: 'phone', signInMethod: 'phone' };
  const adapter = {
    createRecaptcha: vi.fn(() => verifier),
    getCredential: vi.fn(() => credential),
    getIdToken: vi.fn().mockResolvedValue('refreshed-token'),
    updatePhoneNumber: vi.fn().mockResolvedValue(undefined),
    verifyPhoneNumber: vi.fn().mockResolvedValue('verification-1'),
  };

  let service: PhoneVerificationService;

  beforeEach(() => {
    vi.clearAllMocks();
    auth.currentUser = user;
    TestBed.configureTestingModule({
      providers: [
        PhoneVerificationService,
        { provide: SNEAT_FIREBASE_AUTH, useValue: auth },
        { provide: PHONE_AUTH_ADAPTER, useValue: adapter },
      ],
    });
    service = TestBed.inject(PhoneVerificationService);
  });

  it('verifies a phone credential on the same signed-in user and refreshes its token', async () => {
    const container = document.createElement('div');

    await expect(
      service.requestCode('+353871234567', container),
    ).resolves.toBe('verification-1');
    await service.verifyCode('verification-1', '123456');

    expect(adapter.createRecaptcha).toHaveBeenCalledWith(auth, container);
    expect(adapter.verifyPhoneNumber).toHaveBeenCalledWith(
      auth,
      '+353871234567',
      verifier,
    );
    expect(verifier.clear).toHaveBeenCalledOnce();
    expect(adapter.getCredential).toHaveBeenCalledWith(
      'verification-1',
      '123456',
    );
    expect(adapter.updatePhoneNumber).toHaveBeenCalledWith(user, credential);
    expect(adapter.getIdToken).toHaveBeenCalledWith(user);
  });

  it('refuses anonymous users before requesting an SMS', async () => {
    auth.currentUser = { ...user, isAnonymous: true } as User;

    await expect(
      service.requestCode('+353871234567', document.createElement('div')),
    ).rejects.toMatchObject<PhoneVerificationStateError>({
      code: 'anonymous-user',
    });
    expect(adapter.verifyPhoneNumber).not.toHaveBeenCalled();
  });

  it('does not attach a verified number after the signed-in user changes', async () => {
    await service.requestCode(
      '+353871234567',
      document.createElement('div'),
    );
    auth.currentUser = { ...user, uid: 'user-2' } as User;

    await expect(
      service.verifyCode('verification-1', '123456'),
    ).rejects.toMatchObject<PhoneVerificationStateError>({
      code: 'user-changed',
    });
    expect(adapter.updatePhoneNumber).not.toHaveBeenCalled();
  });

  it('clears reCAPTCHA when an SMS request fails and can retry', async () => {
    adapter.verifyPhoneNumber
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce('verification-2');

    await expect(
      service.requestCode('+353871234567', document.createElement('div')),
    ).rejects.toThrow('network');
    await expect(
      service.requestCode('+353871234567', document.createElement('div')),
    ).resolves.toBe('verification-2');

    expect(verifier.clear).toHaveBeenCalledTimes(2);
    expect(adapter.createRecaptcha).toHaveBeenCalledTimes(2);
  });
});
