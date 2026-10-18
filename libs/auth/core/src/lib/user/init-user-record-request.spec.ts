import type { UserInfo } from 'firebase/auth';
import type { ISneatAuthUser } from '../sneat-auth-state-service';
import {
  INIT_USER_RECORD_AUTH_PROVIDERS,
  initUserRecordAuthProvider,
  initUserRecordRequestFromAuthUser,
} from './init-user-record-request';

const info = (providerId: string, email: string | null = null): UserInfo => ({
  providerId,
  uid: `${providerId}-uid`,
  email,
  displayName: null,
  phoneNumber: null,
  photoURL: null,
});

const user = (overrides: Partial<ISneatAuthUser> = {}): ISneatAuthUser => ({
  uid: 'u1',
  email: 'founder@example.test',
  emailVerified: true,
  displayName: null,
  phoneNumber: null,
  photoURL: null,
  isAnonymous: false,
  providerId: 'google.com',
  providerData: [info('google.com', 'founder@example.test')],
  ...overrides,
});

describe('initUserRecordAuthProvider', () => {
  it('reports the single linked provider', () => {
    expect(initUserRecordAuthProvider(user())).toBe('google.com');
  });

  it('never reports "firebase", which the server rejects with 400: an account with several providers reports the first it knows', () => {
    expect(
      initUserRecordAuthProvider(
        user({
          providerId: 'firebase',
          providerData: [info('github.com'), info('google.com')],
        }),
      ),
    ).toBe('github.com');
  });

  it('skips linked providers the server does not know', () => {
    expect(
      initUserRecordAuthProvider(
        user({
          providerId: 'firebase',
          providerData: [info('oidc.keycloak'), info('password')],
        }),
      ),
    ).toBe('password');
  });

  it('leaves the provider out when none is known or there is none', () => {
    expect(
      initUserRecordAuthProvider(
        user({ providerId: 'firebase', providerData: [info('saml.corp')] }),
      ),
    ).toBeUndefined();
    expect(
      initUserRecordAuthProvider({
        providerId: 'firebase',
        providerData: undefined as never,
      }),
    ).toBeUndefined();
  });

  it('knows every provider the server accepts, and not Firebase', () => {
    expect(INIT_USER_RECORD_AUTH_PROVIDERS).toContain('google.com');
    expect(INIT_USER_RECORD_AUTH_PROVIDERS).not.toContain('firebase');
  });
});

describe('initUserRecordRequestFromAuthUser', () => {
  it('sends email, verification, provider and the display name as full name', () => {
    expect(
      initUserRecordRequestFromAuthUser(user({ displayName: 'Founder F' })),
    ).toEqual({
      email: 'founder@example.test',
      emailIsVerified: true,
      authProvider: 'google.com',
      names: { fullName: 'Founder F' },
    });
  });

  it('sends no names when the account has no display name', () => {
    expect(initUserRecordRequestFromAuthUser(user())).not.toHaveProperty(
      'names',
    );
  });

  it('takes the email from a linked provider when the account has none (GitHub with a private primary address)', () => {
    const request = initUserRecordRequestFromAuthUser(
      user({
        email: null,
        providerId: 'firebase',
        providerData: [
          info('github.com'),
          info('google.com', 'g@example.test'),
        ],
      }),
    );
    expect(request.email).toBe('g@example.test');
    expect(request.authProvider).toBe('github.com');
  });

  it('leaves the email out when no provider holds one', () => {
    const request = initUserRecordRequestFromAuthUser(
      user({ email: null, providerData: [info('google.com')] }),
    );
    expect(request.email).toBeUndefined();
    const noData = initUserRecordRequestFromAuthUser(
      user({ email: null, providerData: undefined as never }),
    );
    expect(noData.email).toBeUndefined();
  });
});
