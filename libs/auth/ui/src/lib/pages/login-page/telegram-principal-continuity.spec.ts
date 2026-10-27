import { TestBed } from '@angular/core/testing';
import { SneatApiService } from '@sneat/api';
import { AuthStatuses, SneatAuthStateService } from '@sneat/auth-core';
import {
  AnalyticsService,
  ErrorLogger,
  SNEAT_FIREBASE_AUTH,
  SneatUrlOperationBlocker,
} from '@sneat/core';
import { signInWithCustomToken, type User, type UserCredential } from 'firebase/auth';
import { firstValueFrom, of, Subject, type Observer } from 'rxjs';
import { SneatAuthWithTelegramService } from './sneat-auth-with-telegram.service';

vi.mock('firebase/auth', async (original) => ({
  ...(await original<typeof import('firebase/auth')>()),
  signInWithCustomToken: vi.fn(),
}));

function deferredToken() {
  let resolve!: (token: string) => void;
  const promise = new Promise<string>((done) => { resolve = done; });
  return { promise, resolve };
}

// Exercise the real public auth-state service, including the temporary same-UID
// getting-token state its Firebase observer emits, rather than a ready-only stub.
describe('Telegram linking through real Firebase auth-state transitions', () => {
  let tokenObserver: Observer<User | null>;
  let auth: SneatAuthStateService;
  let firebase: { currentUser: User | null };
  let account: User;
  let getToken: ReturnType<typeof vi.fn>;
  let post: ReturnType<typeof vi.fn>;

  const login = (service: SneatAuthWithTelegramService, protocol: string) => {
    if (protocol === 'widget') {
      service.loginWithTelegram('DataTugBot', {
        id: 1, first_name: 'Synthetic', last_name: 'User', auth_date: 1, hash: 'fixture',
      }, true);
    } else {
      service.loginWithTelegramOIDC('DataTugBot', 'synthetic-proof', true);
    }
  };

  const flushToken = async () => {
    await Promise.resolve();
    await Promise.resolve();
  };

  beforeEach(async () => {
    vi.mocked(signInWithCustomToken).mockReset();
    getToken = vi.fn().mockResolvedValue('synthetic-current-token');
    account = {
      uid: 'account-A', isAnonymous: false, emailVerified: true,
      providerData: [], getIdToken: getToken,
    } as unknown as User;
    firebase = { currentUser: account };
    post = vi.fn(() => of({ token: 'synthetic-response-token' }));
    TestBed.configureTestingModule({ providers: [
      SneatAuthStateService, SneatAuthWithTelegramService,
      { provide: SneatApiService, useValue: { post, postAsAnonymous: vi.fn() } },
      { provide: ErrorLogger, useValue: { logError: vi.fn(), logErrorHandler: () => vi.fn() } },
      { provide: AnalyticsService, useValue: { identify: vi.fn(), logEvent: vi.fn() } },
      { provide: SneatUrlOperationBlocker, useValue: { isBlocked: () => false } },
      { provide: SNEAT_FIREBASE_AUTH, useValue: Object.assign(firebase, {
        onIdTokenChanged: (observer: Observer<User | null>) => { tokenObserver = observer; },
        onAuthStateChanged: () => undefined,
      }) },
    ] });
    auth = TestBed.inject(SneatAuthStateService);
    tokenObserver.next(account);
    await flushToken();
    expect(await firstValueFrom(auth.authState)).toMatchObject({
      status: AuthStatuses.authenticated, loadingPhase: 'ready', user: { uid: 'account-A' },
    });
    vi.mocked(signInWithCustomToken).mockResolvedValue({ user: account } as UserCredential);
  });

  it.each(['widget', 'oidc'])('rejects a %s callback while refreshing but accepts it after the same UID is ready', async (protocol) => {
    const service = TestBed.inject(SneatAuthWithTelegramService);
    const refresh = deferredToken();
    getToken.mockReturnValueOnce(refresh.promise);
    tokenObserver.next(account);
    expect(await firstValueFrom(auth.authState)).toMatchObject({
      status: AuthStatuses.authenticating, loadingPhase: 'getting-token', user: { uid: 'account-A' },
    });
    login(service, protocol);
    expect(post).not.toHaveBeenCalled();
    refresh.resolve('synthetic-refreshed-token');
    await flushToken();
    login(service, protocol);
    expect(post).toHaveBeenCalledOnce();
    expect(signInWithCustomToken).toHaveBeenCalledOnce();
  });

  it.each(['widget', 'oidc'])('does not poison the %s control after its own successful custom-token sign-in refresh', async (protocol) => {
    const service = TestBed.inject(SneatAuthWithTelegramService);
    const refresh = deferredToken();
    vi.mocked(signInWithCustomToken).mockImplementation(async () => {
      getToken.mockReturnValueOnce(refresh.promise);
      tokenObserver.next(account);
      return { user: account } as UserCredential;
    });
    login(service, protocol);
    expect(post).toHaveBeenCalledOnce();
    expect(signInWithCustomToken).toHaveBeenCalledOnce();
    login(service, protocol);
    expect(post).toHaveBeenCalledOnce(); // Never submit while the token is pending.
    refresh.resolve('synthetic-new-token');
    await flushToken();
    vi.mocked(signInWithCustomToken).mockResolvedValue({ user: account } as UserCredential);
    login(service, protocol);
    expect(post).toHaveBeenCalledTimes(2);
    expect(signInWithCustomToken).toHaveBeenCalledTimes(2);
  });

  it('does not consume a pending response while same-UID authentication is unready', async () => {
    const service = TestBed.inject(SneatAuthWithTelegramService);
    const response = new Subject<{ token: string }>();
    post.mockReturnValue(response);
    login(service, 'widget');
    const refresh = deferredToken();
    getToken.mockReturnValueOnce(refresh.promise);
    tokenObserver.next(account);
    expect(response.observers).toHaveLength(1);
    response.next({ token: 'synthetic-pending-response' });
    expect(signInWithCustomToken).not.toHaveBeenCalled();
    response.complete();
    refresh.resolve('synthetic-ready-again');
    await flushToken();
    post.mockReturnValue(of({ token: 'synthetic-fresh-response' }));
    login(service, 'widget');
    expect(signInWithCustomToken).toHaveBeenCalledOnce();
  });

  it('never adopts an owner if the control was created during a pending refresh', async () => {
    const refresh = deferredToken();
    getToken.mockReturnValueOnce(refresh.promise);
    tokenObserver.next(account);
    const service = TestBed.inject(SneatAuthWithTelegramService);
    refresh.resolve('synthetic-later-ready');
    await flushToken();
    login(service, 'widget');
    expect(post).not.toHaveBeenCalled();
    expect(signInWithCustomToken).not.toHaveBeenCalled();
  });

  it('permanently retires a signed-out owner even when the same UID returns', async () => {
    const service = TestBed.inject(SneatAuthWithTelegramService);
    firebase.currentUser = null;
    tokenObserver.next(null);
    firebase.currentUser = account;
    tokenObserver.next(account);
    await flushToken();
    login(service, 'widget');
    expect(post).not.toHaveBeenCalled();
    expect(signInWithCustomToken).not.toHaveBeenCalled();
  });

  it('never revives the old control after a different UID appears pending and A returns', async () => {
    const service = TestBed.inject(SneatAuthWithTelegramService);
    const pending = deferredToken();
    const other = { ...account, uid: 'account-B', getIdToken: () => pending.promise } as User;
    firebase.currentUser = other;
    tokenObserver.next(other);
    firebase.currentUser = account;
    tokenObserver.next(account);
    await flushToken();
    pending.resolve('synthetic-stale-B');
    await flushToken();
    login(service, 'widget');
    expect(post).not.toHaveBeenCalled();
    expect(signInWithCustomToken).not.toHaveBeenCalled();
  });
});
