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

## CLI reference

```
sneat-stamp-build-info [--ts <path>] [--json <path>]
sneat-stamp-build-info --check [--ts <path>]
```

| Flag | Default | Meaning |
|------|---------|---------|
| `--ts <path>` | `build-info.ts` | Path to the committed placeholder file to stamp (or, with `--check`, to verify). Resolved relative to the current working directory. |
| `--json <path>` | `build-info.json` | Path to (over)write with `{ version, gitHash, buildTimestamp }`. Resolved relative to the current working directory. |
| `--check` | off | Verifies `--ts` still carries the committed placeholders; writes nothing and exits non-zero if a real stamped value is found. |

Commit SHA precedence: `WORKERS_CI_COMMIT_SHA` (Cloudflare Workers Builds) →
`CF_PAGES_COMMIT_SHA` (Cloudflare Pages) → `GITHUB_SHA` (GitHub Actions) →
`git rev-parse HEAD` (local runs, and the final fallback anywhere else).

Version precedence: the nearest reachable `vX.Y.Z` tag via
`git describe --tags --long --match 'v[0-9]*'` (`X.Y.Z` exactly on the tag,
`X.Y.Z+N` for N commits past it) → the app repo root's `package.json`
`"version"` field.

Timestamp: `new Date().toISOString()` — UTC, no shell `date` subprocess.

Zero runtime dependencies beyond Node's stdlib and `git` on `PATH`.
