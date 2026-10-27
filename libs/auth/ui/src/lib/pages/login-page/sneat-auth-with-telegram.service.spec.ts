import { TestBed } from '@angular/core/testing';
import { EnvironmentInjector, createEnvironmentInjector } from '@angular/core';
import { SneatApiService } from '@sneat/api';
import {
  AuthStatuses,
  ISneatAuthState,
  ISneatAuthUser,
  SneatAuthStateService,
} from '@sneat/auth-core';
import { ErrorLogger } from '@sneat/core';
import { BehaviorSubject, Subject, of } from 'rxjs';
import { SneatAuthWithTelegramService } from './sneat-auth-with-telegram.service';

describe('SneatAuthWithTelegramService', () => {
  let api: {
    post: ReturnType<typeof vi.fn>;
    postAsAnonymous: ReturnType<typeof vi.fn>;
  };
  let signInWithToken: ReturnType<typeof vi.fn>;
  let authState: BehaviorSubject<ISneatAuthState>;

  const ready = (uid: string): ISneatAuthState => ({
    status: AuthStatuses.authenticated,
    user: { uid } as ISneatAuthUser,
  });

  function login(
    service: SneatAuthWithTelegramService,
    protocol: string,
    authenticated = true,
  ) {
    if (protocol === 'widget') {
      service.loginWithTelegram(
        'DataTugBot',
        {
          id: 1,
          first_name: 'A',
          last_name: 'B',
          auth_date: 1,
          hash: 'synthetic',
        },
        authenticated,
      );
    } else {
      service.loginWithTelegramOIDC(
        'DataTugBot',
        'synthetic-token',
        authenticated,
      );
    }
  }

  const protocols = ['widget', 'oidc'];

  beforeEach(() => {
    api = {
      post: vi.fn(() => of({ token: 'auth-token' })),
      postAsAnonymous: vi.fn(() => of({ token: 'anon-token' })),
    };
    signInWithToken = vi.fn(() => Promise.resolve());
    authState = new BehaviorSubject<ISneatAuthState>(ready('account-A'));
    TestBed.configureTestingModule({
      providers: [
        SneatAuthWithTelegramService,
        {
          provide: ErrorLogger,
          useValue: { logError: vi.fn(), logErrorHandler: () => vi.fn() },
        },
        { provide: SneatApiService, useValue: api },
        {
          provide: SneatAuthStateService,
          useValue: { signInWithToken, authState: authState.asObservable() },
        },
      ],
    });
  });

  it('should be created', () => {
    expect(TestBed.inject(SneatAuthWithTelegramService)).toBeTruthy();
  });

  it('asks the server for the OpenID client ID and a nonce anonymously', () => {
    TestBed.inject(SneatAuthWithTelegramService).getTelegramOIDCNonce(
      'SneatBot',
    );
    expect(api.postAsAnonymous).toHaveBeenCalledWith(
      'auth/telegram-oidc-nonce?botID=SneatBot',
      {},
    );
  });

  it('posts the OpenID id_token and signs in with the returned token', () => {
    TestBed.inject(SneatAuthWithTelegramService).loginWithTelegramOIDC(
      'SneatBot',
      'jwt',
      false,
    );
    expect(api.postAsAnonymous).toHaveBeenCalledWith(
      'auth/login-from-telegram-oidc?botID=SneatBot',
      { id_token: 'jwt' },
    );
    expect(signInWithToken).toHaveBeenCalledWith('anon-token');
  });

  it('uses the authenticated client when linking Telegram to a signed-in user', () => {
    TestBed.inject(SneatAuthWithTelegramService).loginWithTelegramOIDC(
      'SneatBot',
      'jwt',
      true,
    );
    expect(api.post).toHaveBeenCalledWith(
      'auth/login-from-telegram-oidc?botID=SneatBot',
      { id_token: 'jwt' },
    );
    expect(signInWithToken).toHaveBeenCalledWith('auth-token');
  });

  it('keeps the legacy widget endpoint for widget payloads', () => {
    TestBed.inject(SneatAuthWithTelegramService).loginWithTelegram(
      'AlextDevBot',
      { id: 1, first_name: 'A', last_name: 'B', auth_date: 1, hash: 'h' },
      false,
    );
    expect(api.postAsAnonymous).toHaveBeenCalledWith(
      'auth/login-from-telegram-widget?botID=AlextDevBot',
      expect.objectContaining({ id: 1, hash: 'h' }),
    );
  });

  it.each(protocols)(
    'cancels a pending %s response when its provider scope is destroyed',
    (protocol) => {
      const pending = new Subject<{ token: string }>();
      api.post.mockReturnValue(pending);
      const owner = createEnvironmentInjector(
        [SneatAuthWithTelegramService],
        TestBed.inject(EnvironmentInjector),
      );
      login(owner.get(SneatAuthWithTelegramService), protocol);
      expect(pending.observers).toHaveLength(1);
      owner.destroy();
      expect(pending.observers).toHaveLength(0);
      pending.next({ token: 'late-A' });
      expect(signInWithToken).not.toHaveBeenCalled();
    },
  );

  it.each(protocols)(
    'cancels account A pending %s before render and accepts a fresh account B control',
    (protocol) => {
      const pending = new Subject<{ token: string }>();
      api.post.mockReturnValue(pending);
      const parent = TestBed.inject(EnvironmentInjector);
      const ownerA = createEnvironmentInjector(
        [SneatAuthWithTelegramService],
        parent,
      );
      login(ownerA.get(SneatAuthWithTelegramService), protocol);
      authState.next(ready('account-B'));
      expect(pending.observers).toHaveLength(0);
      pending.next({ token: 'late-A' });
      expect(signInWithToken).not.toHaveBeenCalled();
      ownerA.destroy();
      api.post.mockReturnValue(of({ token: 'fresh-B' }));
      const ownerB = createEnvironmentInjector(
        [SneatAuthWithTelegramService],
        parent,
      );
      login(ownerB.get(SneatAuthWithTelegramService), protocol);
      expect(signInWithToken).toHaveBeenCalledExactlyOnceWith('fresh-B');
      ownerB.destroy();
    },
  );

  it.each(protocols)(
    'refuses an old %s callback before render and after A to B to A',
    (protocol) => {
      const service = TestBed.inject(SneatAuthWithTelegramService);
      authState.next(ready('account-B'));
      login(service, protocol);
      authState.next(ready('account-A'));
      login(service, protocol);
      expect(api.post).not.toHaveBeenCalled();
      expect(api.postAsAnonymous).not.toHaveBeenCalled();
      expect(signInWithToken).not.toHaveBeenCalled();
    },
  );

  it.each(['checking-session', 'failed'] as const)(
    'permanently rejects an unexpected same-UID %s phase',
    (loadingPhase) => {
      const service = TestBed.inject(SneatAuthWithTelegramService);
      authState.next({ ...ready('account-A'), status: AuthStatuses.authenticating, loadingPhase });
      authState.next(ready('account-A'));
      login(service, 'widget');
      expect(api.post).not.toHaveBeenCalled();
      expect(signInWithToken).not.toHaveBeenCalled();
    },
  );

  it('refuses a missing authenticated owner while preserving anonymous sign-in', () => {
    authState.next({ status: AuthStatuses.notAuthenticated });
    const service = TestBed.inject(SneatAuthWithTelegramService);
    login(service, 'widget');
    expect(api.post).not.toHaveBeenCalled();
    authState.next(ready('account-A'));
    login(service, 'widget');
    expect(api.post).not.toHaveBeenCalled();
    login(service, 'widget', false);
    expect(api.postAsAnonymous).toHaveBeenCalledOnce();
    expect(signInWithToken).toHaveBeenCalledWith('anon-token');
  });
});
