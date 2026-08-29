import { TestBed } from '@angular/core/testing';
import {
  AnalyticsService,
  ErrorLogger,
  IEnvironmentConfig,
} from '@sneat/core';
import { provideSneatAnalytics } from './provide-sneat-analytics';

describe('provideSneatAnalytics', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('disables browser analytics when rendered without a location global', () => {
    vi.stubGlobal('location', undefined);
    TestBed.configureTestingModule({
      providers: [
        provideSneatAnalytics({
          production: true,
          agents: {},
          firebaseConfig: {},
          posthog: { token: 'test-token' },
          googleAnalytics: { measurementId: 'G-TEST' },
        } as IEnvironmentConfig),
        {
          provide: ErrorLogger,
          useValue: { logError: vi.fn(), logErrorHandler: vi.fn() },
        },
      ],
    });

    expect(TestBed.inject(AnalyticsService)).toBeTruthy();
  });
});
