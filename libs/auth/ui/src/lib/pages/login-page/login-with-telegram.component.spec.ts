import { CUSTOM_ELEMENTS_SCHEMA, Provider } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SneatApiService } from '@sneat/api';
import { SneatAuthStateService } from '@sneat/auth-core';
import { ErrorLogger } from '@sneat/core';
import { Observable, of, throwError } from 'rxjs';
import { LoginWithTelegramComponent } from './login-with-telegram.component';
import { ITelegramOIDCNonce } from './sneat-auth-with-telegram.service';
import { TelegramLoginConfig } from './telegram-login-config';
import { loadTelegramLoginScript } from './telegram-login-js';

// Unit tests never fetch Telegram's library: telegram-login-js.spec.ts
// covers the loader itself.
vi.mock('./telegram-login-js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./telegram-login-js')>()),
  loadTelegramLoginScript: vi.fn(() => Promise.resolve()),
}));

interface IApiMock {
  post: ReturnType<typeof vi.fn>;
  postAsAnonymous: ReturnType<typeof vi.fn>;
}

/** The nonce endpoint answers with `oidc`, or fails (a bot without OpenID). */
function apiMock(oidc?: ITelegramOIDCNonce): IApiMock {
  return {
    post: vi.fn(() => of({ token: 't' })),
    postAsAnonymous: vi.fn((endpoint: string): Observable<unknown> => {
      if (endpoint.startsWith('auth/telegram-oidc-nonce')) {
        return oidc ? of(oidc) : throwError(() => new Error('400'));
      }
      return of({ token: 't' });
    }),
  };
}

async function createComponent(
  extraProviders: Provider[] = [],
  api: IApiMock = apiMock(),
): Promise<ComponentFixture<LoginWithTelegramComponent>> {
  TestBed.resetTestingModule();
  await TestBed.configureTestingModule({
    imports: [LoginWithTelegramComponent],
    providers: [
      {
        provide: ErrorLogger,
        useValue: { logError: vi.fn(), logErrorHandler: () => vi.fn() },
      },
      { provide: SneatApiService, useValue: api },
      {
        provide: SneatAuthStateService,
        useValue: { signInWithToken: vi.fn(() => Promise.resolve()) },
      },
      ...extraProviders,
    ],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
  })
    .overrideComponent(LoginWithTelegramComponent, {
      set: { imports: [], schemas: [CUSTOM_ELEMENTS_SCHEMA] },
    })
    .compileComponents();
  const fixture = TestBed.createComponent(LoginWithTelegramComponent);
  // Zoneless: `autoDetect` is on by default, but change detection is
  // scheduled on a microtask. Draining it here is what runs `ngOnInit`,
  // which zone.js used to flush at the end of `waitForAsync`.
  await fixture.whenStable();
  return fixture;
}

/** Lets the loader's promise settle, then renders what it changed. */
async function settle(
  fixture: ComponentFixture<LoginWithTelegramComponent>,
): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve));
  await fixture.whenStable();
}

function oidcButton(
  fixture: ComponentFixture<LoginWithTelegramComponent>,
): HTMLButtonElement | null {
  return (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
    'button.tg-oidc-login',
  );
}

function legacyWidget(
  fixture: ComponentFixture<LoginWithTelegramComponent>,
): HTMLScriptElement | null {
  return (fixture.nativeElement as HTMLElement).querySelector<HTMLScriptElement>(
    'script[data-telegram-login]',
  );
}

const sneatBot: Provider = {
  provide: TelegramLoginConfig,
  useValue: { botID: 'SneatBot' },
};

type TelegramWindow = { Telegram?: unknown };

afterEach(() => {
  vi.mocked(loadTelegramLoginScript).mockClear();
  delete (window as unknown as TelegramWindow).Telegram;
});

describe('LoginWithTelegramComponent', () => {
  let component: LoginWithTelegramComponent;
  let fixture: ComponentFixture<LoginWithTelegramComponent>;

  beforeEach(async () => {
    fixture = await createComponent();
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('uses the configured botID when TelegramLoginConfig is provided', async () => {
    fixture = await createComponent([
      { provide: TelegramLoginConfig, useValue: { botID: 'DataTugBot' } },
    ]);
    expect(fixture.componentInstance.botID()).toBe('DataTugBot');
  });

  it('keeps the legacy widget for a bot without OpenID login', async () => {
    fixture = await createComponent([sneatBot], apiMock());
    expect(legacyWidget(fixture)?.getAttribute('data-telegram-login')).toBe(
      'SneatBot',
    );
    expect(loadTelegramLoginScript).not.toHaveBeenCalled();
    expect(oidcButton(fixture)).toBeNull();
  });

  it('offers the OpenID popup and signs in with the id_token it returns', async () => {
    const auth = vi.fn();
    (window as unknown as TelegramWindow).Telegram = { Login: { auth } };
    const api = apiMock({ clientID: '6042661328', nonce: 'n-1' });
    fixture = await createComponent([sneatBot], api);
    await settle(fixture);

    expect(loadTelegramLoginScript).toHaveBeenCalledWith(document);
    const button = oidcButton(fixture);
    expect(button).toBeTruthy();
    expect(legacyWidget(fixture)).toBeNull();

    button?.click();
    expect(auth).toHaveBeenCalledWith(
      { client_id: 6042661328, nonce: 'n-1', request_access: ['write'] },
      expect.any(Function),
    );

    const callback = auth.mock.calls[0][1] as (r: { id_token?: string }) => void;
    callback({ id_token: 'jwt' });
    expect(api.postAsAnonymous).toHaveBeenCalledWith(
      'auth/login-from-telegram-oidc?botID=SneatBot',
      { id_token: 'jwt' },
    );
  });

  it('does not post anything when the popup ends without an id_token', async () => {
    const auth = vi.fn();
    (window as unknown as TelegramWindow).Telegram = { Login: { auth } };
    const api = apiMock({ clientID: '6042661328', nonce: 'n-1' });
    fixture = await createComponent([sneatBot], api);
    await settle(fixture);

    oidcButton(fixture)?.click();
    const callback = auth.mock.calls[0][1] as (r: { error?: string }) => void;
    callback({ error: 'popup closed' });
    expect(api.postAsAnonymous).not.toHaveBeenCalledWith(
      expect.stringContaining('login-from-telegram-oidc'),
      expect.anything(),
    );
  });

  it('shows no button when Telegram login library fails to load', async () => {
    // Rejected on call, when the component attaches its handler at once.
    vi.mocked(loadTelegramLoginScript).mockImplementationOnce(() =>
      Promise.reject(new Error('blocked')),
    );
    fixture = await createComponent(
      [sneatBot],
      apiMock({ clientID: '6042661328', nonce: 'n-1' }),
    );
    await settle(fixture);

    expect(oidcButton(fixture)).toBeNull();
    expect(legacyWidget(fixture)).toBeNull();
  });
});
