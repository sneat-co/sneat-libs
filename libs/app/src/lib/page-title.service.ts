import { inject, Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { APP_INFO, IAppInfo } from '@sneat/core';

// Owns the browser/document title. A page can set it imperatively during its
// lifecycle, e.g. once a record loads:
//   inject(PageTitleService).setPageTitle(space.title)
//
// Composes the "bare" page title with the app name (APP_INFO.appTitle, e.g.
// "Debtus.app") => "Debts @ Debtus.app", or just the app name when no page
// title is given. SneatTitleStrategy calls this on every navigation with the
// route's declarative data.title, so a value set by one page does not leak into
// the next.
//
// If the app forgot to register APP_INFO we fall back to the current host name
// (e.g. "debtus.app") and warn once, so the title is still sensible while
// surfacing the misconfiguration to the developer.
@Injectable({ providedIn: 'root' })
export class PageTitleService {
  private readonly title = inject(Title);
  private readonly appInfo = inject<IAppInfo>(APP_INFO, { optional: true });
  private readonly appTitle: string;

  constructor() {
    if (this.appInfo?.appTitle) {
      this.appTitle = this.appInfo.appTitle;
    } else {
      this.appTitle = location.host;
      console.warn(
        `[PageTitleService] APP_INFO is not provided (or has no appTitle). ` +
          `Falling back to host "${this.appTitle}" for the document title. ` +
          `Register it via provideAppInfo({ appId, appTitle }).`,
      );
    }
  }

  setPageTitle(pageTitle: string | undefined): void {
    this.title.setTitle(
      pageTitle ? `${pageTitle} @ ${this.appTitle}` : this.appTitle,
    );
  }
}
