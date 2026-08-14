import { inject, Injectable } from '@angular/core';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { PageTitleService } from './page-title.service';
import { getRouteTitle } from './route-title';

@Injectable()
export class SneatTitleStrategy extends TitleStrategy {
  private readonly pageTitleService = inject(PageTitleService);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    this.pageTitleService.setPageTitle(getRouteTitle(snapshot));
  }
}
