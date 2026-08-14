import { inject } from '@angular/core';
import { SNEAT_AUTHENTICATED_LIFECYCLE } from '@sneat/app-public';
import { TopMenuService } from '@sneat/core';

export class BaseAppComponent {
  // Kept protected for existing Ionic-shell templates that inherited it.
  protected readonly topMenuService = inject(TopMenuService);
  private readonly authenticatedLifecycle = inject(
    SNEAT_AUTHENTICATED_LIFECYCLE,
    { optional: true },
  );

  constructor() {
    // Legacy full shells install this at root. PrimeNG apps install it in the
    // lazy authenticated route; its environment initializer starts it there.
    this.authenticatedLifecycle?.start();
  }
}
