import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IonNote } from '@ionic/angular';
import { ErrorLogger, IErrorLogger } from '@sneat/core';
import { newRandomId } from '@sneat/random';
import {
  ITelegramAuthData,
  ITelegramOIDCNonce,
  SneatAuthWithTelegramService,
} from './sneat-auth-with-telegram.service';
import {
  TelegramLoginConfig,
  TelegramAuthApi,
  telegramAuthApiFactory,
  resolveTelegramBotID,
} from './telegram-login-config';
import {
  ITelegramLoginResult,
  loadTelegramLoginScript,
  telegramLoginApi,
} from './telegram-login-js';

/** fetch()'s rejection messages for a request that got no response. */
const FETCH_FAILURE = /Failed to fetch|NetworkError|Load failed/;

/**
 * A request that got no HTTP response at all: blocked by CORS, offline, or
 * DNS. Angular reports these as status 0; fetch rejects with a TypeError
 * whose message is browser-specific. Any other TypeError is a bug, not a
 * network failure, and keeps the legacy-widget fallback.
 */
export function isNetworkError(err: unknown): boolean {
  if (err instanceof TypeError) return FETCH_FAILURE.test(err.message);
  return (
    typeof err === 'object' &&
    err !== null &&
    (err as { status?: unknown }).status === 0
  );
}

/** Server nonces live 10 minutes; refresh well inside that. */
const OIDC_NONCE_REFRESH_MS = 8 * 60 * 1000;

type LegacyTelegramWindow = Window & {
  [name: `sneatTelegramAuth_${string}`]:
    ((data: ITelegramAuthData) => void) | undefined;
};

/**
 * Telegram login button. Bots with OpenID login configured server-side use
 * Telegram's OpenID popup (telegram-login.js); others keep the legacy Login
 * Widget (telegram-widget.js), e.g. the local dev bot.
 */
@Component({
  providers: [
    SneatAuthWithTelegramService,
    { provide: TelegramAuthApi, useFactory: telegramAuthApiFactory },
  ],
  selector: 'sneat-login-with-telegram',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonNote],
  template: `
    @if (unreachable()) {
      <ion-note class="tg-unreachable" color="danger" role="status">
        Telegram login is unavailable: we couldn't reach the sign-in server
        (network or site configuration problem). Please use another method or
        try again later.
      </ion-note>
    }
    @if (oidc(); as cfg) {
      <button
        type="button"
        class="tg-oidc-login"
        [attr.data-size]="size()"
        (click)="loginWithOIDC(cfg)"
      >
        Log in with Telegram
      </button>
    }
  `,
  styles: [
    `
      .tg-oidc-login {
        background: #54a9eb;
        color: #082f49;
        border: 0;
        border-radius: 20px;
        font-weight: 500;
        cursor: pointer;
        font-size: 16px;
        padding: 10px 21px;
      }
      .tg-oidc-login[data-size='medium'] {
        font-size: 14px;
        padding: 8px 16px;
      }
      .tg-oidc-login[data-size='small'] {
        font-size: 13px;
        padding: 6px 12px;
      }
    `,
  ],
})
export class LoginWithTelegramComponent implements OnInit {
  private readonly el = inject(ElementRef);
  private readonly document = inject<Document>(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly errorLogger = inject<IErrorLogger>(ErrorLogger);
  readonly authWithTelegram = inject(SneatAuthWithTelegramService);
  private readonly telegramLoginConfig = inject(TelegramLoginConfig, {
    optional: true,
  });

  private nonceTimer?: ReturnType<typeof setInterval>;
  private widgetObserver?: MutationObserver;
  private legacyCallback?: (data: ITelegramAuthData) => void;
  private readonly legacyCallbackName = `sneatTelegramAuth_${newRandomId({
    len: 20,
    digits: true,
    lowerCaseLetters: true,
    upperCaseLetters: true,
  })}` as const;

  constructor() {
    // Register while the view is alive, never from a late loader continuation.
    this.destroyRef.onDestroy(() => {
      clearInterval(this.nonceTimer);
      this.widgetObserver?.disconnect();
      const host = this.document.defaultView as LegacyTelegramWindow | null;
      if (host && host[this.legacyCallbackName] === this.legacyCallback)
        delete host[this.legacyCallbackName];
    });
  }

  public readonly authenticated = output<void>();
  public readonly authenticationFailed = output<void>();

  public readonly isUserAuthenticated = input(false);

  public readonly botID = input<string>(
    resolveTelegramBotID(this.telegramLoginConfig, location.hostname),
  );

  public readonly size = input<'small' | 'medium' | 'large'>('large');
  public readonly requestAccess = input<'write' | 'read'>('write');
  public readonly userPic = input(true);

  /** Set when the nonce request never reached the server (CORS, offline). */
  protected readonly unreachable = signal(false);

  /** Set once the OpenID popup can be offered: Client ID plus a live nonce. */
  protected readonly oidc = signal<ITelegramOIDCNonce | undefined>(undefined);

  ngOnInit() {
    this.authWithTelegram.authenticationResult
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((success) => {
        if (success) this.authenticated.emit();
        else this.authenticationFailed.emit();
      });
    const botID = this.botID();
    if (!botID) {
      return;
    }
    this.authWithTelegram
      .getTelegramOIDCNonce(botID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (cfg) => this.startOIDC(botID, cfg),
        error: (err: unknown) => {
          if (isNetworkError(err)) {
            // CORS or offline: the legacy widget would need the same server
            // to finish sign-in, so explain instead of failing silently.
            // Shown inline below; still reported, a CORS misconfig is ours.
            this.errorLogger.logError(
              err,
              'Telegram login server unreachable',
              {
                show: false,
              },
            );
            this.unreachable.set(true);
            return;
          }
          // The server answers 400 for a bot without OpenID login configured.
          this.startLegacyWidget(botID);
        },
      });
  }

  protected loginWithOIDC(cfg: ITelegramOIDCNonce): void {
    if (this.destroyRef.destroyed) return;
    const api = telegramLoginApi(this.document.defaultView ?? window);
    if (!api) {
      this.errorLogger.logErrorHandler('Telegram login library not loaded')(
        new Error('window.Telegram.Login is undefined'),
      );
      return;
    }
    const botID = this.botID();
    // Called straight from the click handler: the library opens its popup
    // synchronously, which keeps the browser's popup blocker out of the way.
    api.auth(
      {
        client_id: Number(cfg.clientID),
        nonce: cfg.nonce,
        request_access: this.requestAccess() === 'write' ? ['write'] : [],
      },
      (result: ITelegramLoginResult) => {
        if (result.id_token && !this.destroyRef.destroyed) {
          this.authWithTelegram.loginWithTelegramOIDC(
            botID,
            result.id_token,
            this.isUserAuthenticated(),
          );
          this.refreshNonce(botID);
        }
        // result.error (e.g. the user closed the popup) needs no action:
        // the button stays, and the user can try again.
      },
    );
  }

  private startOIDC(botID: string, cfg: ITelegramOIDCNonce): void {
    loadTelegramLoginScript(this.document).then(() => {
      if (this.destroyRef.destroyed) return;
      this.oidc.set(cfg);
      clearInterval(this.nonceTimer);
      this.widgetObserver?.disconnect();
      this.nonceTimer = setInterval(
        () => this.refreshNonce(botID),
        OIDC_NONCE_REFRESH_MS,
      );
    }, this.errorLogger.logErrorHandler('Failed to load Telegram login library'));
  }

  private refreshNonce(botID: string): void {
    this.authWithTelegram
      .getTelegramOIDCNonce(botID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (cfg) => this.oidc.set(cfg),
        error: this.errorLogger.logErrorHandler(
          'Failed to refresh Telegram login nonce',
        ),
      });
  }

  private startLegacyWidget(botID: string): void {
    if (this.destroyRef.destroyed) return;
    this.legacyCallback = (tgAuthData: ITelegramAuthData) => {
      if (this.destroyRef.destroyed) return;
      // https://core.telegram.org/widgets/login-legacy
      // After a successful authorization, the widget returns data
      // by calling the callback function data-onauth with the JSON-object containing
      // id, first_name, last_name, username, photo_url, auth_date and hash fields.
      this.authWithTelegram.loginWithTelegram(
        botID,
        tgAuthData,
        this.isUserAuthenticated(),
      );
    };

    const host = this.document.defaultView as LegacyTelegramWindow | null;
    if (!host) return;
    host[this.legacyCallbackName] = this.legacyCallback;
    const script = this.document.createElement('script');

    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', botID);
    script.setAttribute('data-request-access', this.requestAccess());
    script.setAttribute('data-size', this.size());
    if (!this.userPic()) {
      script.setAttribute('data-userpic', 'false');
    }
    script.setAttribute('data-onauth', `${this.legacyCallbackName}(user)`);
    // The legacy widget inserts its iframe asynchronously without a title.
    // Observe only this widget, and leave an upstream accessible name intact.
    const element = this.el.nativeElement as HTMLElement;
    this.widgetObserver = new MutationObserver(() => {
      for (const frame of element.querySelectorAll('iframe')) {
        if (!frame.title.trim()) frame.title = 'Log in with Telegram';
      }
    });
    this.widgetObserver.observe(element, { childList: true, subtree: true });
    element.appendChild(script);
  }
}
