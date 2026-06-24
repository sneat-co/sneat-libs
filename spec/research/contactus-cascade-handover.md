# Handover: finish the contactus legacy-package retirement cascade

**Status:** Ready to execute in a **fresh session** (the producing session was very large).
**Date:** 2026-06-24.
**Prereq doc:** `contactus-legacy-frontend-packages-retirement-plan.md` (same dir) — read §2 mapping and §3 recipe. This file records what's DONE and the exact remaining steps + gotchas discovered while executing.

---

## 1. What is already DONE (do not redo)

- **contactus repo (`sneat-co/contactus`) fully shipped:**
  - Frontend fix merged (PR #5): new-contact create flow — group/role skip, `isInModal`, space wiring, `$wizardStep` cleanup, build-fix dep, unit tests.
  - Backend fix merged (PR #5): `CreateContactTx` defaults `relatedIDs=['-']` for relationless contacts.
  - Release pipeline repaired: PR #6 (pnpm pin + correct `release.projects` + `disk` resolver + version 0.12.2), PR #7 (`projectsRelationship: independent`), PR #8 (drop `private:true` from internal).
  - **Published to npm:** `@sneat/extension-contactus-internal@0.12.2` and `@sneat/extension-contactus-shared@0.12.2`. (`@sneat/extension-contactus-contract` unchanged at `0.12.1`.)
- **Backend Go module:** tag `backend/v0.1.1` pushed; **sneat-go** bumped to it (PR #696, merged → auto-deploys to App Engine).

## 2. The proven publish mechanism (USE THIS — repos lack working npm pipelines/tokens)

The sibling/lib repos do **not** have a working `NPM_TOKEN` secret or a green publish pipeline. Publish via the **sneat-libs cross-repo workflow** `publish-extension.yml`, which checks out the target repo, builds one Nx project, and publishes it with **sneat-libs' NPM_TOKEN**. One project per run:

```bash
gh workflow run publish-extension.yml -R sneat-co/sneat-libs \
  -f repository=sneat-co/<repo> \
  -f project=<nx-project-name> \
  -f ref=main \
  -f working-directory=frontend \
  -f pnpm-version=11
# then poll: gh run list -R sneat-co/sneat-libs --workflow=publish-extension.yml --limit 1
# verify:    npm view <pkg> version
```

Gotchas already hit (avoid):
- nx refuses to publish a **subset of a `fixed` release group** → ensure each repo's `release.projects`/relationship allows per-project publish (`independent`), like contactus PR #7.
- nx skips publish if a package has **`"private": true`** → remove it (contactus PR #8).
- The package **version must be bumped** before publishing or npm rejects the duplicate. Source-migration PRs do NOT bump versions — add a version bump.

## 3. Remaining work — REPUBLISH cascade (siblings are independent; do in any order)

**~12 published packages still import legacy `@sneat/contactus-*`** (verified via
`grep -rl "@sneat/contactus-\(core\|services\|shared\|internal\)" node_modules/.pnpm/@sneat+*/node_modules/@sneat/`):
`@sneat/app`, `ext-assetus-components`, `ext-debtus-internal`, `ext-debtus-shared`, `extension-assetus`,
`extension-calendarius-main`, `extension-calendarius-shared`, `extension-eventus`, `extension-listus`,
`mod-assetus-core`, `space-components`, `space-services`.

### 3a. Sibling source-migration PRs are OPEN and **currently fail `frontend` CI**

| Repo | Migration PR | main legacy files | New pkgs source imports |
|---|---|---|---|
| assetus | #14 | 1 | `extension-contactus-internal` |
| listus | #20 | 3 | (grep) |
| eventus | #23 | 1 | (grep) |
| debtus | #18 | 4 | (grep) |

**Why they fail (the fix):** the PRs repoint imports but the bundle can't resolve the new packages'
**transitive deps**. e.g. assetus imports `extension-contactus-internal`, whose deps/peers
(`extension-contactus-shared`, `extension-contactus-contract`, `angularx-qrcode`, and per plan §2 the
`@sneat/extension-calendarius-contract` peer for SCHEDULE_NAV_SERVICE) are **not declared** in the repo's
`frontend/package.json`. Plan §7 watch-item: *declare the new deps so the app-hoisting crutch goes away.*

**Per sibling recipe:**
1. `git checkout <migration-branch>` (e.g. `refactor/contactus-extension/assetus`).
2. In `frontend/package.json`: **remove** legacy `@sneat/contactus-{core,internal,services,shared}`;
   **add** the new `@sneat/extension-contactus-{contract,shared,internal}` it (transitively) needs at
   `0.12.2` (contract `0.12.1`), plus any missing peers the build reports (`angularx-qrcode`,
   `@sneat/extension-calendarius-contract`).
3. `pnpm install`; build locally until green: `pnpm nx run-many -t build` (or the failing app/lib).
   Iterate: add whatever "Could not resolve" reports.
4. Bump the repo's publishable package version(s) (patch).
5. Push → CI green → merge PR.
6. Publish each publishable project via §2 (e.g. assetus: `ext-assetus-contract`, `ext-assetus-internal`,
   `ext-assetus-shared` — confirm which ones sneat-apps actually consumes; sneat-apps currently uses
   `@sneat/extension-assetus@0.0.5`, so confirm the exact package/project name and bump > 0.0.5).
7. `npm view <pkg> version` to confirm.

### 3b. Republish-only (source already clean on main — no migration PR)

- **calendarius** (`sneat-co/calendarius`): publishes `@sneat/extension-calendarius-{main,shared,core,contract}`.
  sneat-apps uses `-main/-shared/-core@0.12.0`. Bump + publish new versions (still import legacy in the
  *published* 0.12.0; source is clean so a fresh publish drops legacy).
- **sneat-libs** (`@sneat/space-components`, `@sneat/space-services`, `@sneat/app`, and likely
  `mod-assetus-core`, `ext-assetus-components`): source clean per plan; bump + publish. These publish from
  THIS repo (sneat-libs) — use its own `publish.yml`/`publish-extension.yml` / `nx release`.

> Confirm the repo that owns each of the 12 packages before publishing (some assetus-named packages may
> live in sneat-libs, not the assetus repo). `npm view <pkg> repository.url` or check each repo's
> `libs/**/package.json` names.

## 4. Final step — sneat-apps (gated on ALL of §3)

The sneat-apps source migration codemod is proven (legacy→new package substitution, prepend-merge imports).
Mapping (plan §2): core→contract, shared→shared, services→internal, internal→internal. 24 source files.

1. In `sneat-apps/package.json`: bump every sibling/space/app/calendarius dep to the new versions from §3;
   **remove** `@sneat/contactus-{core,internal,services,shared}`; add `@sneat/extension-contactus-{contract,internal,shared}`
   (`internal/shared@0.12.2`, `contract@0.12.1`).
2. Run the codemod to repoint the 24 source files (legacy import → new package; merge into existing new-pkg
   import; **prepend** new import blocks — do NOT insert after the first import line, that splits multiline imports).
3. `pnpm install`; `pnpm nx build sneat-app` until green.
4. Runtime wiring: the new contactus services are **not** `providedIn:'root'`. Either fix
   `provideContactusInternal()` in the contactus lib (republish) OR provide services + DI-token aliases at
   app root (`ContactService`+`{provide: CONTACT_SERVICE, useExisting: ContactService}` … and
   `ScheduleNavService`+`{provide: SCHEDULE_NAV_SERVICE, useExisting: ScheduleNavService}`). Prefer the lib fix.
5. PR → CI green → merge.

## 5. Done = true (plan §6)

- No repo's **source** imports `@sneat/contactus-{core,services,shared,internal}` (grep across all).
- `sneat-apps/package.json` has no `@sneat/contactus-*`; only `@sneat/extension-contactus-*`.
- sneat-apps build + tests green; exactly **one** `ContactusServicesModule`/`ContactService` in the graph
  (grep `node_modules/.pnpm/@sneat+*/.../` for legacy → empty).

## 6. Local verification rig (optional, for testing the fix end-to-end before the cascade)

contactus libs build + overlay into sneat-apps node_modules (`/tmp/sync-contactus.sh` pattern), plus
app-root provider wiring in `apps/sneat-app/src/main.ts` (contactus services + token aliases +
`ScheduleNavService`/`SCHEDULE_NAV_SERVICE`) and a local API override
(`{provide: SneatApiBaseUrl, useValue: 'http://localhost:4300/v0/'}`). These are LOCAL-DEV ONLY — never commit.
The full add→create→open flow was verified working against local app + emulators + sneat-go (with the
backend `relatedIDs` fix).
