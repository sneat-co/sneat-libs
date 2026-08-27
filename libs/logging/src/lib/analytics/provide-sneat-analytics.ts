import type { Analytics } from 'firebase/analytics';
import {
  AnalyticsService,
  IAnalyticsService,
  IEnvironmentConfig,
  SNEAT_FIREBASE_ANALYTICS,
} from '@sneat/core';
import { ErrorLogger, IErrorLogger } from '@sneat/core';
import { FireAnalyticsService } from './fire-analytics.service';
import { GtagAnalyticsService } from './gtag-analytics.service';
import { MultiAnalyticsService } from './multi-analytics.service';
import { DeferredPosthogAnalyticsService } from './deferred-posthog-analytics.service';
import { Injector, Provider } from '@angular/core';

export interface IAnalyticsConfig {
  addPosthog?: boolean;
  addFirebaseAnalytics?: boolean;
  // GA4 measurement ID for the app's own per-domain property (the same stream
  // its marketing landing uses). When set, a gtag-based GA4 backend is added.
  googleAnalyticsMeasurementId?: string;
}

function getAnalyticsConfig(
  environmentConfig: IEnvironmentConfig,
): IAnalyticsConfig {
  const useAnalytics =
    location.host === 'sneat.app' || location.protocol === 'https:';

  const firebaseMeasurementId = environmentConfig.firebaseConfig?.measurementId;
  const gaMeasurementId = environmentConfig.googleAnalytics?.measurementId;

  return {
    addPosthog: useAnalytics && !!environmentConfig.posthog?.token,
    addFirebaseAnalytics:
      useAnalytics &&
      !!firebaseMeasurementId &&
      firebaseMeasurementId !== 'G-PROVIDE_IF_NEEDED',
    googleAnalyticsMeasurementId: useAnalytics ? gaMeasurementId : undefined,
  };
}

export function provideSneatAnalytics(
  environmentConfig: IEnvironmentConfig,
): Provider {
  return {
    provide: AnalyticsService,
    // `Injector` rather than `SNEAT_FIREBASE_ANALYTICS` directly: listing the
    // token in `deps` would resolve it — and so initialize Firebase Analytics —
    // on every app that injects `AnalyticsService`, including the ones where
    // `addFirebaseAnalytics` is false (plain http, non-sneat.app host). Reading
    // it through the injector inside the branch below keeps initialization as
    // lazy as the pre-0.27.0 `getAnalytics(fbApp)` call it replaces.
    deps: [ErrorLogger, Injector],
    useFactory: (errorLogger: IErrorLogger, injector: Injector) => {
      const config = getAnalyticsConfig(environmentConfig);
      const as: IAnalyticsService[] = [];
      if (config?.addPosthog) {
        as.push(
          new DeferredPosthogAnalyticsService(
            environmentConfig.posthog as NonNullable<
              IEnvironmentConfig['posthog']
            >,
            errorLogger,
          ),
        );
      }
      if (config?.googleAnalyticsMeasurementId) {
        as.push(new GtagAnalyticsService(config.googleAnalyticsMeasurementId));
      }
      if (config?.addFirebaseAnalytics) {
        const analytics: Analytics | null = injector.get(
          SNEAT_FIREBASE_ANALYTICS,
          null,
        );
        if (analytics) {
          // Constructed inside this factory's injection context, so
          // FireAnalyticsService's own inject(SNEAT_FIREBASE_ANALYTICS)
          // resolves — to this same, already-instantiated instance.
          as.push(new FireAnalyticsService());
        } else {
          errorLogger.logError(
            'addFirebaseAnalytics==true, but Firebase Analytics is not provided',
            undefined,
            { show: false, feedback: false },
          );
        }
      }
      return new MultiAnalyticsService(as);
    },
  };
}
