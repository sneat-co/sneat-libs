# `libs-demo` — component demo app + Playwright e2e

Date: 2026-06-23
Status: Approved (scaffold-only iteration)

## Purpose & scope

A lightweight Angular + Ionic application inside the existing `sneat-libs` Nx
workspace that:

1. Renders Sneat library components in a real runtime so they can be seen in
   action ("light demo app").
2. Hosts Playwright end-to-end tests.

**First and only component this iteration: the login page** (`@sneat/auth-ui`).
The architecture is built so that adding a second component later means adding a
route + a home-page link — nothing structural changes.

### This iteration is scaffold-only

Per direction, this iteration **drafts everything so it compiles** but does
**not** run e2e or manual login tests. Rationale: the login flow is still being
made to work in `sneat-app`; once it works there, the same wiring will be reused
in this demo app to finalize the login e2e.

Definition of done for this iteration:

- `nx build libs-demo` succeeds (app compiles).
- `nx lint libs-demo` passes.
- The e2e project and `login.spec.ts` exist and typecheck.
- Firebase emulator config exists.
- **NOT** in scope: running `nx e2e libs-demo-e2e`, manual login verification,
  proving the login flow actually authenticates.

## New Nx projects

```
apps/libs-demo/        projectType: application  (Angular + Ionic, standalone)
apps/libs-demo-e2e/    projectType: application  (@nx/playwright)
```

Targets: `nx serve libs-demo`, `nx build libs-demo`, `nx lint libs-demo`,
`nx e2e libs-demo-e2e` (drafted; not run this iteration).

## App structure

```
apps/libs-demo/src/
  main.ts                       bootstrapApplication + providers
  app/
    app.component.ts            IonApp + router-outlet
    app.routes.ts               '' -> HomeComponent, 'login' -> login page, ** -> catch-all
    home/home.component.ts      Ionic list linking to each demo route (just /login for now)
    demo-providers.ts           Firebase(emulator), APP_INFO stub, auth-core, analytics noop, ionic, routing
```

The login route mounts the **real** login page component from `@sneat/auth-ui`
— no copy, no fork. That is what makes this a genuine demo of the library.

## Dependency wiring

The login page needs: `SneatAuthStateService` / `SneatUserService`
(`@sneat/auth-core`), `AnalyticsService` + `APP_INFO` (`@sneat/core`,
`InjectionToken` from `libs/core/src/lib/app.service.ts`), `@angular/fire` Auth,
Capacitor (web), and Telegram login config.

- **Firebase:** real `@angular/fire` (`provideFirebaseApp`, `provideAuth`)
  pointed at the **Auth emulator** via
  `connectAuthEmulator('http://localhost:9099')`. Demo Firebase config uses a
  `demo-` prefixed project id (`demo-sneat-libs`) so the emulator runs fully
  offline with no real credentials.
- **`APP_INFO`:** provide a demo `IAppInfo` value.
- **`AnalyticsService`:** noop provider.
- **`auth-core` services:** real providers, so the page behaves authentically.
- **Capacitor:** runs as `web` platform automatically; no native config.
- **Ionic:** `provideIonicAngular()` + Ionic global CSS, or the page will not
  render correctly.

## Firebase emulator

```
firebase.json     emulators.auth on :9099 (+ emulator UI)
.firebaserc       default project: demo-sneat-libs
```

Local serve and e2e assume the emulator is running. The intended wiring (to be
exercised in a later iteration) is Playwright `webServer` / global setup that
starts the emulator and seeds a known test user via the emulator REST API. This
iteration only creates the config and the spec; it does not run them.

## e2e tests (`apps/libs-demo-e2e/src/login.spec.ts`)

Drafted (not run) flows against the emulator:

- Login page renders (header, email form, auth-provider buttons visible).
- Invalid credentials -> error state shown.
- Valid seeded credentials -> authenticated state / redirect.
- Email-login-form validation (empty/invalid email blocks submit).

## Tooling added to the workspace

- Dev deps: `@nx/playwright`, `playwright`, `firebase-tools`.
- Already present: `firebase`, `@angular/fire`, `@capacitor/core`,
  `@ionic/angular`, `vitest`.
- `nx.json`: add an `e2e` targetDefault if the generator does not.

## Risks / assumptions

- **Ionic CSS:** standalone Ionic needs its global CSS + `provideIonicAngular()`;
  handled in providers/styles.
- **Login success redirect:** on success the page navigates to a space/home path
  that does not exist in the demo. A catch-all demo route gives the (future)
  success assertion a landing spot. Exact path confirmed while reading the
  component during implementation.
- **CI emulator:** the emulator needs Java; documented as the standard cost of
  the emulator choice. Not exercised this iteration.
- **Login wiring may be incomplete:** acceptable this iteration — it is finalized
  later by reusing the working `sneat-app` setup.
