import {
  Component,
  EnvironmentProviders,
  Provider,
  makeEnvironmentProviders,
  ChangeDetectionStrategy
} from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { RouteReuseStrategy } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular';

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
