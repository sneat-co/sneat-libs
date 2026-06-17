import { inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import {
  AuthStatus,
  SneatAuthStateService,
  TelegramAuthService,
} from '@sneat/auth-core';
import {
  AnalyticsService,
  clearCurrentSpace,
  TopMenuService,
} from '@sneat/core';
import { getRedirectResult } from 'firebase/auth';
import { filter } from 'rxjs';
import { getRouteTitle } from './route-title';

export class BaseAppComponent {
  private readonly telegramAuthService = inject(TelegramAuthService);
  private readonly router = inject(Router);
  private readonly analyticsService = inject(AnalyticsService);
  private readonly authStateService = inject(SneatAuthStateService);
  protected readonly topMenuService = inject(TopMenuService); // used in templates

  private authStatus?: AuthStatus;

  constructor() {
    this.telegramAuthService.authenticateIfTelegramWebApp();
    // Complete any pending signInWithRedirect when the app boots. The
    // authStateService's onIdTokenChanged listener then propagates the
    // signed-in user. Resolves to null (harmless) when sign-in used a popup or
    // there is no pending redirect. Lives here so every app that extends
    // BaseAppComponent gets redirect-based sign-in for free.
    getRedirectResult(this.authStateService.fbAuth).catch((err) =>
      console.error('getRedirectResult failed', err),
    );
    this.authStateService.authState.subscribe((s) => {
      this.authStatus = s.status;
    });
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        // The document title itself is owned by SneatTitleStrategy; here we only
        // reuse the same derived page title for the analytics pageview event.
        const title = getRouteTitle(this.router.routerState.snapshot);
        this.analyticsService.logEvent('$pageview', {
          page_path: event.urlAfterRedirects,
          title,
        });

        this.forgetCurrentSpaceIfLeftSpaces(event.urlAfterRedirects);
      });
  }

  // Keep the persisted current space in sync with where an authenticated user is:
  // once they navigate to a non-space page, forget it so login does not bounce them
  // back to a space they had left. Auth routes are ignored so signing out from a
  // space still restores it; the `authenticated` guard preserves the value during
  // the logged-out login flow so the login page can still read it.
  private forgetCurrentSpaceIfLeftSpaces(url: string): void {
    if (this.authStatus !== 'authenticated') {
      return;
    }
    if (
      url.startsWith('/space/') ||
      url.startsWith('/login') ||
      url.startsWith('/signed-out')
    ) {
      return;
    }
    clearCurrentSpace();
  }
}
