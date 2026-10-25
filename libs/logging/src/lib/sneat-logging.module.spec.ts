import { TestBed } from '@angular/core/testing';
import { ErrorLogger } from '@sneat/core';
import { ToastController } from '@ionic/angular';
import { captureException, showReportDialog } from '@sentry/angular';
import {
  provideErrorLogger,
  SneatLoggingModule,
} from './sneat-logging.module';
import {
  ERROR_LOGGER_DEFAULTS,
  provideErrorLoggerDefaults,
} from './error-logger-defaults';
import { ErrorLoggerService } from './error-logger.service';

vi.mock('@sentry/angular', () => ({
  captureException: vi.fn().mockImplementation(() => 'event-id'),
  showReportDialog: vi.fn(),
}));

describe('provideErrorLogger', () => {
  it('registers ErrorLogger and nothing else when called with no defaults', () => {
    TestBed.configureTestingModule({
      providers: [
        ...provideErrorLogger(),
        { provide: ToastController, useValue: null },
      ],
    });

    expect(TestBed.inject(ErrorLogger)).toBeInstanceOf(ErrorLoggerService);
    expect(TestBed.inject(ERROR_LOGGER_DEFAULTS, null)).toBeNull();
  });

  it('accepts defaults as sugar for provideErrorLoggerDefaults(...)', () => {
    TestBed.configureTestingModule({
      providers: [
        ...provideErrorLogger({ feedback: false }),
        { provide: ToastController, useValue: null },
      ],
    });

    expect(TestBed.inject(ERROR_LOGGER_DEFAULTS)).toEqual({
      feedback: false,
    });
  });

  it('is usable inside the SneatLoggingModule import (default export stays additive)', () => {
    TestBed.configureTestingModule({
      imports: [SneatLoggingModule],
      providers: [{ provide: ToastController, useValue: null }],
    });

    expect(TestBed.inject(ErrorLogger)).toBeInstanceOf(ErrorLoggerService);
  });

  it('honours app-level defaults even when another bundle calls provideErrorLogger() again afterwards', () => {
    vi.clearAllMocks();
    // Simulates the DataTug shadowing scenario from issue #117: an app
    // registers provideErrorLoggerDefaults({ feedback: false }) up front, then
    // a bundle such as @sneat/app-auth's provideSneatAuthenticatedProviders()
    // calls the plain provideErrorLogger() again later in the same providers
    // array. The re-registration only replaces the ErrorLogger provider, so
    // the app-level defaults must still apply.
    TestBed.configureTestingModule({
      providers: [
        provideErrorLoggerDefaults({ feedback: false }),
        ...provideErrorLogger(), // e.g. called again by another bundle
        { provide: ToastController, useValue: null },
      ],
    });

    const service = TestBed.inject(ErrorLogger) as ErrorLoggerService;
    vi.stubGlobal('location', { hostname: 'example.com' });

    service.logError(new Error('test'), 'msg', { report: true });

    expect(captureException).toHaveBeenCalled();
    expect(showReportDialog).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
