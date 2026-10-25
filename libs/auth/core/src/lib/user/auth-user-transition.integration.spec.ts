import { TestBed } from '@angular/core/testing';
import { AnalyticsService, ErrorLogger, SNEAT_FIREBASE_AUTH, SneatUrlOperationBlocker } from '@sneat/core';
import { SneatApiService } from '@sneat/api';
import { Firestore, doc, onSnapshot } from 'firebase/firestore';
import { NEVER } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { SneatAuthStateService } from '../sneat-auth-state-service';
import { SneatUserService } from './sneat-user.service';
import { UserRecordService } from './user-record.service';

vi.mock('firebase/firestore', async () => ({
  ...(await vi.importActual('firebase/firestore')),
  collection: vi.fn().mockReturnValue({ id: 'users' }),
  doc: vi.fn(),
  onSnapshot: vi.fn(),
}));

describe('auth identity transition integration', () => {
  it('retires account A before account B token resolves and never initializes A under B', async () => {
    vi.useFakeTimers();
    const watchers: Array<{
      next: (snapshot: unknown) => void;
      error: (error: unknown) => void;
    }> = [];
    vi.mocked(doc).mockImplementation(((_collection, uid) => ({ id: uid })) as never);
    vi.mocked(onSnapshot).mockImplementation(((_reference, observer) => {
      watchers.push(observer as (typeof watchers)[number]);
      return vi.fn();
    }) as never);

    let authObserver:
      | { next: (user: unknown) => void }
      | undefined;
    let tokenObserver:
      | { next: (user: unknown) => void }
      | undefined;
    const firebaseAuth = {
      currentUser: null as unknown,
      onAuthStateChanged: vi.fn((observer) => {
        authObserver = observer as typeof authObserver;
      }),
      onIdTokenChanged: vi.fn((observer) => {
        tokenObserver = observer as typeof tokenObserver;
      }),
      signOut: vi.fn().mockResolvedValue(undefined),
    };
    const userRecordServiceMock = {
      initUserRecord: vi.fn(() => NEVER),
    };

    try {
      TestBed.configureTestingModule({
        providers: [
          SneatAuthStateService,
          SneatUserService,
          { provide: Firestore, useValue: {} },
          { provide: SNEAT_FIREBASE_AUTH, useValue: firebaseAuth },
          { provide: ErrorLogger, useValue: { logError: vi.fn(), logErrorHandler: () => vi.fn() } },
          { provide: AnalyticsService, useValue: { identify: vi.fn(), logEvent: vi.fn() } },
          { provide: SneatUrlOperationBlocker, useValue: { isBlocked: () => false } },
          { provide: SneatApiService, useValue: { post: vi.fn() } },
          { provide: UserRecordService, useValue: userRecordServiceMock },
        ],
      });
      const authStateService = TestBed.inject(SneatAuthStateService);
      const userService = TestBed.inject(SneatUserService);
      let authState: import('../sneat-auth-state-service').ISneatAuthState | undefined;
      let userState: import('./sneat-user.service').ISneatUserState | undefined;
      authStateService.authState.subscribe((state) => (authState = state));
      userService.userState.subscribe((state) => (userState = state));

      const accountA = {
        uid: 'account-a',
        isAnonymous: false,
        email: 'a@example.test',
        emailVerified: true,
        providerId: 'password',
        providerData: [],
        getIdToken: vi.fn().mockResolvedValue('token-a'),
      };
      firebaseAuth.currentUser = accountA;
      authObserver?.next(accountA);
      tokenObserver?.next(accountA);
      await Promise.resolve();
      await Promise.resolve();
      await vi.advanceTimersByTimeAsync(100);
      expect(watchers).toHaveLength(1);
      expect(userService.currentUserID).toBe('account-a');

      let resolveTokenB!: (token: string) => void;
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
              resolveTokenB = resolve;
            }),
        ),
      };
      firebaseAuth.currentUser = accountB;
      // Exercise both Firebase observers while B's token request remains
      // pending: the ID-token callback exposes B first; auth-state follows.
      tokenObserver?.next(accountB);
      authObserver?.next(accountB);
      expect(authState).toMatchObject({
        status: 'authenticated',
        loadingPhase: 'ready',
        token: null,
        user: { uid: 'account-b' },
      });
      expect(userService.currentUserID).toBeUndefined();
      expect(userState).toMatchObject({
        user: { uid: 'account-b' },
        record: undefined,
        userRecordStatus: 'loading',
      });

      watchers[0].next({
        ref: { id: 'account-a' },
        exists: () => false,
        data: () => undefined,
      });
      expect(userRecordServiceMock.initUserRecord).not.toHaveBeenCalled();
      expect(userService.currentUserID).toBeUndefined();

      resolveTokenB('token-b');
      await Promise.resolve();
      await Promise.resolve();
      expect(authState).toMatchObject({
        status: 'authenticated',
        loadingPhase: 'ready',
        token: 'token-b',
        user: { uid: 'account-b' },
      });
      await vi.advanceTimersByTimeAsync(100);
      expect(watchers).toHaveLength(2);
      expect(userService.currentUserID).toBe('account-b');

      watchers[1].next({
        ref: { id: 'account-b' },
        exists: () => false,
        data: () => undefined,
      });
      expect(userRecordServiceMock.initUserRecord).toHaveBeenCalledOnce();
      expect(userRecordServiceMock.initUserRecord).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'b@example.test' }),
      );
    } finally {
      TestBed.resetTestingModule();
      vi.useRealTimers();
    }
  });
});
