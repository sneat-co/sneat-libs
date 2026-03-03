# sneat-libs

Shared Angular libraries published as public npm packages under the `@sneat` scope.
Built with [Nx](https://nx.dev), targeting Angular 21+ and Ionic 8+.

## Packages

### Foundation

| Package | Source & npm | Description |
|---------|-------------|-------------|
| `@sneat/core` | [libs/core](libs/core)<br>[![npm](https://img.shields.io/npm/v/@sneat/core)](https://www.npmjs.com/package/@sneat/core) | Core utilities, base interfaces, constants, directives, animations, and testing helpers shared across all other packages |
| `@sneat/dto` | [libs/dto](libs/dto)<br>[![npm](https://img.shields.io/npm/v/@sneat/dto)](https://www.npmjs.com/package/@sneat/dto) | Data transfer object (DTO) types: users, teams, meetings, metrics, pricing, and other domain models |
| `@sneat/data` | [libs/data](libs/data)<br>[![npm](https://img.shields.io/npm/v/@sneat/data)](https://www.npmjs.com/package/@sneat/data) | Generic record and modified-entity models used for reactive data binding |

### Auth

| Package | Source & npm | Description |
|---------|-------------|-------------|
| `@sneat/auth-models` | [libs/auth/models](libs/auth/models)<br>[![npm](https://img.shields.io/npm/v/@sneat/auth-models)](https://www.npmjs.com/package/@sneat/auth-models) | Auth domain models: avatar, user, and person-name types |
| `@sneat/auth-core` | [libs/auth/core](libs/auth/core)<br>[![npm](https://img.shields.io/npm/v/@sneat/auth-core)](https://www.npmjs.com/package/@sneat/auth-core) | Auth services and guards: login-required guard, auth state service, private token store, Telegram auth |
| `@sneat/auth-ui` | [libs/auth/ui](libs/auth/ui)<br>[![npm](https://img.shields.io/npm/v/@sneat/auth-ui)](https://www.npmjs.com/package/@sneat/auth-ui) | Auth UI components and routing: login/sign-up pages, person-names pipe, auth routing module |

### Space

| Package | Source & npm | Description |
|---------|-------------|-------------|
| `@sneat/space-models` | [libs/space/models](libs/space/models)<br>[![npm](https://img.shields.io/npm/v/@sneat/space-models)](https://www.npmjs.com/package/@sneat/space-models) | Space domain models: space context, space items, member context, invite models |
| `@sneat/space-services` | [libs/space/services](libs/space/services)<br>[![npm](https://img.shields.io/npm/v/@sneat/space-services)](https://www.npmjs.com/package/@sneat/space-services) | Space services: space service, space-nav service, space-item service, space-context service, space module service |

### API & Backend Integration

| Package | Source & npm | Description |
|---------|-------------|-------------|
| `@sneat/api` | [libs/api](libs/api)<br>[![npm](https://img.shields.io/npm/v/@sneat/api)](https://www.npmjs.com/package/@sneat/api) | HTTP API client and Firestore integration: API service, Firestore service, Angular module |
| `@sneat/logging` | [libs/logging](libs/logging)<br>[![npm](https://img.shields.io/npm/v/@sneat/logging)](https://www.npmjs.com/package/@sneat/logging) | Structured logging: Sentry error tracking setup, PostHog analytics, Firebase Analytics, multi-analytics service |

### UI Components

| Package | Source & npm | Description |
|---------|-------------|-------------|
| `@sneat/ui` | [libs/ui](libs/ui)<br>[![npm](https://img.shields.io/npm/v/@sneat/ui)](https://www.npmjs.com/package/@sneat/ui) | Core UI primitives: focus management, form field selectors, shared component base |
| `@sneat/components` | [libs/components](libs/components)<br>[![npm](https://img.shields.io/npm/v/@sneat/components)](https://www.npmjs.com/package/@sneat/components) | Shared UI components: virtual slider, card list, country selector/input, date input, dialog header, error card, copyright, filter item, app-version display |
| `@sneat/contactus-core` | [libs/contactus/core](libs/contactus/core)<br>[![npm](https://img.shields.io/npm/v/@sneat/contactus-core)](https://www.npmjs.com/package/@sneat/contactus-core) | Contact/member DTOs, contexts, and API DTOs for the contact-us domain |

### Data Grid

| Package | Source & npm | Description |
|---------|-------------|-------------|
| `@sneat/grid` | [libs/grid](libs/grid)<br>[![npm](https://img.shields.io/npm/v/@sneat/grid)](https://www.npmjs.com/package/@sneat/grid) | Grid models and base Tabulator.js integration |
| `@sneat/datagrid` | [libs/datagrid](libs/datagrid)<br>[![npm](https://img.shields.io/npm/v/@sneat/datagrid)](https://www.npmjs.com/package/@sneat/datagrid) | Angular components wrapping Tabulator.js for rich data-grid rendering |

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

Releases are fully automated via GitHub Actions using [Nx Release](https://nx.dev/features/manage-releases)
with [Conventional Commits](https://www.conventionalcommits.org/).

### How it works

1. **Push to `main`** — every commit to `main` triggers the CI workflow (`.github/workflows/ci.yml`),
   which builds, tests, and lints all packages.

2. **CI passes → Release runs** — on CI success the Release workflow (`.github/workflows/release.yml`)
   fires automatically via `workflow_run`.

3. **`nx release --yes`** — Nx inspects the commit history since the last git tag (`vX.Y.Z`)
   and uses Conventional Commits to decide the version bump:

   | Commit prefix | Bump |
   |--------------|------|
   | `fix:` / `fix(scope):` | patch (`0.0.x`) |
   | `feat:` / `feat(scope):` | minor (`0.x.0`) |
   | `BREAKING CHANGE:` in footer | major (`x.0.0`) |
   | `chore:`, `docs:`, `ci:`, `refactor:` | no bump (skipped) |

4. **All 15 packages share one version** — they are a fixed release group, so a single `fix:` commit
   in any one package bumps every package together under one `vX.Y.Z` git tag.

5. **What `nx release` does in order:**
   - Updates `version` in every `libs/*/package.json`
   - Updates (or creates) `CHANGELOG.md` at the workspace root
   - Commits those changes with message `chore(release): publish`
   - Creates a `vX.Y.Z` git tag
   - **Pushes the commit and tag** to `main` (via `git push --follow-tags`)
   - Builds the dist packages (`pnpm nx run-many -t build --all` runs before)
   - Publishes all 15 packages to npm (skips any version already on the registry)

6. **No changes → no release** — if all commits since the last tag are `chore:`, `ci:`, or other
   non-bumping types, `nx release` exits early and nothing is published.

### Creating a release

Just merge a PR into `main` with a properly prefixed commit message.
No manual steps are required.

```bash
# Patch release (bug fix)
git commit -m "fix(logging): correct sentry DSN initialisation"

# Minor release (new feature)
git commit -m "feat(components): add avatar upload component"

# Major release (breaking change)
git commit -m "feat(api)!: rename SneatApiService to ApiService

BREAKING CHANGE: SneatApiService has been renamed to ApiService"
```

### NPM token

The `NPM_TOKEN` secret must be set in the repository settings
(`Settings → Secrets and variables → Actions → NPM_TOKEN`) with a token that has
**Automation** publish rights to the `@sneat` npm organisation.
