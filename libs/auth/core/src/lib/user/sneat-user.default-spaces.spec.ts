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
import {
  INIT_USER_RECORD_APP_ID,
  UserRecordService,
} from './user-record.service';
import { lacksDefaultSpace, SneatUserService } from './sneat-user.service';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NEVER, of, Subject, throwError } from 'rxjs';

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

const brief = (type: string) => ({
  title: type,
  type,
  roles: [],
  userContactID: 'c',
});
const BOTH = { f: brief('family'), p: brief('personal') };

describe('lacksDefaultSpace', () => {
  it.each([
    ['no spaces field', undefined, true],
    ['empty', {}, true],
    ['team only', { t: brief('team') }, true],
    ['family only', { f: brief('family') }, true],
    ['personal only', { p: brief('personal') }, true],
    ['both', BOTH, false],
    ['both and team', { ...BOTH, t: brief('team') }, false],
  ])('%s', (_name, spaces, want) => {
    expect(lacksDefaultSpace({ title: 'U', spaces } as never)).toBe(want);
  });
});

// N7 (owner: "Yes"): a general Sneat app creates the missing family/personal
// Space the next time a user with an existing record opens it. Never for
// AskStage, and at most one attempt per user per tab.
describe('SneatUserService creates missing default Spaces', () => {
  let authStateSubject: Subject<ISneatAuthState>;
  let initUserRecord: ReturnType<typeof vi.fn>;
  let logError: ReturnType<typeof vi.fn>;
  let watcher: { next: (snapshot: unknown) => void } | undefined;

  const setUp = async (appId?: string) => {
    vi.useFakeTimers();
    authStateSubject = new Subject<ISneatAuthState>();
    initUserRecord = vi.fn().mockReturnValue(of({ id: 'u1', title: 'U' }));
    logError = vi.fn();
    const { doc, onSnapshot } = await import('firebase/firestore');
    vi.mocked(doc).mockReturnValue({ id: 'u1' } as never);
    vi.mocked(onSnapshot).mockImplementation(((_reference, observer) => {
      watcher = observer as typeof watcher;
      return vi.fn();
    }) as never);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        SneatUserService,
        { provide: AngularFirestore, useValue: { app: {}, type: 'firestore' } },
        {
          provide: ErrorLogger,
          useValue: { logError, logErrorHandler: () => () => undefined },
        },
        {
          provide: SneatAuthStateService,
          useValue: { authState: authStateSubject.asObservable() },
        },
        { provide: SneatApiService, useValue: { post: vi.fn() } },
        { provide: UserRecordService, useValue: { initUserRecord } },
        {
          provide: SneatUrlOperationBlocker,
          useValue: { isBlocked: () => false },
        },
        ...(appId
          ? [{ provide: INIT_USER_RECORD_APP_ID, useValue: appId }]
          : []),
      ],
    });
    TestBed.inject(SneatUserService);
    authStateSubject.next({
      status: 'authenticated',
      user: { uid: 'u1', isAnonymous: false, email: 'u1@example.com' } as never,
    });
    await vi.advanceTimersByTimeAsync(100);
  };
  const snapshot = (spaces?: object) =>
    watcher?.next({
      ref: { id: 'u1' },
      exists: () => true,
      data: () => ({ title: 'U', spaces }),
    });

  beforeEach(() => {
    vi.clearAllMocks();
    watcher = undefined;
  });
  afterEach(() => vi.useRealTimers());

  it('sends no call when the record has both default Spaces', async () => {
    await setUp();
    snapshot(BOTH);
    snapshot({ ...BOTH, t: brief('team') });
    expect(initUserRecord).not.toHaveBeenCalled();
  });

  it.each([
    ['both missing', undefined],
    ['team only', { t: brief('team') }],
    ['family missing', { p: brief('personal') }],
    ['personal missing', { f: brief('family') }],
  ])('sends exactly one minimal call when %s', async (_name, spaces) => {
    await setUp();
    snapshot(spaces);
    snapshot(spaces); // a later snapshot before the Spaces appear
    expect(initUserRecord).toHaveBeenCalledTimes(1);
    // No names or email: an existing user's profile is never overwritten.
    expect(initUserRecord).toHaveBeenCalledWith({});
  });

  it('sends no call for AskStage', async () => {
    await setUp('askstage');
    snapshot(undefined);
    snapshot({ t: brief('team') });
    expect(initUserRecord).not.toHaveBeenCalled();
  });

  it('still fills Spaces for another app that sends its own appId', async () => {
    await setUp('sneat');
    snapshot(undefined);
    expect(initUserRecord).toHaveBeenCalledTimes(1);
  });

  it('does not retry a failed call in a loop', async () => {
    await setUp();
    initUserRecord.mockReturnValue(throwError(() => new Error('503')));
    snapshot(undefined);
    snapshot(undefined);
    await vi.advanceTimersByTimeAsync(60_000);
    snapshot(undefined);
    expect(initUserRecord).toHaveBeenCalledTimes(1);
    expect(logError).toHaveBeenCalledTimes(1);
    expect(logError.mock.calls[0][2]).toEqual({ show: false });
  });

  it('does not retry after sign-out and sign-in again in the same tab', async () => {
    await setUp();
    initUserRecord.mockReturnValue(throwError(() => new Error('503')));
    snapshot(undefined);
    authStateSubject.next({ status: 'notAuthenticated' } as never);
    authStateSubject.next({
      status: 'authenticated',
      user: { uid: 'u1', isAnonymous: false } as never,
    });
    await vi.advanceTimersByTimeAsync(100);
    snapshot(undefined);
    expect(initUserRecord).toHaveBeenCalledTimes(1);
  });

  it('does not start a second call while the first is in flight', async () => {
    await setUp();
    initUserRecord.mockReturnValue(NEVER);
    snapshot(undefined);
    snapshot({ t: brief('team') });
    expect(initUserRecord).toHaveBeenCalledTimes(1);
  });
});
