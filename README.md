# sneat-libs

Shared Angular libraries published as public npm packages under the `@sneat` scope.
Built with [Nx](https://nx.dev), targeting Angular 21+ and Ionic 8+.

Shared framework and dependency decisions are recorded in
[TECH-STACK.md](TECH-STACK.md). Read it before introducing a cross-cutting
frontend dependency.

<!-- dev-approach:v1 -->
## Our approach to development

We build with our own tooling:

- **[SpecScore](https://specscore.md)** — specify requirements as `SpecScore.md` artifacts
- **[SpecStudio](https://specscore.studio)** — author & manage specs across their lifecycle
- **[inGitDB](https://ingitdb.com)** — store structured data in Git where applicable
- **[DALgo](https://dalgo.io)** — data access layer for Go
- **[cover100.dev](https://cover100.dev)** — drive toward 100% test coverage
- **[DataTug](https://datatug.io)** — query & explore data
<!-- /dev-approach -->

## Packages

### Foundation

| Package | NPM | Description |
|---------|-----|-------------|
| [`@sneat/core`](libs/core) | [![npm](https://img.shields.io/npm/v/@sneat/core)](https://www.npmjs.com/package/@sneat/core) | Core utilities, base interfaces, constants, directives, animations, and testing helpers shared across all other packages |
| [`@sneat/dto`](libs/dto) | [![npm](https://img.shields.io/npm/v/@sneat/dto)](https://www.npmjs.com/package/@sneat/dto) | Data transfer object (DTO) types: users, teams, meetings, metrics, pricing, and other domain models |
| [`@sneat/data`](libs/data) | [![npm](https://img.shields.io/npm/v/@sneat/data)](https://www.npmjs.com/package/@sneat/data) | Generic record and modified-entity models used for reactive data binding |
| [`@sneat/core-public`](libs/core-public) | [![npm](https://img.shields.io/npm/v/@sneat/core-public)](https://www.npmjs.com/package/@sneat/core-public) | Public core contracts shared by authenticated and public app bootstraps: app-info, space-type, URL-operation-blocker, and the generic build-info runtime contract (`IBuildInfo`, `BUILD_INFO`, `provideBuildInfo()`) |

### Auth

| Package | NPM | Description |
|---------|-----|-------------|
| [`@sneat/auth-models`](libs/auth/models) | [![npm](https://img.shields.io/npm/v/@sneat/auth-models)](https://www.npmjs.com/package/@sneat/auth-models) | Auth domain models: avatar, user, and person-name types |
| [`@sneat/auth-core`](libs/auth/core) | [![npm](https://img.shields.io/npm/v/@sneat/auth-core)](https://www.npmjs.com/package/@sneat/auth-core) | Auth services and guards: login-required guard, auth state service, private token store, Telegram auth |
| [`@sneat/auth-ui`](libs/auth/ui) | [![npm](https://img.shields.io/npm/v/@sneat/auth-ui)](https://www.npmjs.com/package/@sneat/auth-ui) | Auth UI components and routing: login/sign-up pages, person-names pipe, auth routing module |

### Space

| Package | NPM | Description |
|---------|-----|-------------|
| [`@sneat/space-models`](libs/space/models) | [![npm](https://img.shields.io/npm/v/@sneat/space-models)](https://www.npmjs.com/package/@sneat/space-models) | Space domain models: space context, space items, member context, invite models |
| [`@sneat/space-services`](libs/space/services) | [![npm](https://img.shields.io/npm/v/@sneat/space-services)](https://www.npmjs.com/package/@sneat/space-services) | Space services: space service, space-nav service, space-item service, space-context service, space module service |
| [`@sneat/space-components`](libs/space/components) | [![npm](https://img.shields.io/npm/v/@sneat/space-components)](https://www.npmjs.com/package/@sneat/space-components) | Space UI components: avatar, spaces list/card/menu, space selector, space page-title, space-extension links, and base component/directive classes for space item pages |
| [`@sneat/space-nav-router`](libs/space/nav-router) | [![npm](https://img.shields.io/npm/v/@sneat/space-nav-router)](https://www.npmjs.com/package/@sneat/space-nav-router) | Angular Router implementation of space navigation: `provideSpaceNavRouter()` and `SpaceNavRouterService` |
| [`@sneat/space-nav-ionic`](libs/space/nav-ionic) | [![npm](https://img.shields.io/npm/v/@sneat/space-nav-ionic)](https://www.npmjs.com/package/@sneat/space-nav-ionic) | Ionic implementation of space navigation: `provideSpaceNavIonic()` and `SpaceNavIonicService` |

### API & Backend Integration

| Package | NPM | Description |
|---------|-----|-------------|
| [`@sneat/api`](libs/api) | [![npm](https://img.shields.io/npm/v/@sneat/api)](https://www.npmjs.com/package/@sneat/api) | HTTP API client and Firestore integration: API service, Firestore service, Angular module |
| [`@sneat/api-public`](libs/api-public) | [![npm](https://img.shields.io/npm/v/@sneat/api-public)](https://www.npmjs.com/package/@sneat/api-public) | Public API-client contracts: `ISneatApiService` interface, API auth-token bridge, and the base `SneatApiService` |
| [`@sneat/api-firebase-auth`](libs/api-firebase-auth) | [![npm](https://img.shields.io/npm/v/@sneat/api-firebase-auth)](https://www.npmjs.com/package/@sneat/api-firebase-auth) | Firebase-backed provider for the Sneat API auth-token bridge: `provideFirebaseSneatApiAuth()` |
| [`@sneat/logging`](libs/logging) | [![npm](https://img.shields.io/npm/v/@sneat/logging)](https://www.npmjs.com/package/@sneat/logging) | Structured logging: Sentry error tracking setup, PostHog analytics, Firebase Analytics, multi-analytics service |

### App Bootstrap

| Package | NPM | Description |
|---------|-----|-------------|
| [`@sneat/app-public`](libs/app-public) | [![npm](https://img.shields.io/npm/v/@sneat/app-public)](https://www.npmjs.com/package/@sneat/app-public) | Public (unauthenticated) app bootstrap: `provideSneatPublicBootstrap()`, page-title service/strategy, route titles, authenticated-lifecycle token, URL-operation-blocker interceptor |
| [`@sneat/app-auth`](libs/app-auth) | [![npm](https://img.shields.io/npm/v/@sneat/app-auth)](https://www.npmjs.com/package/@sneat/app-auth) | Authenticated app bootstrap providers: `provideSneatAuthenticatedProviders()`, `provideSneatFirebase()` |
| [`@sneat/app-ionic`](libs/app-ionic) | [![npm](https://img.shields.io/npm/v/@sneat/app-ionic)](https://www.npmjs.com/package/@sneat/app-ionic) | Ionic app-shell bootstrap: `provideSneatIonicIsland()` |
| [`@sneat/app`](libs/app) | [![npm](https://img.shields.io/npm/v/@sneat/app)](https://www.npmjs.com/package/@sneat/app) | App bootstrap helpers for Sneat host apps: base app component, standard imports/providers, environments, Capacitor HTTP service — re-exports `@sneat/app-public` and `@sneat/app-auth` for a one-line migration path |

### UI Components

| Package | NPM | Description |
|---------|-----|-------------|
| [`@sneat/ui`](libs/ui) | [![npm](https://img.shields.io/npm/v/@sneat/ui)](https://www.npmjs.com/package/@sneat/ui) | Core UI primitives: focus management, form field selectors, shared component base |
| [`@sneat/components`](libs/components) | [![npm](https://img.shields.io/npm/v/@sneat/components)](https://www.npmjs.com/package/@sneat/components) | Shared UI components: virtual slider, card list, country selector/input, date input, dialog header, error card, copyright, filter item, app-version display |
| [`@sneat/media`](libs/media) | [![npm](https://img.shields.io/npm/v/@sneat/media)](https://www.npmjs.com/package/@sneat/media) | Media components and service: media-image/media-editor components and `MediaService` for uploading and managing media |
| [`@sneat/wizard`](libs/wizard) | [![npm](https://img.shields.io/npm/v/@sneat/wizard)](https://www.npmjs.com/package/@sneat/wizard) | Wizard UI helpers: radio-group-to-select component and its option types |
| [`@sneat/contactus-core`](libs/contactus/core) | [![npm](https://img.shields.io/npm/v/@sneat/contactus-core)](https://www.npmjs.com/package/@sneat/contactus-core) | Contact/member DTOs, contexts, and API DTOs for the contact-us domain |

### Data Grid

| Package | NPM | Description |
|---------|-----|-------------|
| [`@sneat/grid`](libs/grid) | [![npm](https://img.shields.io/npm/v/@sneat/grid)](https://www.npmjs.com/package/@sneat/grid) | Grid models and base Tabulator.js integration |
| [`@sneat/datagrid`](libs/datagrid) | [![npm](https://img.shields.io/npm/v/@sneat/datagrid)](https://www.npmjs.com/package/@sneat/datagrid) | Angular components wrapping Tabulator.js for rich data-grid rendering |

### Build tooling

| Package | NPM | Description |
|---------|-----|-------------|
| [`@sneat/build-info`](libs/build-info) | [![npm](https://img.shields.io/npm/v/@sneat/build-info)](https://www.npmjs.com/package/@sneat/build-info) | `sneat-stamp-build-info` CLI: stamps a consuming app's own version/git-hash/build-timestamp into `build-info.ts` + `build-info.json` ahead of every build. Runtime contract (`IBuildInfo`, `BUILD_INFO`, `provideBuildInfo()`) lives in `@sneat/core-public`; see [libs/build-info/README.md](libs/build-info/README.md) for the full recipe. |

---

## Naming conventions

Package names under the `@sneat` scope follow these conventions:

- **Extensions** use the **singular** prefix `@sneat/extension-<name>` — e.g.
  `@sneat/extension-listus`. An extension is a self-contained feature module
  (often with its own routes) that can be embedded in the sneat-app super-app
  and/or shipped as its own standalone mini-app.

  > The plural form `@sneat/extensions-*` is **deprecated** — it was an early
  > typo. New and migrated extensions MUST use the singular `extension-`.
  > (`listus` was migrated to `@sneat/extension-listus`; `calendarius`,
  > `contactus`, etc. are to follow.)

- **Domain models** use `@sneat/<domain>-models`, **services** use
  `@sneat/<domain>-services`, **components** use `@sneat/<domain>-components`
  (e.g. `@sneat/space-models`, `@sneat/space-services`,
  `@sneat/space-components`).

---

## Development

### Prerequisites

- Node.js 22+
- pnpm 10+

### Setup

```bash
pnpm install
```

### Build all packages

```bash
pnpm nx run-many -t build --all
```

### Test all packages

```bash
pnpm nx run-many -t test --all
```

### Lint all packages

```bash
pnpm nx run-many -t lint --all
```

### Build a single package

```bash
pnpm nx build <project-name>
# e.g.
pnpm nx build core
pnpm nx build auth-core
pnpm nx build space-services
```

---

## Release Process

Releases are a **manually-triggered, two-step** process built on [Nx Release](https://nx.dev/features/manage-releases)
with a **fixed release group**: every package under `libs/*` (27 packages as of this
writing, all versioned together — see the Packages tables above) shares one version
and is bumped, tagged, and published as a unit.

### How it works

**Step 1 — someone runs "Prepare release" (`.github/workflows/release.yml`)**

1. A person with repo access triggers the workflow via `workflow_dispatch`, choosing
   the required `bump` input — `patch` or `minor` (there is no `major` option, and the
   bump is **not** inferred from Conventional Commits; it's the value you pass):

   ```bash
   gh workflow run release.yml -f bump=patch
   # or
   gh workflow run release.yml -f bump=minor
   ```

2. The workflow checks out `main` and runs `pnpm nx release "${{ inputs.bump }}" --skip-publish`,
   which bumps `version` in every `libs/*/package.json` and updates `CHANGELOG.md` —
   `nx.json`'s `release.git.commit/tag/push` are all `false`, so Nx itself does not
   commit, tag, or push anything.
3. `tools/verify-release-candidate.mjs --cached --version` validates the staged
   change: only `CHANGELOG.md`, `pnpm-lock.yaml`, and `libs/**/package.json` may be
   touched, every changed manifest must land on the same new version, every tracked
   package manifest must already be at that version, the `CHANGELOG.md` heading must
   match it, and it must be strictly greater than the latest `vX.Y.Z` tag. Anything
   else aborts the workflow.
4. If validation passes (and no release PR is already open), the workflow commits the
   staged files as `chore(release): prepare <version>`, pushes a new branch named
   `release/sneat-libs-<version>-<run_id>`, and opens a pull request against `main`
   titled `chore(release): prepare <version>`.
5. Because a PR opened with the default `GITHUB_TOKEN` doesn't auto-trigger required
   checks, the workflow explicitly re-runs CI against that branch
   (`gh workflow run ci.yml --ref <branch>`).

   > **Known gap (as of 2026-09):** the PR-creation step currently fails with
   > *"GitHub Actions is not permitted to create or approve pull requests
   > (createPullRequest)"*. The release branch `release/sneat-libs-<version>-<run_id>`
   > **is** still pushed even when this happens, so open the PR by hand:
   > ```bash
   > gh pr create -B main -H release/sneat-libs-<version>-<run_id> -t "chore(release): prepare <version>"
   > ```
   > This will start working automatically once the repository (or organisation)
   > setting **"Allow GitHub Actions to create and approve pull requests"** is
   > enabled.

**Step 2 — merging that PR does the rest, automatically**

6. Once the `chore(release): prepare <version>` PR is reviewed and merged into
   `main`, CI runs on the merge commit as normal.
7. When CI succeeds on `main`, the **Publish** workflow (`.github/workflows/publish.yml`)
   fires via `workflow_run`. It checks out the exact commit CI just validated,
   confirms that commit is still the tip of `main`, and runs
   `tools/verify-release-candidate.mjs --committed --version` to confirm it's a
   genuine, validated release candidate (the same checks as step 3, run against the
   committed diff instead of the staged one).
8. If — and only if — that check passes, Publish builds every package
   (`pnpm nx run-many -t build --all --skip-nx-cache`) and publishes them
   (`pnpm nx release publish`) through the shared `sneat-co/cicd` npm-publish
   reusable workflow.
9. A final `tag` job then tags the published commit `vX.Y.Z` (annotated, message
   `chore(release): publish <version>`) and pushes the tag.

If the commit that lands on `main` is **not** a validated release candidate (i.e. an
ordinary PR was merged, not a `chore(release): prepare ...` one), Publish's
`candidate` job sets `release=false` and the `publish`/`tag` jobs are skipped —
nothing is built, published, or tagged.

### Creating a release

There's no more "just merge a properly-prefixed commit" — releases only happen when
someone deliberately starts step 1:

```bash
gh workflow run release.yml -f bump=patch   # release with only fixes
gh workflow run release.yml -f bump=minor   # release that includes new features
```

Then:

- Watch for the `chore(release): prepare X.Y.Z` PR the workflow opens (or open it
  yourself with the `gh pr create` fallback above if PR-creation fails with the
  permissions error described above).
- Review and merge that PR into `main` like any other PR.
- CI and Publish take it from there — the version bump, changelog, npm publish, and
  `vX.Y.Z` tag all follow automatically from that one merge. No further manual steps.

### NPM token

The `NPM_TOKEN` secret must be set in the repository settings
(`Settings → Secrets and variables → Actions → NPM_TOKEN`) with a token that has
**Automation** publish rights to the `@sneat` npm organisation.


## Standards

This is a **Sneat extension** — build it against the shared platform standards:

- **[Sneat extension standards](https://github.com/sneat-co/sneat-libs/blob/main/docs/extension-standards/README.md)** — backend wiring, frontend apps, and UX conventions.
- **[Frontend UX standards](https://github.com/sneat-co/sneat-specs/blob/main/standards/frontend-ux/README.md)** — cards, buttons, lists, page layout, forms, modals, and loading/empty/error states.
- **[Screen flows & the UI component checklist](https://github.com/sneat-co/sneat-specs/blob/main/standards/frontend-ux/flows.md)** — read **before** building any form, page, or wizard: it covers how screens connect (entry → action → exit) so they don't end up orphaned.
