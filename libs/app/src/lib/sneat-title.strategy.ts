import { inject, Injectable } from '@angular/core';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { PageTitleService } from './page-title.service';
import { getRouteTitle } from './route-title';

// Single place that owns document.title for every Sneat-based app. On each
// navigation it reads the route's declarative `data['title']` (via getRouteTitle)
// and hands it to PageTitleService, which composes it with the app name.
//
// Pages can override the title imperatively during their lifecycle by calling
// PageTitleService.setPageTitle(...) directly; the next navigation resets it.
//
// Registered once in getStandardSneatProviders, so every app inherits it.
@Injectable()
export class SneatTitleStrategy extends TitleStrategy {
  private readonly pageTitleService = inject(PageTitleService);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    this.pageTitleService.setPageTitle(getRouteTitle(snapshot));
  }
}
