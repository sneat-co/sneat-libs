import { TestBed } from '@angular/core/testing';
import {
  Firestore as AngularFirestore,
  CollectionReference,
} from 'firebase/firestore';
import { SneatApiService } from '@sneat/api';
import { ErrorLogger, SneatUrlOperationBlocker } from '@sneat/core';
import {
  SneatAuthStateService,
  ISneatAuthState,
} from '../sneat-auth-state-service';
import { UserRecordService } from './user-record.service';
import { SneatUserService } from './sneat-user.service';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of, Subject, firstValueFrom, throwError } from 'rxjs';

// Mock firestore functions
vi.mock('firebase/firestore', async () => {
  const actual = await vi.importActual('firebase/firestore');
  return {
    ...actual,
    collection: vi
      .fn()
      .mockReturnValue({ id: 'users' } as unknown as CollectionReference),
    doc: vi.fn(),
    onSnapshot: vi.fn(),
  };
});

describe('SneatUserService', () => {
  let service: SneatUserService;
  let authStateSubject: Subject<ISneatAuthState>;
  let sneatApiServiceMock: { post: ReturnType<typeof vi.fn> };
  let userRecordServiceMock: { initUserRecord: ReturnType<typeof vi.fn> };
  let firestoreMock: Record<string, unknown>;
  let operationBlockerMock: { isBlocked: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    authStateSubject = new Subject<ISneatAuthState>();

    sneatApiServiceMock = {
      post: vi.fn().mockReturnValue(of(void 0)),
    };

    userRecordServiceMock = {
      initUserRecord: vi
        .fn()
        .mockReturnValue(of({ id: 'user123', title: 'Test User' })),
    };

    firestoreMock = {
      app: {},
      type: 'firestore',
    };
    operationBlockerMock = {
      isBlocked: vi.fn().mockReturnValue(false),
    };

    TestBed.configureTestingModule({
      providers: [
        SneatUserService,
        {
          provide: AngularFirestore,
          useValue: firestoreMock,
        },
        {
          provide: ErrorLogger,
          useValue: {
            logError: vi.fn(),
            logErrorHandler: vi.fn().mockReturnValue(() => undefined),
          },
        },
        {
          provide: SneatAuthStateService,
          useValue: {
            authState: authStateSubject.asObservable(),
          },
        },
        {
          provide: SneatApiService,
          useValue: sneatApiServiceMock,
        },
        {
          provide: UserRecordService,
          useValue: userRecordServiceMock,
        },
        {
          provide: SneatUrlOperationBlocker,
          useValue: operationBlockerMock,
        },
      ],
    });

    service = TestBed.inject(SneatUserService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have currentUserID as undefined initially', () => {
    expect(service.currentUserID).toBeUndefined();
  });

  it('should call setUserCountry with correct parameters', async () => {
    const countryID = 'US';
    await firstValueFrom(service.setUserCountry(countryID));
    expect(sneatApiServiceMock.post).toHaveBeenCalledWith(
      'users/set_user_country',
      { countryID },
    );
  });

  it('watches a readable linked user record without changing currentUserID', async () => {
    const { doc, onSnapshot } = await import('firebase/firestore');
    vi.mocked(doc).mockReturnValue({ id: 'linked-user' } as never);
    vi.mocked(onSnapshot).mockImplementation(((_reference, observer) => {
      observer.next({
        exists: () => true,
        data: () => ({ title: 'Linked user', avatarMedia: { mediaID: 'm1' } }),
      } as never);
      return vi.fn();
    }) as never);

    const record = await firstValueFrom(
      service.watchUserRecordByID('linked-user'),
    );

    expect(record?.avatarMedia?.mediaID).toBe('m1');
    expect(service.currentUserID).toBeUndefined();
  });

  it('does not watch linked user records when server requests are blocked', async () => {
    operationBlockerMock.isBlocked.mockReturnValue(true);
    const { onSnapshot } = await import('firebase/firestore');

    await expect(
      firstValueFrom(service.watchUserRecordByID('linked-user')),
    ).resolves.toBeNull();
    expect(onSnapshot).not.toHaveBeenCalled();
  });

  it('should update currentUserID when user signs in', () => {
    const authState: ISneatAuthState = {
      status: 'authenticated',
      user: {
        uid: 'test-uid-123',
        email: 'test@example.com',
        emailVerified: true,
        displayName: 'Test User',
        providerId: 'google.com',
        isAnonymous: false,
        providerData: [],
        photoURL: null,
        phoneNumber: null,
      },
    };

    service.onUserSignedIn(authState);

    expect(service.currentUserID).toBe('test-uid-123');
  });

  it('does not start the user-record listener when server requests are blocked', async () => {
    vi.useFakeTimers();
    try {
      operationBlockerMock.isBlocked.mockImplementation(
        (operation) => operation === 'server-requests',
      );
      service.onUserSignedIn({
        status: 'authenticated',
        user: {
          uid: 'blocked-user',
          email: 'blocked@example.com',
          emailVerified: true,
          displayName: 'Blocked User',
          providerId: 'google.com',
          isAnonymous: false,
          providerData: [],
          photoURL: null,
          phoneNumber: null,
        },
      });

      await vi.advanceTimersByTimeAsync(100);

      const { onSnapshot } = await import('firebase/firestore');
      expect(onSnapshot).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('should not change currentUserID if uid is the same', () => {
    const authState: ISneatAuthState = {
      status: 'authenticated',
      user: {
        uid: 'test-uid-123',
        email: 'test@example.com',
        emailVerified: true,
        displayName: 'Test User',
        providerId: 'google.com',
        isAnonymous: false,
        providerData: [],
        photoURL: null,
        phoneNumber: null,
      },
    };

    service.onUserSignedIn(authState);
    const firstUserID = service.currentUserID;

    service.onUserSignedIn(authState); // Second call with same uid

    expect(service.currentUserID).toBe(firstUserID);
    expect(service.currentUserID).toBe('test-uid-123');
  });

  it('waits for the persisted snapshot after init API success', async () => {
    vi.useFakeTimers();
    try {
      const { doc, onSnapshot } = await import('firebase/firestore');
      vi.mocked(doc).mockReturnValue({ id: 'buyer' } as never);
      let watcher: { next: (snapshot: unknown) => void } | undefined;
      vi.mocked(onSnapshot).mockImplementation(((_reference, observer) => {
        watcher = observer as typeof watcher;
        return vi.fn();
      }) as never);
      userRecordServiceMock.initUserRecord.mockReturnValue(
        of({ id: 'buyer', title: 'Buyer' }),
      );
      const states: import('./sneat-user.service').ISneatUserState[] = [];
      service.userState.subscribe((state) => states.push(state));

      authStateSubject.next({
        status: 'authenticated',
        user: { uid: 'buyer', isAnonymous: false } as never,
      });
      await vi.advanceTimersByTimeAsync(100);
      watcher?.next({
        ref: { id: 'buyer' },
        exists: () => false,
        data: () => undefined,
      });

      expect(userRecordServiceMock.initUserRecord).toHaveBeenCalledOnce();
      expect(states.at(-1)).toMatchObject({
        user: { uid: 'buyer' },
        record: { title: 'buyer' },
        userRecordStatus: 'loading',
      });
      watcher?.next({
        ref: { id: 'buyer' },
        exists: () => true,
        data: () => ({ title: 'Persisted buyer' }),
      });
      expect(states.at(-1)).toMatchObject({
        record: { title: 'Persisted buyer' },
        userRecordStatus: 'ready',
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('marks initialization failure and retries before accepting persisted state', async () => {
    vi.useFakeTimers();
    try {
      const { doc, onSnapshot } = await import('firebase/firestore');
      vi.mocked(doc).mockReturnValue({ id: 'buyer' } as never);
      const watchers: Array<{ next: (snapshot: unknown) => void }> = [];
      vi.mocked(onSnapshot).mockImplementation(((_reference, observer) => {
        watchers.push(observer as (typeof watchers)[number]);
        return vi.fn();
      }) as never);
      userRecordServiceMock.initUserRecord
        .mockReturnValueOnce(throwError(() => new Error('init failed')))
        .mockReturnValueOnce(of({ id: 'buyer', title: 'Buyer' }));
      let current: import('./sneat-user.service').ISneatUserState | undefined;
      service.userState.subscribe((state) => (current = state));
      authStateSubject.next({
        status: 'authenticated',
        user: { uid: 'buyer', isAnonymous: false } as never,
      });
      await vi.advanceTimersByTimeAsync(100);
      watchers[0].next({
        ref: { id: 'buyer' },
        exists: () => false,
        data: () => undefined,
      });
      expect(current?.userRecordStatus).toBe('failed');

      service.retryUserRecordInitialization();
      await vi.advanceTimersByTimeAsync(100);
      expect(watchers).toHaveLength(2);
      watchers[1].next({
        ref: { id: 'buyer' },
        exists: () => false,
        data: () => undefined,
      });
      expect(userRecordServiceMock.initUserRecord).toHaveBeenCalledTimes(2);
      expect(current?.userRecordStatus).toBe('loading');
      watchers[1].next({
        ref: { id: 'buyer' },
        exists: () => true,
        data: () => ({ title: 'Buyer' }),
      });
      expect(current?.userRecordStatus).toBe('ready');
    } finally {
      vi.useRealTimers();
    }
  });

  it('fails and retries after a Firestore read error', async () => {
    vi.useFakeTimers();
    try {
      const { doc, onSnapshot } = await import('firebase/firestore');
      vi.mocked(doc).mockReturnValue({ id: 'buyer' } as never);
      const watchers: Array<{
        next: (snapshot: unknown) => void;
        error: (error: unknown) => void;
      }> = [];
      vi.mocked(onSnapshot).mockImplementation(((_reference, observer) => {
        watchers.push(observer as (typeof watchers)[number]);
        return vi.fn();
      }) as never);
      let current: import('./sneat-user.service').ISneatUserState | undefined;
      service.userState.subscribe((state) => (current = state));
      authStateSubject.next({
        status: 'authenticated',
        user: { uid: 'buyer', isAnonymous: false } as never,
      });
      await vi.advanceTimersByTimeAsync(100);
      watchers[0].error(new Error('read failed'));
      expect(current?.userRecordStatus).toBe('failed');

      service.retryUserRecordInitialization();
      await vi.advanceTimersByTimeAsync(100);
      expect(watchers).toHaveLength(2);
      watchers[1].next({
        ref: { id: 'buyer' },
        exists: () => true,
        data: () => ({ title: 'Persisted buyer' }),
      });
      expect(current?.userRecordStatus).toBe('ready');
    } finally {
      vi.useRealTimers();
    }
  });

  it('ignores snapshots from a prior account after an identity switch', async () => {
    vi.useFakeTimers();
    try {
      const { doc, onSnapshot } = await import('firebase/firestore');
      vi.mocked(doc).mockImplementation(((_collection, uid) => ({ id: uid })) as never);
      const watchers: Array<{ next: (snapshot: unknown) => void }> = [];
      vi.mocked(onSnapshot).mockImplementation(((_reference, observer) => {
        watchers.push(observer as (typeof watchers)[number]);
        return vi.fn();
      }) as never);
      let current: import('./sneat-user.service').ISneatUserState | undefined;
      service.userState.subscribe((state) => (current = state));
      authStateSubject.next({
        status: 'authenticated',
        user: { uid: 'buyer-a', isAnonymous: false } as never,
      });
      await vi.advanceTimersByTimeAsync(100);
      authStateSubject.next({
        status: 'authenticated',
        user: { uid: 'buyer-b', isAnonymous: false } as never,
      });
      await vi.advanceTimersByTimeAsync(100);
      watchers[0].next({
        ref: { id: 'buyer-a' },
        exists: () => true,
        data: () => ({ title: 'Old account' }),
      });
      expect(current).toMatchObject({
        user: { uid: 'buyer-b' },
        userRecordStatus: 'loading',
      });

      watchers[1].next({
        ref: { id: 'buyer-b' },
        exists: () => true,
        data: () => ({ title: 'New account' }),
      });
      expect(current).toMatchObject({
        user: { uid: 'buyer-b' },
        record: { title: 'New account' },
        userRecordStatus: 'ready',
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('ignores a delayed init error from account A after A to B to A', async () => {
    vi.useFakeTimers();
    try {
      const { doc, onSnapshot } = await import('firebase/firestore');
      vi.mocked(doc).mockImplementation(((_collection, uid) => ({ id: uid })) as never);
      const watchers: Array<{ next: (snapshot: unknown) => void }> = [];
      vi.mocked(onSnapshot).mockImplementation(((_reference, observer) => {
        watchers.push(observer as (typeof watchers)[number]);
        return vi.fn();
      }) as never);
      const oldAInit = new Subject<{ id: string; title: string }>();
      const newAInit = new Subject<{ id: string; title: string }>();
      userRecordServiceMock.initUserRecord
        .mockReturnValueOnce(oldAInit.asObservable())
        .mockReturnValueOnce(newAInit.asObservable());
      let current: import('./sneat-user.service').ISneatUserState | undefined;
      service.userState.subscribe((state) => (current = state));

      const account = (uid: string): ISneatAuthState => ({
        status: 'authenticated',
        user: { uid, isAnonymous: false } as never,
      });
      const missing = (uid: string) => ({
        ref: { id: uid },
        exists: () => false,
        data: () => undefined,
      });
      authStateSubject.next(account('buyer-a'));
      await vi.advanceTimersByTimeAsync(100);
      watchers[0].next(missing('buyer-a'));

      authStateSubject.next(account('buyer-b'));
      await vi.advanceTimersByTimeAsync(100);
      watchers[1].next({
        ref: { id: 'buyer-b' },
        exists: () => true,
        data: () => ({ title: 'Buyer B' }),
      });
      authStateSubject.next(account('buyer-a'));
      await vi.advanceTimersByTimeAsync(100);
      watchers[2].next(missing('buyer-a'));
      expect(userRecordServiceMock.initUserRecord).toHaveBeenCalledTimes(2);

      oldAInit.error(new Error('stale init failure'));
      expect(current).toMatchObject({
        user: { uid: 'buyer-a' },
        userRecordStatus: 'loading',
      });
      newAInit.next({ id: 'buyer-a', title: 'Buyer A' });
      expect(current?.userRecordStatus).toBe('loading');
      watchers[2].next({
        ref: { id: 'buyer-a' },
        exists: () => true,
        data: () => ({ title: 'Persisted buyer A' }),
      });
      expect(current).toMatchObject({
        user: { uid: 'buyer-a' },
        record: { title: 'Persisted buyer A' },
        userRecordStatus: 'ready',
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not let a late init error replace a persisted ready snapshot', async () => {
    vi.useFakeTimers();
    try {
      const { doc, onSnapshot } = await import('firebase/firestore');
      vi.mocked(doc).mockReturnValue({ id: 'buyer' } as never);
      let watcher: { next: (snapshot: unknown) => void } | undefined;
      vi.mocked(onSnapshot).mockImplementation(((_reference, observer) => {
        watcher = observer as typeof watcher;
        return vi.fn();
      }) as never);
      const init = new Subject<{ id: string; title: string }>();
      userRecordServiceMock.initUserRecord.mockReturnValue(init.asObservable());
      let current: import('./sneat-user.service').ISneatUserState | undefined;
      service.userState.subscribe((state) => (current = state));
      authStateSubject.next({
        status: 'authenticated',
        user: { uid: 'buyer', isAnonymous: false } as never,
      });
      await vi.advanceTimersByTimeAsync(100);
      watcher?.next({
        ref: { id: 'buyer' },
        exists: () => false,
        data: () => undefined,
      });
      watcher?.next({
        ref: { id: 'buyer' },
        exists: () => true,
        data: () => ({ title: 'Persisted buyer' }),
      });
      expect(current?.userRecordStatus).toBe('ready');

      init.error(new Error('late init failure'));
      expect(current).toMatchObject({
        record: { title: 'Persisted buyer' },
        userRecordStatus: 'ready',
      });
    } finally {
      vi.useRealTimers();
    }
  });
});
