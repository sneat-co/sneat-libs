import {
  DestroyRef,
  EnvironmentProviders,
  Injectable,
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
import posthog from 'posthog-js';
import { getAngularFireProviders } from './init-firebase';

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
    getRedirectResult(this.authState.fbAuth).catch((error) =>
      console.error('getRedirectResult failed', error),
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
  // Compatibility with getStandardSneatProviders(): start PostHog before the
  // analytics fan-out consumes it. This import is intentionally auth-only.
  if (config.posthog) {
    posthog.init(config.posthog.token, {
      ...config.posthog.config,
      capture_pageview: false,
    });
  }
  const providers: (Provider | EnvironmentProviders)[] = [
    provideErrorLogger(),
    provideChunkLoadErrorRecovery(),
    { provide: EnvConfigToken, useValue: config },
    { provide: LOGGER_FACTORY, useValue: loggerFactory },
    ...getAngularFireProviders(config.firebaseConfig),
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
    provideEnvironmentInitializer(() =>
      inject(SneatAuthenticatedLifecycle).start(),
    ),
  ];
  if (config.sentry) providers.push(provideSentryAppInitializer(config.sentry));
  return makeEnvironmentProviders(providers);
}
