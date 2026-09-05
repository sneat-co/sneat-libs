import { IErrorLogger, IPosthogSettings } from '@sneat/core';
import posthog from 'posthog-js';
import { DeferredPosthogAnalyticsService } from './deferred-posthog-analytics.service';

vi.mock('posthog-js', () => ({
  default: {
    init: vi.fn(),
    identify: vi.fn(),
    capture: vi.fn(),
    reset: vi.fn(),
  },
}));

describe('DeferredPosthogAnalyticsService', () => {
  const settings: IPosthogSettings = {
    token: 'test-token',
    config: {},
  };
  const errorLogger: IErrorLogger = {
    logError: vi.fn(),
    logErrorHandler: () => vi.fn(),
  };

  beforeEach(() => vi.clearAllMocks());

  it('loads and initializes PostHog only when the first event is sent', async () => {
    const service = new DeferredPosthogAnalyticsService(settings, errorLogger);

    expect(posthog.init).not.toHaveBeenCalled();

    service.logEvent('signed_in', { source: 'test' });

    await vi.waitFor(() => {
      expect(posthog.init).toHaveBeenCalledWith('test-token', {
        capture_pageview: false,
      });
      expect(posthog.capture).toHaveBeenCalledWith('signed_in', {
        source: 'test',
      });
    });
  });
});
