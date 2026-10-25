import { TestBed } from '@angular/core/testing';
import {
  AnalyticsService,
  ErrorLogger,
  SNEAT_FIREBASE_AUTH,
  SneatUrlOperationBlocker,
} from '@sneat/core';
import {
  SneatAuthStateService,
  AuthStatuses,
  ISneatAuthState,
} from './sneat-auth-state-service';
import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { firstValueFrom, Observer } from 'rxjs';
import {
  User,
  UserCredential,
  linkWithCredential,
  signInWithPopup,
} from 'firebase/auth';
import {
  credentialOfPendingLink,
  pendingCredentialLinkFromError,
  savePendingCredentialLink,
} from './pending-credential-link';

// Mock Capacitor
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn().mockReturnValue(false),
  },
}));

// Mock Firebase Authentication
vi.mock('@capacitor-firebase/authentication', () => ({
  FirebaseAuthentication: {
    signInWithGoogle: vi.fn(),
    signInWithApple: vi.fn(),
    signInWithFacebook: vi.fn(),
    signInWithMicrosoft: vi.fn(),
  },
}));

// Mock firebase/auth with proper constructor mocks
vi.mock('firebase/auth', () => {
  class MockGoogleAuthProvider {}
  class MockOAuthProvider {
    credential = vi.fn();
  }
  class MockGithubAuthProvider {
    addScope = vi.fn();
  }
  class MockFacebookAuthProvider {
    addScope = vi.fn();
  }

  return {
    GoogleAuthProvider: MockGoogleAuthProvider,
    OAuthProvider: MockOAuthProvider,
    GithubAuthProvider: MockGithubAuthProvider,
    FacebookAuthProvider: MockFacebookAuthProvider,
    signInWithEmailLink: vi.fn().mockResolvedValue({ user: { uid: 'test' } }),
    signInWithCustomToken: vi.fn().mockResolvedValue({ user: { uid: 'test' } }),
    signInWithPopup: vi.fn().mockResolvedValue({ user: { uid: 'test' } }),
    linkWithPopup: vi.fn().mockResolvedValue({ user: { uid: 'test' } }),
    linkWithCredential: vi.fn(),
    unlink: vi.fn().mockResolvedValue({ uid: 'test', providerData: [] }),
    signInWithCredential: vi.fn().mockResolvedValue({ user: { uid: 'test' } }),
    createUserWithEmailAndPassword: vi.fn(),
    signInWithEmailAndPassword: vi.fn(),
    getAuth: vi.fn().mockReturnValue({}),
  };
});

vi.mock('./pending-credential-link', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./pending-credential-link')>()),
  pendingCredentialLinkFromError: vi.fn(),
  credentialOfPendingLink: vi.fn().mockReturnValue('restored-credential'),
}));

describe('SneatAuthStateService', () => {
  let service: SneatAuthStateService;
  let authMock: {
    onIdTokenChanged: Mock;
    onAuthStateChanged: Mock;
    signOut: Mock;
    currentUser: User | null;
  };
  let onAuthStateChangedCallback: Observer<User | null>;
  let onIdTokenChangedCallback: Observer<User | null>;
  let operationBlockerMock: { isBlocked: Mock };

  beforeEach(() => {
    // The service reads any pending credential link when it is created.
    localStorage.clear();
    operationBlockerMock = {
      isBlocked: vi.fn().mockReturnValue(false),
    };
    authMock = {
      onIdTokenChanged: vi.fn().mockImplementation((obs) => {
        onIdTokenChangedCallback = obs;
      }),
      onAuthStateChanged: vi.fn().mockImplementation((obs) => {
        onAuthStateChangedCallback = obs;
      }),
      signOut: vi.fn().mockResolvedValue(undefined),
      currentUser: null,
    };

    TestBed.configureTestingModule({
      providers: [
        SneatAuthStateService,
        {
          provide: ErrorLogger,
          useValue: { logError: vi.fn(), logErrorHandler: () => vi.fn() },
        },
        {
          provide: AnalyticsService,
          useValue: {
            identify: vi.fn(),
            logEvent: vi.fn(),
          },
        },
        {
          provide: SNEAT_FIREBASE_AUTH,
          useValue: authMock,
        },
        {
          provide: SneatUrlOperationBlocker,
          useValue: operationBlockerMock,
        },
      ],
    });
    service = TestBed.inject(SneatAuthStateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should update auth status when onAuthStateChanged triggers', async () => {
    const fbUser = {
      uid: 'u1',
      isAnonymous: false,
      emailVerified: true,
      email: 'test@example.com',
      providerId: 'password',
      providerData: [],
    };

    onAuthStateChangedCallback.next(fbUser as unknown as User);

    const status = await firstValueFrom(service.authStatus);
    expect(status).toBe(AuthStatuses.authenticated);

    const user = await firstValueFrom(service.authUser);
    expect(user?.uid).toBe('u1');
  });

  it('keeps auth state pending and suppresses Firebase events when auth is blocked', async () => {
    operationBlockerMock.isBlocked.mockImplementation(
      (operation) => operation === 'auth',
    );
    const fbUser = {
      uid: 'blocked-user',
      isAnonymous: false,
      emailVerified: true,
      email: 'blocked@example.com',
      providerId: 'password',
      providerData: [],
      getIdToken: vi.fn().mockResolvedValue('must-not-be-read'),
    };

    onAuthStateChangedCallback.next(fbUser as unknown as User);
    onIdTokenChangedCallback.next(fbUser as unknown as User);

    await Promise.resolve();
    expect(await firstValueFrom(service.authState)).toEqual({
      status: AuthStatuses.authenticating,
      loadingPhase: 'checking-session',
    });
    expect(await firstValueFrom(service.authUser)).toBeUndefined();
    expect(fbUser.getIdToken).not.toHaveBeenCalled();
  });

  it('should call fbAuth.signOut when signOut is called', async () => {
    await service.signOut();
    expect(authMock.signOut).toHaveBeenCalled();
  });

  it('should handle null user in onAuthStateChanged', async () => {
    onAuthStateChangedCallback.next(null);

    const status = await firstValueFrom(service.authStatus);
    expect(status).toBe(AuthStatuses.notAuthenticated);

    const user = await firstValueFrom(service.authUser);
    expect(user).toBeNull();
  });

  it('should handle user with multiple providerData', async () => {
    const fbUser = {
      uid: 'u2',
      isAnonymous: false,
      emailVerified: true,
      email: 'multi@example.com',
      providerId: 'firebase',
      providerData: [
        { providerId: 'google.com', uid: 'g123' },
        { providerId: 'facebook.com', uid: 'f456' },
      ],
    };

    onAuthStateChangedCallback.next(fbUser as unknown as User);

    const user = await firstValueFrom(service.authUser);
    expect(user?.uid).toBe('u2');
    expect(user?.providerId).toBe('firebase');
  });

  it('should handle user with single providerData', async () => {
    const fbUser = {
      uid: 'u3',
      isAnonymous: false,
      emailVerified: true,
      email: 'single@example.com',
      providerId: 'firebase',
      providerData: [{ providerId: 'google.com', uid: 'g789' }],
    };

    onAuthStateChangedCallback.next(fbUser as unknown as User);

    const user = await firstValueFrom(service.authUser);
    expect(user?.providerId).toBe('google.com');
  });

  it('should handle onIdTokenChanged with authenticated user', async () => {
    const fbUser = {
      uid: 'u4',
      isAnonymous: false,
      emailVerified: true,
      email: 'token@example.com',
      providerId: 'google.com',
      providerData: [],
      getIdToken: vi.fn().mockResolvedValue('mock-token-123'),
    };

    authMock.currentUser = fbUser as unknown as User;
    // First set auth user
    onAuthStateChangedCallback.next(fbUser as unknown as User);

    // Then trigger token changed
    onIdTokenChangedCallback.next(fbUser as unknown as User);

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 10));

    const state = await firstValueFrom(service.authState);
    expect(state.status).toBe(AuthStatuses.authenticated);
    expect(state.token).toBe('mock-token-123');
  });

  it('publishes a same-UID anonymous upgrade to both current identity streams', async () => {
    const anonymousUser = {
      uid: 'same-uid',
      isAnonymous: true,
      email: null,
      emailVerified: false,
      providerId: 'firebase',
      providerData: [],
      getIdToken: vi.fn().mockResolvedValue('anonymous-token'),
    };
    authMock.currentUser = anonymousUser as unknown as User;
    onAuthStateChangedCallback.next(anonymousUser as unknown as User);
    onIdTokenChangedCallback.next(anonymousUser as unknown as User);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect((await firstValueFrom(service.authState)).user?.isAnonymous).toBe(
      true,
    );
    expect((await firstValueFrom(service.authUser))?.isAnonymous).toBe(true);

    const permanentUser = {
      ...anonymousUser,
      isAnonymous: false,
      email: 'buyer@example.test',
      getIdToken: vi.fn().mockResolvedValue('permanent-token'),
    };
    authMock.currentUser = permanentUser as unknown as User;
    // Firebase notifies the ID-token observer for a same-UID upgrade while
    // suppressing a duplicate auth-state observer notification.
    onIdTokenChangedCallback.next(permanentUser as unknown as User);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect((await firstValueFrom(service.authState)).user).toMatchObject({
      uid: 'same-uid',
      isAnonymous: false,
      email: 'buyer@example.test',
    });
    expect((await firstValueFrom(service.authUser)).isAnonymous).toBe(false);
  });

  it('publishes a new identity before its token resolves without retaining the old token', async () => {
    const accountA = {
      uid: 'account-a',
      isAnonymous: false,
      email: 'a@example.test',
      emailVerified: true,
      providerId: 'password',
      providerData: [],
      getIdToken: vi.fn().mockResolvedValue('token-a'),
    };
    authMock.currentUser = accountA as unknown as User;
    onAuthStateChangedCallback.next(accountA as unknown as User);
    onIdTokenChangedCallback.next(accountA as unknown as User);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect((await firstValueFrom(service.authState)).token).toBe('token-a');

    let resolveToken!: (token: string) => void;
    const accountB = {
      uid: 'account-b',
      isAnonymous: false,
      email: 'b@example.test',
      emailVerified: true,
      providerId: 'password',
      providerData: [],
      getIdToken: vi.fn(
        () =>
          new Promise<string>((resolve) => {
            resolveToken = resolve;
          }),
      ),
    };
    authMock.currentUser = accountB as unknown as User;
    // This models Firebase's ID-token observer firing before token acquisition
    // finishes for a new identity.
    onIdTokenChangedCallback.next(accountB as unknown as User);
    expect(await firstValueFrom(service.authState)).toMatchObject({
      status: AuthStatuses.authenticating,
      loadingPhase: 'getting-token',
      token: null,
      user: { uid: 'account-b' },
    });

    resolveToken('token-b');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(await firstValueFrom(service.authState)).toMatchObject({
      status: AuthStatuses.authenticated,
      loadingPhase: 'ready',
      token: 'token-b',
      user: { uid: 'account-b' },
    });
  });

  it('clears the token on sign-out and ignores a late token lookup', async () => {
    let resolveToken!: (token: string) => void;
    const fbUser = {
      uid: 'signing-out-user',
      isAnonymous: false,
      emailVerified: true,
      email: 'signout@example.com',
      providerId: 'google.com',
      providerData: [],
      getIdToken: vi.fn(
        () => new Promise<string>((resolve) => (resolveToken = resolve)),
      ),
    };
    authMock.currentUser = fbUser as unknown as User;
    onAuthStateChangedCallback.next(fbUser as unknown as User);
    onIdTokenChangedCallback.next(fbUser as unknown as User);

    authMock.currentUser = null;
    onAuthStateChangedCallback.next(null);
    onIdTokenChangedCallback.next(null);
    resolveToken('stale-token');
    await Promise.resolve();
    await Promise.resolve();

    const state = await firstValueFrom(service.authState);
    expect(state).toMatchObject({
      status: AuthStatuses.notAuthenticated,
      token: null,
      user: null,
    });
  });

  it('ignores a late token lookup from the previous user', async () => {
    let resolveOldToken!: (token: string) => void;
    const oldUser = {
      uid: 'old-user',
      isAnonymous: false,
      emailVerified: true,
      email: 'old@example.com',
      providerId: 'google.com',
      providerData: [],
      getIdToken: vi.fn(
        () => new Promise<string>((resolve) => (resolveOldToken = resolve)),
      ),
    };
    const currentUser = {
      uid: 'current-user',
      isAnonymous: false,
      emailVerified: true,
      email: 'current@example.com',
      providerId: 'google.com',
      providerData: [],
      getIdToken: vi.fn().mockResolvedValue('current-token'),
    };
    authMock.currentUser = oldUser as unknown as User;
    onAuthStateChangedCallback.next(oldUser as unknown as User);
    onIdTokenChangedCallback.next(oldUser as unknown as User);

    authMock.currentUser = currentUser as unknown as User;
    onAuthStateChangedCallback.next(currentUser as unknown as User);
    onIdTokenChangedCallback.next(currentUser as unknown as User);
    await Promise.resolve();
    resolveOldToken('stale-token');
    await Promise.resolve();
    await Promise.resolve();

    const state = await firstValueFrom(service.authState);
    expect(state).toMatchObject({
      status: AuthStatuses.authenticated,
      token: 'current-token',
      user: { uid: 'current-user' },
    });
  });

  it('should handle error in getIdToken', async () => {
    const errorLogger = TestBed.inject(ErrorLogger);
    let currentState: ISneatAuthState | undefined;
    service.authState.subscribe((state) => (currentState = state));
    const fbUser = {
      uid: 'u5',
      isAnonymous: false,
      emailVerified: true,
      email: 'error@example.com',
      providerId: 'google.com',
      providerData: [],
      getIdToken: vi.fn().mockRejectedValue(new Error('Token error')),
    };

    authMock.currentUser = fbUser as unknown as User;
    onAuthStateChangedCallback.next(fbUser as unknown as User);
    onIdTokenChangedCallback.next(fbUser as unknown as User);

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(errorLogger.logError).toHaveBeenCalled();
    expect(currentState).toMatchObject({
      status: AuthStatuses.authenticating,
      loadingPhase: 'failed',
      token: null,
      user: { uid: 'u5' },
    });
  });

  it('should handle error in onAuthStateChanged', () => {
    const errorLogger = TestBed.inject(ErrorLogger);
    const error = new Error('Auth state error');

    onAuthStateChangedCallback.error(error);

    expect(errorLogger.logError).toHaveBeenCalledWith(
      error,
      'failed to retrieve Firebase auth user information',
    );
  });

  it('should handle error in onIdTokenChanged', () => {
    const errorLogger = TestBed.inject(ErrorLogger);
    const error = new Error('Token changed error');

    onIdTokenChangedCallback.error(error);

    expect(errorLogger.logError).toHaveBeenCalledWith(
      error,
      'failed in fbAuth.onIdTokenChanged',
    );
  });

  describe('signInWithToken', () => {
    it('should call signInWithCustomToken', async () => {
      const { signInWithCustomToken } = await import('firebase/auth');
      const mockCredential = { user: { uid: 'test' } } as UserCredential;
      (signInWithCustomToken as Mock).mockResolvedValue(mockCredential);

      const result = await service.signInWithToken('custom-token');

      expect(signInWithCustomToken).toHaveBeenCalledWith(
        authMock,
        'custom-token',
      );
      expect(result).toBe(mockCredential);
    });
  });

  describe('signInWithEmailLink', () => {
    it('should return observable that calls signInWithEmailLink', async () => {
      const { signInWithEmailLink } = await import('firebase/auth');

      const result = await firstValueFrom(
        service.signInWithEmailLink('test@example.com'),
      );

      expect(signInWithEmailLink).toHaveBeenCalled();
      expect(result.user.uid).toBe('test');
    });
  });

  describe('email and password authentication', () => {
    it.each([
      ['createUserWithEmailAndPassword', 'new-user'],
      ['signInWithEmailAndPassword', 'existing-user'],
    ] as const)(
      'returns a provider-neutral identity and token from %s',
      async (method, userID) => {
        const firebaseAuth = await import('firebase/auth');
        const providerMethod = firebaseAuth[method] as Mock;
        const getIdToken = vi.fn().mockResolvedValue(`${userID}-token`);
        providerMethod.mockResolvedValueOnce({
          user: { uid: userID, getIdToken },
        });

        const result = await service[method]('member@example.com', 'password');

        expect(providerMethod).toHaveBeenCalledWith(
          authMock,
          'member@example.com',
          'password',
        );
        expect(getIdToken).toHaveBeenCalledOnce();
        expect(result).toEqual({ userID, token: `${userID}-token` });
      },
    );

    it('preserves provider authentication failures', async () => {
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      const providerError = new Error('invalid credentials');
      (signInWithEmailAndPassword as Mock).mockRejectedValueOnce(providerError);

      await expect(
        service.signInWithEmailAndPassword('member@example.com', 'wrong'),
      ).rejects.toBe(providerError);
    });

    it('preserves token retrieval failures', async () => {
      const { createUserWithEmailAndPassword } = await import('firebase/auth');
      const tokenError = new Error('token unavailable');
      (createUserWithEmailAndPassword as Mock).mockResolvedValueOnce({
        user: {
          uid: 'new-user',
          getIdToken: vi.fn().mockRejectedValue(tokenError),
        },
      });

      await expect(
        service.createUserWithEmailAndPassword(
          'member@example.com',
          'password',
        ),
      ).rejects.toBe(tokenError);
    });
  });

  describe('linkWith', () => {
    it('should reject if no current user', async () => {
      authMock.currentUser = null;

      await expect(service.linkWith('google.com')).rejects.toBe(
        'no current user',
      );
    });

    it('should link provider to current user', async () => {
      const { linkWithPopup } = await import('firebase/auth');
      const mockUser = { uid: 'current-user' } as User;
      authMock.currentUser = mockUser;

      const result = await service.linkWith('google.com');

      expect(linkWithPopup).toHaveBeenCalled();
      expect(result?.user.uid).toBe('test');
    });
  });

  describe('unlinkAuthProvider', () => {
    it('should reject if no current user', async () => {
      authMock.currentUser = null;

      await expect(service.unlinkAuthProvider('google.com')).rejects.toBe(
        'No user is currently signed in.',
      );
    });

    it('should unlink auth provider from current user', async () => {
      const { unlink } = await import('firebase/auth');
      const mockUser = {
        uid: 'current-user',
        isAnonymous: false,
        emailVerified: true,
        providerData: [],
      } as unknown as User;
      authMock.currentUser = mockUser;

      await service.unlinkAuthProvider('google.com');

      expect(unlink).toHaveBeenCalledWith(mockUser, 'google.com');
    });

    it('should handle unlink error', async () => {
      const { unlink } = await import('firebase/auth');
      const mockUser = { uid: 'current-user' } as User;
      authMock.currentUser = mockUser;
      const error = new Error('Unlink failed');
      (unlink as Mock).mockRejectedValueOnce(error);

      await expect(service.unlinkAuthProvider('google.com')).rejects.toMatch(
        /Failed to unlink google.com account/,
      );
    });
  });

  describe('pending credential link', () => {
    const githubLink = {
      providerId: 'github.com',
      email: 'me@example.com',
      createdAt: Date.now(),
      credential: { providerId: 'github.com' },
    };
    const conflict = {
      code: 'auth/account-exists-with-different-credential',
    };
    const fbUser = (overrides: Partial<User> = {}) =>
      ({
        uid: 'u1',
        isAnonymous: false,
        emailVerified: true,
        email: 'Me@Example.com',
        providerId: 'firebase',
        providerData: [{ providerId: 'google.com' }],
        ...overrides,
      }) as unknown as User;
    const flush = () => new Promise((resolve) => setTimeout(resolve));

    beforeEach(() => {
      localStorage.clear();
      vi.mocked(pendingCredentialLinkFromError).mockReset();
      vi.mocked(linkWithCredential).mockReset();
    });

    it('remembers the credential when popup sign-in hits an existing account', async () => {
      vi.mocked(signInWithPopup).mockRejectedValueOnce(conflict);
      vi.mocked(pendingCredentialLinkFromError).mockReturnValue(githubLink);

      await expect(service.signInWith('github.com')).rejects.toBe(conflict);

      expect(pendingCredentialLinkFromError).toHaveBeenCalledWith(conflict);
      expect(service.pendingCredentialLink).toEqual(githubLink);
    });

    it('stores nothing for other errors', () => {
      vi.mocked(pendingCredentialLinkFromError).mockReturnValue(undefined);
      expect(service.rememberPendingCredentialLink(new Error('x'))).toBe(
        undefined,
      );
      expect(service.pendingCredentialLink).toBeUndefined();
    });

    it('links the pending credential when the same email signs in', async () => {
      savePendingCredentialLink(githubLink);
      const linkedUser = fbUser({
        providerData: [
          { providerId: 'google.com' },
          { providerId: 'github.com' },
        ] as User['providerData'],
      });
      vi.mocked(linkWithCredential).mockResolvedValue({
        user: linkedUser,
      } as UserCredential);
      authMock.currentUser = linkedUser;
      const user = fbUser();

      onAuthStateChangedCallback.next(user);
      await flush();

      expect(linkWithCredential).toHaveBeenCalledWith(
        user,
        'restored-credential',
      );
      expect(service.pendingCredentialLink).toBeUndefined();
      const authUser = await firstValueFrom(service.authUser);
      expect(authUser?.providerData.map((p) => p.providerId)).toContain(
        'github.com',
      );
      const state = await firstValueFrom(service.authState);
      expect(state.user?.providerData.map((p) => p.providerId)).toContain(
        'github.com',
      );
    });

    it('does not bring back a user who signed out while linking', async () => {
      savePendingCredentialLink(githubLink);
      const linkedUser = fbUser({ uid: 'u1' });
      vi.mocked(linkWithCredential).mockResolvedValue({
        user: linkedUser,
      } as UserCredential);
      authMock.currentUser = null;
      const published: unknown[] = [];
      service.authUser.subscribe((u) => published.push(u));
      published.length = 0;

      onAuthStateChangedCallback.next(fbUser());
      published.length = 0; // ignore the sign-in publication itself
      await flush();

      expect(linkWithCredential).toHaveBeenCalled();
      expect(published).toEqual([]);
    });

    it('never links to a user without an email', async () => {
      savePendingCredentialLink(githubLink);

      onAuthStateChangedCallback.next(fbUser({ email: null }));
      await flush();

      expect(linkWithCredential).not.toHaveBeenCalled();
      expect(service.pendingCredentialLink).toEqual(githubLink);
    });

    it('never links a pending credential that has no email', async () => {
      savePendingCredentialLink({ ...githubLink, email: undefined });

      onAuthStateChangedCallback.next(fbUser());
      await flush();

      expect(linkWithCredential).not.toHaveBeenCalled();
    });

    it('announces pending link changes', () => {
      const seen: unknown[] = [];
      service.pendingCredentialLinkChanges.subscribe((l) => seen.push(l));
      vi.mocked(pendingCredentialLinkFromError).mockReturnValue(githubLink);

      service.rememberPendingCredentialLink(conflict);

      expect(seen).toEqual([undefined, githubLink]);
    });

    it('stops announcing a pending link that expired before sign-in', async () => {
      vi.mocked(pendingCredentialLinkFromError).mockReturnValue(githubLink);
      service.rememberPendingCredentialLink(conflict);
      localStorage.clear(); // as if it expired
      const seen: unknown[] = [];
      service.pendingCredentialLinkChanges.subscribe((l) => seen.push(l));

      onAuthStateChangedCallback.next(fbUser());
      await flush();

      expect(seen).toEqual([githubLink, undefined]);
      expect(linkWithCredential).not.toHaveBeenCalled();
    });

    it('forgets the pending link on sign-out', async () => {
      vi.mocked(pendingCredentialLinkFromError).mockReturnValue(githubLink);
      service.rememberPendingCredentialLink(conflict);
      const seen: unknown[] = [];
      service.pendingCredentialLinkChanges.subscribe((l) => seen.push(l));

      await service.signOut();

      expect(service.pendingCredentialLink).toBeUndefined();
      expect(seen).toEqual([githubLink, undefined]);
    });

    it('logs and clears when linking fails', async () => {
      savePendingCredentialLink(githubLink);
      vi.mocked(linkWithCredential).mockRejectedValue(new Error('in use'));

      onAuthStateChangedCallback.next(fbUser());
      await flush();

      expect(service.pendingCredentialLink).toBeUndefined();
      expect(TestBed.inject(ErrorLogger).logError).toHaveBeenCalled();
    });

    it('does not link to an account with a different email', async () => {
      savePendingCredentialLink(githubLink);

      onAuthStateChangedCallback.next(fbUser({ email: 'other@example.com' }));
      await flush();

      expect(linkWithCredential).not.toHaveBeenCalled();
      expect(service.pendingCredentialLink).toEqual(githubLink);
    });

    it('drops the link when the provider is already connected', async () => {
      savePendingCredentialLink(githubLink);

      onAuthStateChangedCallback.next(
        fbUser({
          providerData: [{ providerId: 'github.com' }] as User['providerData'],
        }),
      );
      await flush();

      expect(linkWithCredential).not.toHaveBeenCalled();
      expect(service.pendingCredentialLink).toBeUndefined();
    });

    it('drops a link whose credential cannot be restored', async () => {
      savePendingCredentialLink(githubLink);
      vi.mocked(credentialOfPendingLink).mockReturnValueOnce(undefined);

      onAuthStateChangedCallback.next(fbUser());
      await flush();

      expect(linkWithCredential).not.toHaveBeenCalled();
      expect(service.pendingCredentialLink).toBeUndefined();
    });

    it('ignores anonymous users', async () => {
      savePendingCredentialLink(githubLink);

      onAuthStateChangedCallback.next(fbUser({ isAnonymous: true }));
      await flush();

      expect(linkWithCredential).not.toHaveBeenCalled();
      expect(service.pendingCredentialLink).toEqual(githubLink);
    });
  });
});
