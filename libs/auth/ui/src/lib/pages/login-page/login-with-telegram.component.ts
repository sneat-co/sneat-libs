import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ErrorLogger, IErrorLogger } from '@sneat/core';
import {
  ITelegramAuthData,
  ITelegramOIDCNonce,
  SneatAuthWithTelegramService,
} from './sneat-auth-with-telegram.service';
import {
  TelegramLoginConfig,
  resolveTelegramBotID,
} from './telegram-login-config';
import {
  ITelegramLoginResult,
  loadTelegramLoginScript,
  telegramLoginApi,
} from './telegram-login-js';

/** Server nonces live 10 minutes; refresh well inside that. */
const OIDC_NONCE_REFRESH_MS = 8 * 60 * 1000;

/**
 * Telegram login button. Bots with OpenID login configured server-side use
 * Telegram's OpenID popup (telegram-login.js); others keep the legacy Login
 * Widget (telegram-widget.js), e.g. the local dev bot.
 */
@Component({
  providers: [SneatAuthWithTelegramService],
  selector: 'sneat-login-with-telegram',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
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
        color: #fff;
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
  private legacyCallback?: (data: ITelegramAuthData) => void;

  constructor() {
    // Register while the view is alive, never from a late loader continuation.
    this.destroyRef.onDestroy(() => {
      clearInterval(this.nonceTimer);
      const host = this.document.defaultView as
        | (Window & { onTelegramAuth?: (data: ITelegramAuthData) => void })
        | null;
      if (host && host.onTelegramAuth === this.legacyCallback)
        delete host.onTelegramAuth;
    });
  }

  public readonly isUserAuthenticated = input(false);

  public readonly botID = input<string>(
    resolveTelegramBotID(this.telegramLoginConfig, location.hostname),
  );

  public readonly size = input<'small' | 'medium' | 'large'>('large');
  public readonly requestAccess = input<'write' | 'read'>('write');
  public readonly userPic = input(true);

  /** Set once the OpenID popup can be offered: Client ID plus a live nonce. */
  protected readonly oidc = signal<ITelegramOIDCNonce | undefined>(undefined);

  ngOnInit() {
    const botID = this.botID();
    if (!botID) {
      return;
    }
    this.authWithTelegram
      .getTelegramOIDCNonce(botID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (cfg) => this.startOIDC(botID, cfg),
        // The server answers 400 for a bot without OpenID login configured.
        error: () => this.startLegacyWidget(botID),
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

    const host = this.document.defaultView as
      | (Window & { onTelegramAuth?: (data: ITelegramAuthData) => void })
      | null;
    if (!host) return;
    host.onTelegramAuth = this.legacyCallback;
    const script = this.document.createElement('script');

    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', botID);
    script.setAttribute('data-request-access', this.requestAccess());
    script.setAttribute('data-size', this.size());
    if (!this.userPic()) {
      script.setAttribute('data-userpic', 'false');
    }
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    this.el.nativeElement.appendChild(script);
  }
}
