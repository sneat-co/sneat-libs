import { Injectable, inject } from '@angular/core';
import { SneatApiService } from '@sneat/api';
import { SneatAuthStateService } from '@sneat/auth-core';
import { ErrorLogger, IErrorLogger } from '@sneat/core';
import { Observable } from 'rxjs';

export interface ITelegramAuthData {
  id: number;
  first_name: string;
  last_name: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

/** What the server hands the page before it opens Telegram's OpenID popup. */
export interface ITelegramOIDCNonce {
  clientID: string;
  nonce: string;
}

interface IResponse {
  token: string;
}

@Injectable()
export class SneatAuthWithTelegramService {
  private readonly errorLogger = inject<IErrorLogger>(ErrorLogger);
  private readonly apiService = inject(SneatApiService);
  private readonly authService = inject(SneatAuthStateService);

  /** Legacy Login Widget: posts the widget's signed payload. */
  public loginWithTelegram(
    botID: string,
    tgAuthData: ITelegramAuthData,
    isUserAuthenticated: boolean,
  ): void {
    this.signIn(
      'auth/login-from-telegram-widget?botID=' + botID,
      tgAuthData,
      isUserAuthenticated,
    );
  }

  /**
   * Asks the server for the bot's OpenID Client ID and a fresh nonce. Fails
   * with 400 for a bot that has no OpenID login configured server-side.
   */
  public getTelegramOIDCNonce(botID: string): Observable<ITelegramOIDCNonce> {
    return this.apiService.postAsAnonymous<ITelegramOIDCNonce>(
      'auth/telegram-oidc-nonce?botID=' + botID,
      {},
    );
  }

  /** OpenID login: posts the id_token Telegram's popup returned. */
  public loginWithTelegramOIDC(
    botID: string,
    idToken: string,
    isUserAuthenticated: boolean,
  ): void {
    this.signIn(
      'auth/login-from-telegram-oidc?botID=' + botID,
      { id_token: idToken },
      isUserAuthenticated,
    );
  }

  private signIn(
    endpoint: string,
    body: unknown,
    isUserAuthenticated: boolean,
  ): void {
    const request = isUserAuthenticated
      ? this.apiService.post<IResponse>(endpoint, body)
      : this.apiService.postAsAnonymous<IResponse>(endpoint, body);
    request.subscribe({
      next: (response) => {
        this.authService
          .signInWithToken(response.token)
          .catch(
            this.errorLogger.logErrorHandler(
              'Failed to sign-in with custom token',
            ),
          );
      },
      error: this.errorLogger.logErrorHandler('signInWithTelegram() error:'),
    });
  }
}
