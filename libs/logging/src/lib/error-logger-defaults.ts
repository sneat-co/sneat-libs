import { InjectionToken, Provider } from '@angular/core';
import { ILogErrorOptions } from '@sneat/core';

/**
 * App-level defaults for {@link ErrorLoggerService}, applied whenever a
 * per-call `ILogErrorOptions` does not specify the option itself.
 * `ErrorLoggerService` resolves each supported option as
 * `options.<key> ?? defaults.<key> ?? <built-in default>` — so an explicit
 * per-call value always wins over the app-level default, which in turn wins
 * over the built-in default.
 *
 * No provider registered means "use the built-in defaults" — e.g. Sentry's
 * report dialog is shown for every reported error, matching the behaviour
 * before this token existed.
 */
export const ERROR_LOGGER_DEFAULTS = new InjectionToken<ILogErrorOptions>(
  'ERROR_LOGGER_DEFAULTS',
);

/**
 * Registers app-level defaults for `ErrorLoggerService`. Typical use: never
 * show Sentry's report dialog for errors logged via `logError()`, while still
 * showing Sentry's own dialog for uncaught exceptions (handled separately by
 * `createErrorHandler`, wired up by `provideSentryAppInitializer`):
 *
 * ```ts
 * providers: [provideErrorLoggerDefaults({ feedback: false })]
 * ```
 *
 * Provide this once, at the app level. It survives a later `provideErrorLogger()`
 * registration performed by another bundle (e.g.
 * `provideSneatAuthenticatedProviders()` from `@sneat/app-auth`, which calls
 * `provideErrorLogger()` internally) because that call only re-provides
 * `ErrorLogger` itself, never `ERROR_LOGGER_DEFAULTS` — so an app-level default
 * wins regardless of provider registration order.
 */
export function provideErrorLoggerDefaults(
  defaults: ILogErrorOptions,
): Provider {
  return { provide: ERROR_LOGGER_DEFAULTS, useValue: defaults };
}
