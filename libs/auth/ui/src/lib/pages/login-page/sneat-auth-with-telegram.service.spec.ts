import { TestBed } from '@angular/core/testing';
import { SneatApiService } from '@sneat/api';
import { SneatAuthStateService } from '@sneat/auth-core';
import { ErrorLogger } from '@sneat/core';
import { of } from 'rxjs';
import { SneatAuthWithTelegramService } from './sneat-auth-with-telegram.service';

describe('SneatAuthWithTelegramService', () => {
  let api: { post: ReturnType<typeof vi.fn>; postAsAnonymous: ReturnType<typeof vi.fn> };
  let signInWithToken: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    api = {
      post: vi.fn(() => of({ token: 'auth-token' })),
      postAsAnonymous: vi.fn(() => of({ token: 'anon-token' })),
    };
    signInWithToken = vi.fn(() => Promise.resolve());
    TestBed.configureTestingModule({
      providers: [
        SneatAuthWithTelegramService,
        {
          provide: ErrorLogger,
          useValue: { logError: vi.fn(), logErrorHandler: () => vi.fn() },
        },
        { provide: SneatApiService, useValue: api },
        { provide: SneatAuthStateService, useValue: { signInWithToken } },
      ],
    });
  });

  it('should be created', () => {
    expect(TestBed.inject(SneatAuthWithTelegramService)).toBeTruthy();
  });

  it('asks the server for the OpenID client ID and a nonce anonymously', () => {
    TestBed.inject(SneatAuthWithTelegramService).getTelegramOIDCNonce('SneatBot');
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
});
