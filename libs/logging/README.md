# @sneat/logging

Angular providers and services for error reporting (Sentry), analytics, and a
few browser-runtime resilience handlers (chunk-load recovery).

## Error logging

`ErrorLoggerService` (registered under the `ErrorLogger` token from
`@sneat/core`) is what app code calls to log a handled error:

```ts
import { ErrorLogger } from '@sneat/core';

constructor(@Inject(ErrorLogger) private readonly errorLogger: IErrorLogger) {}

this.errorLogger.logError(e, 'Failed to save the record');
```

Per call, `logError(e, message?, options?)` does three things, each gated by
its own `ILogErrorOptions` flag:

| Option | Default | Effect when true |
|---|---|---|
| `report` | `true` | Sends the error to Sentry (`captureException`) — skipped on `localhost`. |
| `feedback` | `true` | After a successful `report`, opens Sentry's **report dialog** (`showReportDialog`) so the user can describe what happened. |
| `show` | `true` | Shows an in-app Ionic toast with the error message. |
| `showDuration` | 7000ms | Toast duration. |

Wire it up with `provideErrorLogger()`, typically once at the app root (it's
also called internally by other bundles — see below):

```ts
import { provideErrorLogger } from '@sneat/logging';

// providers: [provideErrorLogger(), ...]
```

### App-level defaults: `provideErrorLoggerDefaults()`

`ILogErrorOptions.feedback` (and `.show`) default to `true`, but a call site
rarely wants to opt out one call at a time — an app usually wants a blanket
policy. `provideErrorLoggerDefaults()` sets that policy once, and
`ErrorLoggerService` resolves each option as:

```
options.<key> ?? defaults.<key> ?? <built-in default (true)>
```

so an explicit per-call value always wins, an app-level default is the
fallback, and the pre-existing behaviour (dialog/toast shown) is what happens
when neither is set.

```ts
import { provideErrorLoggerDefaults } from '@sneat/logging';

// providers: [provideErrorLoggerDefaults({ feedback: false }), ...]
```

`provideErrorLogger()` also accepts the same shape as sugar for calling both
together:

```ts
// providers: [provideErrorLogger({ feedback: false }), ...]
```

**Why a separate token, not just an argument to `provideErrorLogger()`.**
Other bundles call `provideErrorLogger()` internally — e.g.
`@sneat/app-auth`'s `provideSneatAuthenticatedProviders()` — so a second,
unrelated `provideErrorLogger()` registration can land later in the same
providers array (Angular DI: the last provider for a token wins). If the
default lived only inside `provideErrorLogger()`'s own provider, that later,
plain call would silently reset it. `ERROR_LOGGER_DEFAULTS` is its own
token, provided once by `provideErrorLoggerDefaults()`, so it is unaffected
by how many more times `provideErrorLogger()` is subsequently called:

```ts
providers: [
  provideErrorLoggerDefaults({ feedback: false }), // app-level policy
  ...
  provideSneatAuthenticatedProviders(config), // calls provideErrorLogger() again internally — feedback: false still applies
],
```

### Logged errors vs. uncaught exceptions

`feedback: false` only affects errors your own code chooses to `logError()`.
It does not touch Sentry's dialog for **uncaught** exceptions, which is a
separate handler wired up by `provideSentryAppInitializer()` via
`@sentry/angular`'s `createErrorHandler({ showDialog: true })`. A typical
policy is therefore:

```ts
providers: [
  // Never interrupt the user with a report dialog for errors the app already
  // handled and surfaced its own way (toast, inline message, etc).
  provideErrorLoggerDefaults({ feedback: false }),
  provideSentryAppInitializer({ ... }), // still shows Sentry's dialog for genuinely uncaught exceptions
],
```

This is the DataTug use case: it wrapped `provideErrorLogger()` itself to
suppress the report dialog on every `logError()` call
(datatug/datatug-apps#128, #132) before `ERROR_LOGGER_DEFAULTS` existed —
that wrapper can be replaced with `provideErrorLoggerDefaults({ feedback: false })`.
