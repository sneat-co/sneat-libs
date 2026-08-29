import {
  provideHttpClient,
  withFetch,
  withInterceptors,
} from '@angular/common/http';
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
import { urlOperationBlockerInterceptor } from './url-operation-blocker.interceptor';

export interface ISneatPublicBootstrapConfig {
  readonly apiBaseUrl?: string;
}

/** Public shell baseline. This entrypoint intentionally has no imports of
 * Ionic, AngularFire/Firebase, analytics, Sentry, PostHog, or animations. */
export function provideSneatPublicBootstrap(
  config: ISneatPublicBootstrapConfig = {},
): EnvironmentProviders {
  const providers: (Provider | EnvironmentProviders)[] = [
    // Fetch works in browsers and edge SSR runtimes. Keeping XHR here pulls
    // Angular's Node-only `xhr2` fallback into every server bundle even when an
    // application overrides the backend later.
    provideHttpClient(
      withFetch(),
      withInterceptors([urlOperationBlockerInterceptor]),
    ),
    { provide: ErrorHandler, useClass: ErrorHandler },
    { provide: TitleStrategy, useClass: SneatTitleStrategy },
    {
      provide: SneatApiBaseUrl,
      useValue: config.apiBaseUrl ?? DefaultSneatAppApiBaseUrl,
    },
  ];
  return makeEnvironmentProviders(providers);
}
