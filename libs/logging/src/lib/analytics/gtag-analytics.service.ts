import { inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import {
  ErrorLogger,
  IAnalyticsService,
  IErrorLogger,
  ILogErrorOptions,
  UserProperties,
} from '@sneat/core';

const logErrOptions: ILogErrorOptions = { show: false, feedback: false };

// EU/EEA + UK — analytics storage is denied by default here (until the visitor
// consents), matching the geo-gated Consent Mode v2 posture of the marketing
// landings (landings/src/components/GoogleAnalytics.astro). Elsewhere it is
// granted by default. Because an app and its landing share one measurement ID
// on the same domain, a consent choice made on the landing carries over here.
const CONSENT_GATED_REGIONS = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR',
  'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK',
  'SI', 'ES', 'SE', 'IS', 'LI', 'NO', 'GB',
];

type GtagFn = (...args: unknown[]) => void;
type DataLayerWindow = Window & { dataLayer?: unknown[] };

/**
 * Google Analytics (GA4) backend for the Sneat AnalyticsService fan-out.
 *
 * Uses gtag.js directly (not @angular/fire/analytics) so it can report to the
 * app's own per-domain GA4 property — the same property/stream its marketing
 * landing already uses — instead of the shared Firebase-linked property. Every
 * hit carries `surface: 'app'` so in-app usage is separable from landing
 * traffic within the one shared stream while keeping a single client_id (so the
 * landing -> app funnel stays intact).
 *
 * Instantiated by provideSneatAnalytics() with the app's measurement ID.
 */
export class GtagAnalyticsService implements IAnalyticsService {
  private readonly errorLogger = inject<IErrorLogger>(ErrorLogger);
  private readonly router = inject(Router);
  private gtag: GtagFn = () => undefined;

  constructor(private readonly measurementId: string) {
    this.init();
  }

  private readonly logError = (e: unknown, m: string) =>
    this.errorLogger.logError(e, m, logErrOptions);

  private init(): void {
    try {
      const w = window as DataLayerWindow;
      const dataLayer = (w.dataLayer = w.dataLayer ?? []);
      this.gtag = (...args: unknown[]) => {
        dataLayer.push(args);
      };

      this.gtag('js', new Date());

      // Consent Mode v2: granted by default, denied in gated regions until the
      // visitor consents (region-scoped default wins for those countries).
      this.gtag('consent', 'default', { analytics_storage: 'granted' });
      this.gtag('consent', 'default', {
        analytics_storage: 'denied',
        region: CONSENT_GATED_REGIONS,
      });

      const script = document.createElement('script');
      script.async = true;
      script.src =
        'https://www.googletagmanager.com/gtag/js?id=' + this.measurementId;
      document.head.appendChild(script);

      this.gtag('config', this.measurementId, {
        // SPA: we emit page_view ourselves on each NavigationEnd below.
        send_page_view: false,
        // Never use the data for ads (mirrors the landings' config).
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
      });
      // Default parameter that tags every hit as in-app.
      this.gtag('set', { surface: 'app' });

      this.router.events
        .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
        .subscribe((e) => this.setCurrentScreen(e.urlAfterRedirects));
    } catch (e) {
      this.logError(e, 'Failed to init Google Analytics (gtag)');
    }
  }

  public logEvent(
    eventName: string,
    eventParams?: Readonly<Record<string, unknown>>,
  ): void {
    try {
      this.gtag('event', eventName, eventParams);
    } catch (e) {
      this.logError(e, 'Failed to log event to Google Analytics');
    }
  }

  public setCurrentScreen(screenName: string): void {
    try {
      this.gtag('event', 'page_view', { page_path: screenName });
    } catch (e) {
      this.logError(e, 'Failed to log page_view to Google Analytics');
    }
  }

  public identify(
    userID: string,
    userPropertiesToSet?: UserProperties,
    userPropertiesToSetOnce?: UserProperties,
  ): void {
    try {
      this.gtag('config', this.measurementId, { user_id: userID });
      const props = { ...userPropertiesToSet, ...userPropertiesToSetOnce };
      if (Object.keys(props).length) {
        this.gtag('set', 'user_properties', props);
      }
    } catch (e) {
      this.logError(e, 'Failed to set user id in Google Analytics');
    }
  }

  public loggedOut(): void {
    try {
      this.gtag('config', this.measurementId, { user_id: undefined });
    } catch (e) {
      this.logError(e, 'Failed to clear user id in Google Analytics');
    }
  }
}
