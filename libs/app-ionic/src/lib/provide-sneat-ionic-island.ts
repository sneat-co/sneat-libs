import {
  Component,
  EnvironmentProviders,
  Provider,
  makeEnvironmentProviders,
} from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { RouteReuseStrategy } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';

/** Route-level Ionic setup for specialist islands (calendar and legacy forms).
 * Do not install this in a PrimeNG public/cockpit root provider list. */
export function provideSneatIonicIsland(): EnvironmentProviders {
  return makeEnvironmentProviders([provideIonicAngular()]);
}

/** Legacy full-Ionic shell compatibility. Public/PrimeNG callers must use the
 * island provider only on a lazy route. */
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
  template: '<ng-content />',
})
export class SneatIonicIslandHostComponent {}
