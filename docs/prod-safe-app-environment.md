# Production-safe app environment (scaffold convention)

Twice (debtus, listus) a deployed app showed **"This site can't be reached —
127.0.0.1 refused to connect"** on Google sign-in, because a build that used the
Firebase **emulator** config reached production. New apps MUST follow the
conventions below so this is structurally impossible.

## Why it kept happening

The old pattern made production safety depend on a build-time swap:

- `environment.ts` → **emulator** config (the default / fallback).
- `environment.prod.ts` → production config.
- `project.json` `production.fileReplacements` swaps one for the other.

This **fails unsafe**: anything that breaks the swap — forgetting
`--configuration production`, a stale `dist/`, an nx cache hit, or deploying a
locally-built dist — silently ships the emulator config to real users.

## The convention (fail-safe by construction)

### 1. One environment file, runtime selection

Use a single `environment.ts` built on `appEnvironmentConfig` from `@sneat/app`.
**Delete `environment.prod.ts` and the production `fileReplacements`.**

```ts
import { appEnvironmentConfig } from '@sneat/app';
import { IEnvironmentConfig } from '@sneat/core';

export const fooAppEnvironmentConfig: IEnvironmentConfig =
  appEnvironmentConfig({
    production: true,
    agents: {},
    firebaseConfig: {
      projectId: 'sneat-eur3-1',
      appId: '...',
      apiKey: '...',
      // authDomain omitted on purpose — see below.
      messagingSenderId: '588648831063',
      measurementId: '...',
    },
    signInMethod: 'redirect',
  });
```

**Omit `authDomain`.** `appEnvironmentConfig` defaults it to the current origin
(`location.hostname`), so the OAuth redirect is always same-origin / first-party
— whatever domain the app is served from (custom domain, `*.web.app`, or a
preview channel). Hardcoding a different `authDomain` than the serving domain
(e.g. `listus-app.web.app` while the app is at `listus.app`) causes a
cross-domain redirect that browsers flag as a look-alike ("the site looks fake")
and breaks first-party auth storage. Set `authDomain` explicitly **only** to
force a specific domain (Capacitor, a shared SSO domain). Make sure the serving
domain is a Firebase Auth **authorized domain**.

`appEnvironmentConfig` decides **at runtime from `location.hostname`**: the
Firebase emulator on `localhost`/`127.0.0.1`, the production config everywhere
else. A mis-built or mis-deployed bundle can no longer point real users at the
emulator. `nx serve` (localhost) still uses the emulator automatically.

Defense in depth: `@sneat/app`'s `init-firebase` also refuses to connect the
emulator on any non-localhost host and `console.error`s loudly, so a leaked
emulator config fails visibly instead of hitting `127.0.0.1`.

### 2. Deploy only from CI, never a local `dist/`

Each app has a `deploy.yml` that builds fresh with the production configuration
in a clean checkout and deploys via Workload Identity Federation (keyless). See
`debtus`/`sneat-apps` `deploy.yml`. Manual `firebase deploy` from a local dist is
what shipped a stale build to listus — don't.

### 3. Required post-deploy smoke test

Every `deploy.yml` runs `scripts/post-deploy-smoke.mjs <live-url>` as a required
step after deploy. It loads the live `/login`, triggers Google sign-in, and
**fails the deploy** if the page makes any `127.0.0.1`/`:9099` request or trips
the non-localhost emulator guard. This catches the emulator-in-prod regression
automatically, whatever the cause.

## Checklist for a new app

- [ ] `environment.ts` uses `appEnvironmentConfig({ ...prod })`; no
      `environment.prod.ts`, no production `fileReplacements`.
- [ ] `firebase.json` (no-cache on `index.html`) + `.firebaserc`.
- [ ] `deploy.yml`: clean-checkout prod build + WIF deploy + post-deploy smoke.
- [ ] `scripts/post-deploy-smoke.mjs` present and wired into `deploy.yml`.
- [ ] WIF: the deploy SA allows the app's GitHub repo (one `gcloud
      add-iam-policy-binding` on `deployer-to-gae`).
