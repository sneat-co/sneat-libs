import { InjectionToken, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { SneatApiService, SneatApiAuthTokenBridge } from '@sneat/api';
import { SneatUrlOperationBlocker } from '@sneat/core';

export interface ITelegramLoginConfig {
  /** Telegram bot username (without leading @) used for the login widget. */
  readonly botID: string;
  /** Optional backend base URL, including /v0/, for all Telegram auth calls. */
  readonly apiBaseUrl?: string;
  /** Optional bot username used when the hostname starts with "local". */
  readonly localBotID?: string;
}

export const TelegramLoginConfig = new InjectionToken<ITelegramLoginConfig>(
  'TelegramLoginConfig',
);

/**
 * Resolves the Telegram bot username for the login widget.
 * Falls back to the historical Sneat defaults when no config is provided.
 */
export function resolveTelegramBotID(
  config: ITelegramLoginConfig | null,
  hostname: string,
): string {
  const isLocal = hostname.startsWith('local');
  if (config) {
    return isLocal && config.localBotID ? config.localBotID : config.botID;
  }
  return isLocal ? 'AlextDevBot' : 'SneatBot';
}

/** Telegram can use an app backend while other auth providers retain their API. */
export function telegramAuthApiFactory(): SneatApiService {
  const config = inject(TelegramLoginConfig, { optional: true });
  if (!config?.apiBaseUrl) return inject(SneatApiService);
  return new SneatApiService(
    inject(HttpClient),
    inject(SneatApiAuthTokenBridge),
    config.apiBaseUrl.endsWith('/')
      ? config.apiBaseUrl
      : config.apiBaseUrl + '/',
    inject(SneatUrlOperationBlocker),
  );
}

export const TelegramAuthApi = new InjectionToken<SneatApiService>(
  'TelegramAuthApi',
  {
    providedIn: 'root',
    factory: telegramAuthApiFactory,
  },
);
