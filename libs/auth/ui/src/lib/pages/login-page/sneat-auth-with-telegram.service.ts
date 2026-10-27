import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SneatApiService } from '@sneat/api';
import {
  AuthStatuses,
  ISneatAuthState,
  SneatAuthStateService,
} from '@sneat/auth-core';
import { ErrorLogger, IErrorLogger } from '@sneat/core';
import { Observable, filter, take, takeUntil } from 'rxjs';

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
  private readonly destroyRef = inject(DestroyRef);
  private readonly linkUserID?: string;
  private linkContextInvalidated = false;
  private linkState?: ISneatAuthState;

  constructor() {
    // Auth state replays its current principal synchronously. If it is not
    // ready, authenticated linking fails closed for this control's lifetime.
    let initialState: ISneatAuthState | undefined;
    this.authService.authState
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => {
        initialState = state;
      });
    this.linkUserID =
      initialState && this.isAuthenticatedReady(initialState)
        ? initialState.user?.uid
        : undefined;
    this.authService.authState
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => {
        this.linkState = state;
        if (!this.preservesLinkPrincipal(state)) {
          // Never revive an old popup after an A -> B -> A account transition.
          this.linkContextInvalidated = true;
        }
      });
  }

  private isAuthenticatedReady(state: ISneatAuthState): boolean {
    return (
      state.status === AuthStatuses.authenticated &&
      !!state.user?.uid &&
      !state.err &&
      // Older public callers omit loadingPhase. An explicit pending phase is
      // never ready, and the real auth service's ready state needs its token.
      (state.loadingPhase === undefined ||
        (state.loadingPhase === 'ready' && !!state.token))
    );
  }

  private preservesLinkPrincipal(state: ISneatAuthState): boolean {
    return (
      !!this.linkUserID &&
      state.user?.uid === this.linkUserID &&
      !state.err &&
      (this.isAuthenticatedReady(state) ||
        (state.status === AuthStatuses.authenticating &&
          state.loadingPhase === 'getting-token'))
    );
  }

  private linkContextIsReady(): boolean {
    return (
      !this.linkContextInvalidated &&
      !!this.linkState &&
      this.preservesLinkPrincipal(this.linkState) &&
      this.isAuthenticatedReady(this.linkState)
    );
  }

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
    if (isUserAuthenticated && !this.linkContextIsReady()) {
      this.errorLogger.logErrorHandler('Telegram account linking stopped')(
        new Error(
          this.linkContextInvalidated
            ? 'Your sign-in changed. Reload this page before authorizing Telegram.'
            : 'Your sign-in is refreshing. Try again after your account is ready.',
        ),
      );
      return;
    }
    const request = isUserAuthenticated
      ? this.apiService.post<IResponse>(endpoint, body)
      : this.apiService.postAsAnonymous<IResponse>(endpoint, body);
    const guardedRequest = isUserAuthenticated
      ? request.pipe(
          takeUntil(
            this.authService.authState.pipe(
              filter((state) => !this.preservesLinkPrincipal(state)),
            ),
          ),
        )
      : request;
    guardedRequest.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        if (isUserAuthenticated && !this.linkContextIsReady()) return;
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
