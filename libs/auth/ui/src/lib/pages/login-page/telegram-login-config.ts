import { InjectionToken } from '@angular/core';

export interface ITelegramLoginConfig {
  /** Telegram bot username (without leading @) used for the login widget. */
  readonly botID: string;
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
