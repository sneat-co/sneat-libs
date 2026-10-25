import { NgModule, Provider } from '@angular/core';
import { ErrorLogger, ILogErrorOptions } from '@sneat/core';
import { ErrorLoggerService } from './error-logger.service';
import { provideErrorLoggerDefaults } from './error-logger-defaults';

/**
 * Registers `ErrorLoggerService` as the `ErrorLogger`. Pass `defaults` as
 * sugar for also calling `provideErrorLoggerDefaults(defaults)` — equivalent
 * to, but more convenient than, providing both separately:
 *
 * ```ts
 * providers: [provideErrorLogger({ feedback: false })]
 * ```
 *
 * Prefer a standalone `provideErrorLoggerDefaults(...)` at the app root when
 * some other bundle (e.g. `@sneat/app-auth`'s
 * `provideSneatAuthenticatedProviders()`) also calls `provideErrorLogger()` —
 * see {@link provideErrorLoggerDefaults} for why the defaults still apply
 * regardless of provider registration order.
 */
export function provideErrorLogger(defaults?: ILogErrorOptions): Provider[] {
  const providers: Provider[] = [
    {
      provide: ErrorLogger,
      useClass: ErrorLoggerService,
    },
  ];
  if (defaults) {
    providers.push(provideErrorLoggerDefaults(defaults));
  }
  return providers;
}

@NgModule({
  imports: [],
  providers: [provideErrorLogger()],
})
export class SneatLoggingModule {}
