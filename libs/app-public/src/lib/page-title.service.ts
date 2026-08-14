import { inject, Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { APP_INFO, IAppInfo } from '@sneat/core-public';

/** Owns document.title for both lightweight public and legacy full shells. */
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
