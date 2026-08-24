import { provideHttpClient, withXhr } from '@angular/common/http';
import {
  ErrorHandler,
  EnvironmentProviders,
  Provider,
  makeEnvironmentProviders,
} from '@angular/core';
import { TitleStrategy } from '@angular/router';
import {
  DefaultSneatAppApiBaseUrl,
  SneatApiBaseUrl,
} from '@sneat/api-public';
import { SneatTitleStrategy } from './sneat-title.strategy';

export interface ISneatPublicBootstrapConfig {
  readonly apiBaseUrl?: string;
}

/** Public shell baseline. This entrypoint intentionally has no imports of
 * Ionic, AngularFire/Firebase, analytics, Sentry, PostHog, or animations. */
export function provideSneatPublicBootstrap(
  config: ISneatPublicBootstrapConfig = {},
): EnvironmentProviders {
  const providers: (Provider | EnvironmentProviders)[] = [
    provideHttpClient(withXhr()),
    { provide: ErrorHandler, useClass: ErrorHandler },
    { provide: TitleStrategy, useClass: SneatTitleStrategy },
    {
      provide: SneatApiBaseUrl,
      useValue: config.apiBaseUrl ?? DefaultSneatAppApiBaseUrl,
    },
  ];
  return makeEnvironmentProviders(providers);
}
