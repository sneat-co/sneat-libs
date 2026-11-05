import { isPlatformBrowser } from '@angular/common';
import {
  DestroyRef,
  EnvironmentProviders,
  Injectable,
  PLATFORM_ID,
  Provider,
  inject,
  makeEnvironmentProviders,
  provideEnvironmentInitializer,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { provideFirebaseSneatApiAuth } from '@sneat/api-firebase-auth';
import {
  getRouteTitle,
  SNEAT_AUTHENTICATED_LIFECYCLE,
} from '@sneat/app-public';
import {
  AuthStatus,
  LoginRequiredServiceService,
  SneatAuthGuard,
  SneatAuthStateService,
  SneatUserService,
  TelegramAuthService,
} from '@sneat/auth-core';
import {
  AnalyticsService,
  clearCurrentSpace,
  EnvConfigToken,
  IEnvironmentConfig,
  LOGGER_FACTORY,
  loggerFactory,
  TopMenuService,
} from '@sneat/core';
import {
  provideChunkLoadErrorRecovery,
  provideErrorLogger,
  provideSentryAppInitializer,
  provideSneatAnalytics,
} from '@sneat/logging';
import { getRedirectResult } from 'firebase/auth';
import { filter } from 'rxjs';
import { provideSneatFirebase } from './provide-sneat-firebase';

@Injectable()
export class SneatAuthenticatedLifecycle {
  private started = false;
  private authStatus?: AuthStatus;
  private readonly telegram = inject(TelegramAuthService);
  private readonly authState = inject(SneatAuthStateService);
  private readonly router = inject(Router);
  private readonly analytics = inject(AnalyticsService);
  private readonly destroyRef = inject(DestroyRef);

  start(): void {
    if (this.started) return;
    this.started = true;
    this.telegram.authenticateIfTelegramWebApp();
    getRedirectResult(this.authState.fbAuth).then(
      // An empty result after a redirect this app started is a silent
      // failure; the auth state service tells the login page.
      (credential) => this.authState.onRedirectSignInResult(credential),
      (error) => {
        // An email that already has an account surfaces here after a redirect
        // sign-in: keep the credential so it links on the next sign-in.
        const handled = !!this.authState.rememberPendingCredentialLink(error);
        if (!handled) console.error('getRedirectResult failed', error);
        this.authState.onRedirectSignInError(error, handled);
      },
    );
    this.authState.authState
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => (this.authStatus = state.status));
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event: NavigationEnd) => {
        this.analytics.logEvent('$pageview', {
          page_path: event.urlAfterRedirects,
          title: getRouteTitle(this.router.routerState.snapshot),
        });
        if (
          this.authStatus === 'authenticated' &&
          !event.urlAfterRedirects.startsWith('/space/') &&
          !event.urlAfterRedirects.startsWith('/login') &&
          !event.urlAfterRedirects.startsWith('/signed-out')
        ) {
          clearCurrentSpace();
        }
      });
  }
}

/** Install in the lazy authenticated route's `providers`. Firebase, analytics,
 * auth lifecycle and protected API transport are then absent from public routes. */
export function provideSneatAuthenticatedProviders(
  config: IEnvironmentConfig,
): EnvironmentProviders {
  const providers: (Provider | EnvironmentProviders)[] = [
    provideErrorLogger(),
    provideChunkLoadErrorRecovery(),
    { provide: EnvConfigToken, useValue: config },
    { provide: LOGGER_FACTORY, useValue: loggerFactory },
    provideSneatFirebase(config.firebaseConfig),
    provideFirebaseSneatApiAuth(),
    provideSneatAnalytics(config),
    SneatAuthStateService,
    SneatAuthGuard,
    SneatUserService,
    TelegramAuthService,
    LoginRequiredServiceService,
    TopMenuService,
    SneatAuthenticatedLifecycle,
    {
      provide: SNEAT_AUTHENTICATED_LIFECYCLE,
      useExisting: SneatAuthenticatedLifecycle,
    },
    provideEnvironmentInitializer(() => {
      if (isPlatformBrowser(inject(PLATFORM_ID))) {
        inject(SneatAuthenticatedLifecycle).start();
      }
    }),
  ];
  if (config.sentry) providers.push(provideSentryAppInitializer(config.sentry));
  return makeEnvironmentProviders(providers);
}
