import { inject, Injectable } from '@angular/core';
import { logEvent, setUserId, setUserProperties } from 'firebase/analytics';
import {
  ErrorLogger,
  IErrorLogger,
  ILogErrorOptions,
  SNEAT_FIREBASE_ANALYTICS,
} from '@sneat/core';
import {
  IAnalyticsCallOptions,
  IAnalyticsService,
  UserProperties,
} from '@sneat/core';

const logErrOptions: ILogErrorOptions = { show: false, feedback: false };

@Injectable()
export class FireAnalyticsService implements IAnalyticsService {
  private readonly errorLogger = inject<IErrorLogger>(ErrorLogger);

  /**
   * Nullable by contract: `SNEAT_FIREBASE_ANALYTICS` resolves to `null` — it
   * never throws — when the app has no real `measurementId` or when
   * `getAnalytics()` is unsupported in the host environment. Every method
   * below therefore no-ops on `null` instead of reporting a failed SDK call
   * on each event. Before 0.27.0 this injected `@angular/fire`'s `Analytics`
   * token, which threw NullInjectorError in exactly those cases.
   */
  private readonly analytics = inject(SNEAT_FIREBASE_ANALYTICS);

  constructor() {
    if (!this.errorLogger) {
      console.error(`FireAnalyticsService() - !errorLogger`);
    }
    if (!this.analytics) {
      console.error(`FireAnalyticsService() - !analytics`);
    }
  }

  private readonly logError = (e: unknown, m: string) =>
    this.errorLogger.logError(e, m, logErrOptions);

  public logEvent(
    eventName: string,
    eventParams?: Record<string, unknown>,
    options?: IAnalyticsCallOptions,
  ): void {
    const analytics = this.analytics;
    if (!analytics) return;
    try {
      logEvent(analytics, eventName, eventParams, options);
    } catch (e) {
      this.logError(e, 'Failed to log event to Firebase analytics');
    }
  }

  public setCurrentScreen(
    screenName: string,
    options?: IAnalyticsCallOptions,
  ): void {
    const analytics = this.analytics;
    if (!analytics) return;
    try {
      const args = { screenName: screenName };
      logEvent(analytics, '$screen_view', args, options);
    } catch (e) {
      this.logError(e, 'Failed to log screen view to Firebase analytics');
    }
  }

  public identify(
    userID: string,
    userPropertiesToSet?: UserProperties,
    userPropertiesToSetOnce?: UserProperties,
  ): void {
    const analytics = this.analytics;
    if (!analytics) return;
    try {
      setUserId(analytics, userID);
    } catch (e) {
      this.logError(e, 'Failed to set user id in Firebase analytics');
    }
    const customProperties: { [id: string]: unknown } = {};

    if (userPropertiesToSet)
      Object.keys(userPropertiesToSet).forEach(
        (k) => (customProperties[k] = userPropertiesToSet[k]),
      );
    if (userPropertiesToSetOnce)
      Object.keys(userPropertiesToSetOnce).forEach(
        (k) => (customProperties[k] = userPropertiesToSetOnce[k]),
      );
    try {
      setUserProperties(analytics, customProperties);
    } catch (e) {
      this.logError(e, 'Failed to set user props in Firebase analytics');
    }
  }

  public loggedOut(): void {
    const analytics = this.analytics;
    if (!analytics) return;
    try {
      setUserId(analytics, null);
    } catch (e) {
      this.logError(e, 'Failed to logout user from Firebase analytics');
    }
  }
}
