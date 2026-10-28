import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { LoginWithTelegramComponent } from '../../pages/login-page/login-with-telegram.component';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  SneatApiAuthTokenBridge,
  SneatApiBaseUrl,
  SneatApiService,
} from '@sneat/api';
import {
  AuthStatuses,
  ISneatAuthState,
  ISneatAuthUser,
  SneatAuthStateService,
} from '@sneat/auth-core';
import { ErrorLogger } from '@sneat/core';
import { BehaviorSubject } from 'rxjs';
import { TelegramLoginConfig } from '../../pages/login-page/telegram-login-config';
import { TelegramAuthAccountComponent } from './telegram-auth-account.component';

describe('shared Telegram Quick login with real widget', () => {
  let state: BehaviorSubject<ISneatAuthState>;
  let http: HttpTestingController;
  let fixture: ComponentFixture<TelegramAuthAccountComponent>;
  const signInWithToken = vi.fn(() => Promise.resolve());
  const ready = (uid: string): ISneatAuthState => ({
    status: AuthStatuses.authenticated,
    user: { uid } as ISneatAuthUser,
  });
  const proof = {
    id: 123,
    first_name: 'Test',
    auth_date: 1,
    hash: 'synthetic',
  };
  function widget() {
    const expression = fixture.nativeElement
      .querySelector('script[data-onauth]')
      .getAttribute('data-onauth');
    const name = expression.slice(0, -6);
    const callback = (
      window as unknown as Record<string, (data: unknown) => void>
    )[name];
    return { name, callback };
  }
  async function disconnected() {
    http
      .expectOne('https://telegram.test/v0/auth/telegram-link')
      .flush({ connected: false });
    await fixture.whenStable();
    http
      .expectOne(
        'https://telegram.test/v0/auth/telegram-oidc-nonce?botID=AppBot',
      )
      .flush({}, { status: 400, statusText: 'Legacy bot' });
    await fixture.whenStable();
  }
  beforeEach(async () => {
    signInWithToken.mockClear();
    state = new BehaviorSubject(ready('A'));
    await TestBed.configureTestingModule({
      imports: [TelegramAuthAccountComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: SneatApiBaseUrl, useValue: 'https://root.test/v0/' },
        {
          provide: TelegramLoginConfig,
          useValue: {
            botID: 'AppBot',
            apiBaseUrl: 'https://telegram.test/v0/',
          },
        },
        {
          provide: SneatAuthStateService,
          useValue: { authState: state, signInWithToken },
        },
        { provide: ErrorLogger, useValue: { logErrorHandler: () => vi.fn() } },
      ],
    })
      .overrideComponent(TelegramAuthAccountComponent, {
        set: {
          imports: [LoginWithTelegramComponent],
          schemas: [CUSTOM_ELEMENTS_SCHEMA],
        },
      })
      .compileComponents();
    TestBed.inject(SneatApiAuthTokenBridge).setExplicitToken('synthetic-A');
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(TelegramAuthAccountComponent);
    await fixture.whenStable();
  });
  afterEach(() => {
    http.verify();
    TestBed.resetTestingModule();
  });
  it('uses configured Telegram backend and shared bearer, refreshes zoneless, leaves default API unchanged', async () => {
    await disconnected();
    widget().callback(proof);
    const request = http.expectOne(
      'https://telegram.test/v0/auth/login-from-telegram-widget?botID=AppBot',
    );
    expect(request.request.headers.get('Authorization')).toBe(
      'Bearer synthetic-A',
    );
    request.flush({ token: 'synthetic-login-token' });
    await fixture.whenStable();
    http
      .expectOne('https://telegram.test/v0/auth/telegram-link')
      .flush({ connected: true, username: 'authoritative' });
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain(
      'Connected as @authoritative',
    );
    expect(signInWithToken).toHaveBeenCalledWith('synthetic-login-token');
    TestBed.inject(SneatApiService).get('unchanged').subscribe();
    http.expectOne('https://root.test/v0/unchanged').flush({});
  });
  it('rejects old callbacks immediately on account switch, removes them, and cancels old requests', async () => {
    await disconnected();
    const old = widget();
    old.callback(proof);
    const pending = http.expectOne(
      'https://telegram.test/v0/auth/login-from-telegram-widget?botID=AppBot',
    );
    state.next(ready('B'));
    expect(pending.cancelled).toBe(true);
    old.callback(proof);
    http.expectNone(
      'https://telegram.test/v0/auth/login-from-telegram-widget?botID=AppBot',
    );
    await fixture.whenStable();
    await disconnected();
    expect(
      (window as unknown as Record<string, unknown>)[old.name],
    ).toBeUndefined();
    expect(widget().name).not.toBe(old.name);
    expect(signInWithToken).not.toHaveBeenCalled();
  });
});
