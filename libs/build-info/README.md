# @sneat/build-info

Generic, per-app "what am I running" plumbing: a stamping script that writes
an app's own version, git commit hash, and UTC build timestamp into two
files ahead of every build — a committed `build-info.ts` (rendered in the
app itself, e.g. a side-menu "App version" panel) and a gitignored
`build-info.json` (a curl-able `/build-info.json` at the deployed origin).

The runtime contract this feeds — `IBuildInfo`, the `BUILD_INFO` injection
token, and `provideBuildInfo()` — lives in
[`@sneat/core-public`](../core-public) (also re-exported from
[`@sneat/core`](../core)), not here: this package ships only the Node CLI
that produces the values, so it stays a dependency-free `devDependency`,
never a runtime one.

[`@sneat/components`](../components)' `AppVersionComponent`
(`<sneat-app-version />`, see
[its own README](../components/src/lib/app-version/README.md) for inputs and
the collapsed/expanded shape) already injects `BUILD_INFO` — once an app
wires the three steps below, that component shows the app's own build info
with no further changes.

## Why a runtime token instead of a compile-time import

A component that imports a literal `buildInfo` object gets whatever was true
when **that package** was built — for `@sneat/components` itself, that is
sneat-libs' own (never-restamped) placeholder values, not any consuming
app's git hash. `provideBuildInfo()` lets each app supply its *own* stamped
value at bootstrap instead.

## Consumer recipe

1. **Add a committed `build-info.ts`** wherever your app's providers are set
   up (e.g. `apps/<app>/src/build-info.ts`), with placeholder values:

   ```ts
   import { IBuildInfo } from '@sneat/core-public';

   // Stamped by `sneat-stamp-build-info` ahead of every build/serve — see
   // this app's `stamp-build-info` Nx target. Never commit real values here;
   // build-info.spec.ts (below) guards the committed blob.
   export const buildInfo: IBuildInfo = {
     version: 'version t0be$et',
     gitHash: 'gitHash t0be$et',
     buildTimestamp: 'timestamp t0be$et',
   };
   ```

2. **Provide it at bootstrap** (`app.config.ts`, or `main.ts`'s
   `bootstrapApplication(...)` providers array):

   ```ts
   import { provideBuildInfo } from '@sneat/core-public';
   import { buildInfo } from './build-info';

   // ...providers: [provideBuildInfo(buildInfo), ...]
   ```

3. **Wire the stamp as an Nx target your `build`/`serve` depend on**
   (`apps/<app>/project.json`):

   ```jsonc
   {
     "targets": {
       "stamp-build-info": {
         "executor": "nx:run-commands",
         "options": {
           "command": "sneat-stamp-build-info --ts apps/<app>/src/build-info.ts --json apps/<app>/src/build-info.json"
         },
         "outputs": ["{workspaceRoot}/apps/<app>/src/build-info.json"],
         "cache": false
       },
       "build": { "dependsOn": ["stamp-build-info"], /* ...existing options */ },
       "serve": { "dependsOn": ["stamp-build-info"], /* ...existing options */ }
     }
   }
   ```

   Add `build-info.json` to the `build` target's `assets` glob so it lands
   at the dist root (e.g. Angular's `@angular-devkit/build-angular:application`
   executor):

   ```jsonc
   "assets": [
     "apps/<app>/src/favicon.ico",
     "apps/<app>/src/assets",
     { "glob": "build-info.json", "input": "apps/<app>/src", "output": "." }
   ]
   ```

4. **Gitignore the generated JSON** (never the `.ts` — that one stays
   committed with its placeholders):

   ```gitignore
   apps/<app>/src/build-info.json
   ```

5. **Guard the committed placeholders** with a spec that reads the
   *committed* blob (not the working tree, which a concurrent
   `stamp-build-info` run may already have rewritten):

   ```ts
   import { execFileSync } from 'node:child_process';

   it('keeps build-info.ts placeholders committed', () => {
     const committed = execFileSync(
       'git',
       ['show', 'HEAD:apps/<app>/src/build-info.ts'],
       { encoding: 'utf8' },
     );
     expect(committed).toContain("version: 'version t0be$et'");
     expect(committed).toContain("gitHash: 'gitHash t0be$et'");
     expect(committed).toContain("buildTimestamp: 'timestamp t0be$et'");
   });
   ```

   The same two-argument shape (`--ts <path> --check`) also works as a
   pre-commit hook or a dedicated CI step:

   ```bash
   npx sneat-stamp-build-info --check --ts apps/<app>/src/build-info.ts
   ```

## Monorepo with several apps

**Each app versions independently.** A monorepo root `package.json` is not a
version for any one app — don't let an app's build info fall back to it.
Give each app its own `package.json` (just enough for `resolveVersion`'s
fallback — no `dependencies` needed, since it's never installed from) and its
own release-tag namespace, then point `--package`/`--tag-prefix` at them:

1. **Add an app-level `package.json`** (e.g. `apps/<app>/package.json`):

   ```json
   {
     "name": "<app>",
     "version": "0.1.0",
     "private": true
   }
   ```

2. **Tag releases per app**, not at the repo root: `<app>/vX.Y.Z` (e.g.
   `sneat-app/v0.1.0`), not a bare `vX.Y.Z` — a bare tag is ambiguous once
   more than one app shares the repo.

3. **Point the Nx target at both flags** (`apps/<app>/project.json`):

   ```jsonc
   {
     "targets": {
       "stamp-build-info": {
         "executor": "nx:run-commands",
         "options": {
           "command": "sneat-stamp-build-info --ts apps/<app>/src/build-info.ts --json apps/<app>/src/build-info.json --package apps/<app>/package.json --tag-prefix <app>/v"
         },
         "outputs": ["{workspaceRoot}/apps/<app>/src/build-info.json"],
         "cache": false
       }
     }
   }
   ```

   `--tag-prefix sneat-app/v` matches `sneat-app/v0.1.0` → `0.1.0`, and
   `sneat-app/v0.1.0-3-gabc1234` (3 commits past that tag) → `0.1.0+3`; with
   no matching tag reachable, it falls back to `apps/<app>/package.json`'s
   `"version"` field instead of the repo root's.

## CLI reference

```
sneat-stamp-build-info [--ts <path>] [--json <path>] [--package <path>] [--tag-prefix <prefix>]
sneat-stamp-build-info --check [--ts <path>]
```

| Flag | Default | Meaning |
|------|---------|---------|
| `--ts <path>` | `build-info.ts` | Path to the committed placeholder file to stamp (or, with `--check`, to verify). Resolved relative to the current working directory. |
| `--json <path>` | `build-info.json` | Path to (over)write with `{ version, gitHash, buildTimestamp }`. Resolved relative to the current working directory. |
| `--package <path>` | the repo root's `package.json` | Path to the `package.json` whose `"version"` is the fallback (and source of truth when no matching tag is reachable). Resolved relative to the current working directory. Use a per-app `package.json` in a monorepo — see "Monorepo with several apps" above. |
| `--tag-prefix <prefix>` | `v` | Prefix for the release-tag match: `git describe --tags --long --match '<prefix>[0-9]*'`, with the prefix stripped when parsing. Use a per-app namespace such as `<app>/v` so each app's tags (`<app>/vX.Y.Z`) don't collide with another app's. |
| `--check` | off | Verifies `--ts` still carries the committed placeholders; writes nothing and exits non-zero if a real stamped value is found. |

Commit SHA precedence: `WORKERS_CI_COMMIT_SHA` (Cloudflare Workers Builds) →
`CF_PAGES_COMMIT_SHA` (Cloudflare Pages) → `GITHUB_SHA` (GitHub Actions) →
`git rev-parse HEAD` (local runs, and the final fallback anywhere else).

Version precedence: the nearest reachable `<tag-prefix>X.Y.Z` tag (prefix
defaults to `v`) via
`git describe --tags --long --match '<tag-prefix>[0-9]*'` (`X.Y.Z` exactly on
the tag, `X.Y.Z+N` for N commits past it) → the `--package` package.json's
`"version"` field (default: the repo root's `package.json`).

Timestamp: `new Date().toISOString()` — UTC, no shell `date` subprocess.

Zero runtime dependencies beyond Node's stdlib and `git` on `PATH`.
