import { inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import {
  AuthStatus,
  SneatAuthStateService,
  TelegramAuthService,
} from '@sneat/auth-core';
import { AnalyticsService, clearCurrentSpace, TopMenuService } from '@sneat/core';
import { filter } from 'rxjs';

export class BaseAppComponent {
  private readonly telegramAuthService = inject(TelegramAuthService);
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly analyticsService = inject(AnalyticsService);
  private readonly titleService = inject(Title);
  private readonly authStateService = inject(SneatAuthStateService);
  protected readonly topMenuService = inject(TopMenuService); // used in templates

  private authStatus?: AuthStatus;

  constructor() {
    this.telegramAuthService.authenticateIfTelegramWebApp();
    this.authStateService.authState.subscribe((s) => {
      this.authStatus = s.status;
    });
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        let route = this.activatedRoute.firstChild;
        while (route?.firstChild) {
          route = route.firstChild;
        }
        let title = route?.snapshot.data['title'];
        if (title) {
          const spaceType = route?.snapshot?.paramMap?.get('spaceType');
          if (spaceType) {
            title = `${capitalizeFirstLetter(spaceType)} ${title}`;
          }
        }
        this.analyticsService.logEvent('$pageview', {
          page_path: event.urlAfterRedirects,
          title,
        });
        title = title ? `${title} @ Sneat.App` : 'Sneat.App'; // Default title
        this.titleService.setTitle(title);

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

function capitalizeFirstLetter(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
