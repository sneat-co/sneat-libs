/**
 * Telegram's OpenID login library for websites.
 * https://core.telegram.org/bots/telegram-login
 */
export const TELEGRAM_LOGIN_JS_URL =
  'https://oauth.telegram.org/js/telegram-login.js?6';

export interface ITelegramLoginOptions {
  /** The bot's Client ID from @BotFather (Login Widget section). */
  client_id: number;
  /** Server-issued nonce; Telegram echoes it into the id_token. */
  nonce?: string;
  /**
   * `['write']` asks permission for the bot to message the user. Because no
   * `scope` is passed, the library also requests `profile`, whose `id` claim
   * carries the numeric Telegram user ID the server signs in with.
   */
  request_access?: string[];
  lang?: string;
}

export interface ITelegramLoginResult {
  id_token?: string;
  user?: Record<string, unknown>;
  error?: string;
}

interface ITelegramLoginApi {
  auth(
    options: ITelegramLoginOptions,
    callback: (result: ITelegramLoginResult) => void,
  ): void;
}

export function telegramLoginApi(win: Window): ITelegramLoginApi | undefined {
  return (win as unknown as { Telegram?: { Login?: ITelegramLoginApi } })
    .Telegram?.Login;
}

/** Loads telegram-login.js once per document; resolves once it has loaded. */
export function loadTelegramLoginScript(doc: Document): Promise<void> {
  const existing = doc.querySelector<HTMLScriptElement>(
    `script[src="${TELEGRAM_LOGIN_JS_URL}"]`,
  );
  if (existing?.dataset['loaded'] === 'true') {
    return Promise.resolve();
  }
  return new Promise<void>((resolve, reject) => {
    const script = existing ?? doc.createElement('script');
    script.addEventListener(
      'load',
      () => {
        script.dataset['loaded'] = 'true';
        resolve();
      },
      { once: true },
    );
    script.addEventListener(
      'error',
      () => reject(new Error('Failed to load ' + TELEGRAM_LOGIN_JS_URL)),
      { once: true },
    );
    if (!existing) {
      script.async = true;
      script.src = TELEGRAM_LOGIN_JS_URL;
      doc.head.appendChild(script);
    }
  });
}
