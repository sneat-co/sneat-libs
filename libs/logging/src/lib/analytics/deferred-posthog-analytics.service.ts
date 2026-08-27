import {
  IAnalyticsCallOptions,
  IAnalyticsService,
  IErrorLogger,
  IPosthogSettings,
  UserProperties,
} from '@sneat/core';
import type { PostHog } from 'posthog-js';

/**
 * Loads PostHog only when there is an analytics event worth sending. The first
 * operation is retained until the SDK is ready, so deferring the chunk never
 * silently loses the sign-in or first page event.
 */
export class DeferredPosthogAnalyticsService implements IAnalyticsService {
  private client?: Promise<PostHog>;

  constructor(
    private readonly settings: IPosthogSettings,
    private readonly errorLogger: IErrorLogger,
  ) {}

  private getClient(): Promise<PostHog> {
    return (this.client ??= import('posthog-js')
      .then(({ default: posthog }) => {
        const client = posthog as unknown as PostHog;
        client.init(this.settings.token, {
          ...this.settings.config,
          capture_pageview: false,
        });
        return client;
      })
      .catch((error) => {
        this.client = undefined;
        this.errorLogger.logError(error, 'Unable to start product analytics', {
          show: false,
        });
        throw error;
      }));
  }

  private send(action: (client: PostHog) => void): void {
    void this.getClient().then(action).catch(() => undefined);
  }

  identify(
    userID: string,
    userPropsToSet?: UserProperties,
    userPropsToSetOnce?: UserProperties,
  ): void {
    this.send((client) =>
      client.identify(userID, userPropsToSet, userPropsToSetOnce),
    );
  }

  logEvent(
    eventName: string,
    eventParams?: Readonly<Record<string, unknown>>,
    _options?: IAnalyticsCallOptions,
  ): void {
    this.send((client) => client.capture(eventName, eventParams));
  }

  setCurrentScreen(
    screenName: string,
    _options?: IAnalyticsCallOptions,
  ): void {
    this.send((client) => client.capture('$screen_view', { screen_name: screenName }));
  }

  loggedOut(): void {
    this.send((client) => client.reset());
  }
}
