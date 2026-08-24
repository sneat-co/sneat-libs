import {
  EnvironmentProviders,
  Provider,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideSneatAuthenticatedProviders } from '@sneat/app-auth';
import { provideSneatIonicShell } from '@sneat/app-ionic';
import { provideSneatPublicBootstrap } from '@sneat/app-public';
import { EnvConfigToken, IEnvironmentConfig, TopMenuService } from '@sneat/core';
import { RANDOM_ID_OPTIONS } from '@sneat/random';
import { AppComponentService } from './app-component.service';

/** Legacy all-in-one bootstrap. New PrimeNG public/cockpit apps should import
 * @sneat/app-public and add @sneat/app-auth only to their lazy private routes. */
export function getStandardSneatProviders(
  environmentConfig: IEnvironmentConfig,
): readonly (Provider | EnvironmentProviders)[] {
  return [
    provideZonelessChangeDetection(),
    provideSneatPublicBootstrap({
      apiBaseUrl: environmentConfig.useNgrok
        ? `//${location.host}/v0/`
        : environmentConfig.firebaseConfig.emulator
          ? 'https://local-api.sneat.ws/v0/'
          : undefined,
    }),
    provideSneatAuthenticatedProviders(environmentConfig),
    provideSneatIonicShell(),
    { provide: EnvConfigToken, useValue: environmentConfig },
    { provide: RANDOM_ID_OPTIONS, useValue: { len: 9 } },
    AppComponentService,
    TopMenuService,
  ];
}
