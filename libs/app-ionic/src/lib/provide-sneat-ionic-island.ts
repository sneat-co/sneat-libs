import {
  Component,
  EnvironmentProviders,
  Provider,
  makeEnvironmentProviders,
  ChangeDetectionStrategy
} from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { RouteReuseStrategy } from '@angular/router';
import { IonicRouteStrategy, NavController } from '@ionic/angular/common';
import { provideIonicAngular } from '@ionic/angular/provide';

/** Route-level Ionic setup for a lazily-loaded Ionic island (e.g. calendar,
 * or a form not yet ported to PrimeNG) inside an otherwise PrimeNG app.
 * Do not install this in a PrimeNG public/cockpit root provider list. */
export function provideSneatIonicIsland(): EnvironmentProviders {
  return makeEnvironmentProviders([provideIonicAngular()]);
}

/** Full Ionic shell: the current, supported provider set for authenticated
 * app roots. Public/PrimeNG callers must not install this shell — use the
 * island provider instead, and only on a lazy route. */
export function provideSneatIonicShell(): EnvironmentProviders {
  const providers: (Provider | EnvironmentProviders)[] = [
    provideIonicAngular(),
    provideAnimationsAsync(),
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    // Keep the token explicit: lazy consumers import it through Ionic's
    // focused entry point and must not depend on tree-shakable root metadata.
    NavController,
  ];
  return makeEnvironmentProviders(providers);
}

/** A semantic boundary for a lazy Ionic route. It deliberately does not create
 * a nested ion-app: that remains owned by a full Ionic shell, not a PrimeNG app. */
@Component({
  selector: 'sneat-ionic-island-host',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content />',
})
export class SneatIonicIslandHostComponent {}
