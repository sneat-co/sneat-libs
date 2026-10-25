import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ACCOUNT_EXISTS_WITH_DIFFERENT_CREDENTIAL,
  PENDING_CREDENTIAL_LINK_STORAGE_KEY,
  PENDING_CREDENTIAL_LINK_TTL_MS,
  authProviderTitle,
  clearPendingCredentialLink,
  credentialOfPendingLink,
  isAccountExistsWithDifferentCredential,
  loadPendingCredentialLink,
  pendingCredentialLinkFromError,
  savePendingCredentialLink,
} from './pending-credential-link';

const { credentialFromError, fromJSON } = vi.hoisted(() => ({
  credentialFromError: vi.fn(),
  fromJSON: vi.fn(),
}));

vi.mock('firebase/auth', () => {
  const provider = (id: string) => ({
    credentialFromError: (err: unknown) => credentialFromError(id, err),
  });
  return {
    GithubAuthProvider: provider('github.com'),
    GoogleAuthProvider: provider('google.com'),
    FacebookAuthProvider: provider('facebook.com'),
    OAuthProvider: provider('oauth'),
    OAuthCredential: { fromJSON },
  };
});

const conflict = (providerId?: string, email?: string) => ({
  code: ACCOUNT_EXISTS_WITH_DIFFERENT_CREDENTIAL,
  customData: { email, _tokenResponse: { providerId } },
});

const fakeCredential = (providerId: string) => ({
  providerId,
  toJSON: () => ({ providerId, accessToken: 't' }),
});

describe('pending-credential-link', () => {
  beforeEach(() => {
    localStorage.clear();
    credentialFromError.mockReset();
    fromJSON.mockReset();
  });

  it('recognises only the account-exists error', () => {
    expect(isAccountExistsWithDifferentCredential(conflict())).toBe(true);
    expect(isAccountExistsWithDifferentCredential({ code: 'x' })).toBe(false);
    expect(isAccountExistsWithDifferentCredential(undefined)).toBe(false);
  });

  it('returns undefined for other errors without reading a credential', () => {
    expect(pendingCredentialLinkFromError({ code: 'x' })).toBeUndefined();
    expect(credentialFromError).not.toHaveBeenCalled();
  });

  it.each([
    ['github.com', 'github.com'],
    ['google.com', 'google.com'],
    ['facebook.com', 'facebook.com'],
    ['microsoft.com', 'oauth'],
  ])('reads a %s credential with the matching provider class', (id, reader) => {
    credentialFromError.mockReturnValue(fakeCredential(id));
    const err = conflict(id, 'a@b.c');
    expect(pendingCredentialLinkFromError(err, 5)).toEqual({
      providerId: id,
      email: 'a@b.c',
      createdAt: 5,
      credential: { providerId: id, accessToken: 't' },
    });
    expect(credentialFromError).toHaveBeenCalledWith(reader, err);
  });

  it('returns undefined when Firebase gave no credential', () => {
    credentialFromError.mockReturnValue(null);
    expect(
      pendingCredentialLinkFromError(conflict('github.com')),
    ).toBeUndefined();
  });

  it('saves, loads and clears a link', () => {
    const link = {
      providerId: 'github.com',
      email: 'a@b.c',
      createdAt: 1000,
      credential: { a: 1 },
    };
    savePendingCredentialLink(link);
    expect(loadPendingCredentialLink(1000)).toEqual(link);
    clearPendingCredentialLink();
    expect(loadPendingCredentialLink(1000)).toBeUndefined();
  });

  it('drops an expired link', () => {
    savePendingCredentialLink({
      providerId: 'github.com',
      createdAt: 0,
      credential: {},
    });
    expect(
      loadPendingCredentialLink(PENDING_CREDENTIAL_LINK_TTL_MS + 1),
    ).toBeUndefined();
    expect(
      localStorage.getItem(PENDING_CREDENTIAL_LINK_STORAGE_KEY),
    ).toBeNull();
  });

  it('drops a malformed link', () => {
    localStorage.setItem(PENDING_CREDENTIAL_LINK_STORAGE_KEY, '{"x":1}');
    expect(loadPendingCredentialLink()).toBeUndefined();
    expect(
      localStorage.getItem(PENDING_CREDENTIAL_LINK_STORAGE_KEY),
    ).toBeNull();
    localStorage.setItem(PENDING_CREDENTIAL_LINK_STORAGE_KEY, 'not json');
    expect(loadPendingCredentialLink()).toBeUndefined();
  });

  it('survives blocked storage', () => {
    const spy = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new Error('blocked');
      });
    expect(() =>
      savePendingCredentialLink({
        providerId: 'github.com',
        createdAt: 0,
        credential: {},
      }),
    ).not.toThrow();
    spy.mockRestore();
    const removeSpy = vi
      .spyOn(Storage.prototype, 'removeItem')
      .mockImplementation(() => {
        throw new Error('blocked');
      });
    expect(() => clearPendingCredentialLink()).not.toThrow();
    removeSpy.mockRestore();
    const getterSpy = vi
      .spyOn(globalThis, 'localStorage', 'get')
      .mockImplementation(() => {
        throw new Error('denied');
      });
    expect(loadPendingCredentialLink()).toBeUndefined();
    getterSpy.mockRestore();
  });

  it('restores the credential from JSON', () => {
    fromJSON.mockReturnValue('cred');
    expect(
      credentialOfPendingLink({
        providerId: 'github.com',
        createdAt: 0,
        credential: { a: 1 },
      }),
    ).toBe('cred');
    expect(fromJSON).toHaveBeenCalledWith({ a: 1 });
    fromJSON.mockReturnValue(null);
    expect(
      credentialOfPendingLink({
        providerId: 'github.com',
        createdAt: 0,
        credential: {},
      }),
    ).toBeUndefined();
  });

  it('names providers for messages', () => {
    expect(authProviderTitle('github.com')).toBe('GitHub');
    expect(authProviderTitle('google.com')).toBe('Google');
    expect(authProviderTitle('facebook.com')).toBe('Facebook');
    expect(authProviderTitle('microsoft.com')).toBe('Microsoft');
    expect(authProviderTitle('apple.com')).toBe('Apple');
    expect(authProviderTitle('x.com')).toBe('x.com');
  });
});
