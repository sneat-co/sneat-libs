#!/usr/bin/env node
// sneat-stamp-build-info — stamps an app's own build metadata (version, git
// commit hash, UTC build timestamp) into a committed `build-info.ts`
// placeholder file and a gitignored `build-info.json` sibling, so the
// app can show its own build info (e.g. via @sneat/components'
// AppVersionComponent + @sneat/core-public's `provideBuildInfo()`) instead
// of never-restamped literals baked into a published npm package.
//
// Usage (wire as an Nx target the app's `build`/`serve` depend on):
//   sneat-stamp-build-info --ts <path/to/build-info.ts> --json <path/to/build-info.json>
//   sneat-stamp-build-info --check --ts <path/to/build-info.ts>
//
// In a monorepo, each app versions independently: pass --package and
// --tag-prefix so the version comes from that app's own package.json and its
// own release-tag namespace, not the repo root's (see README's "Monorepo
// with several apps" section):
//   sneat-stamp-build-info --ts apps/<app>/src/build-info.ts \
//     --json apps/<app>/src/build-info.json \
//     --package apps/<app>/package.json --tag-prefix <app>/v
//
// Design constraints (see sneat-co/sneat-libs PR that introduced this):
//   - ESM Node, zero runtime dependencies beyond Node's stdlib and `git` on
//     PATH — this file is the published npm `bin`, so it must run with no
//     `npm install` step of its own in the consuming app.
//   - `--ts`/`--json`/`--package` are resolved relative to `process.cwd()`,
//     NOT this file's own location — this script lives inside the consuming
//     app's node_modules/@sneat/build-info/bin/ once installed, so __dirname
//     is never the consuming app's repo.
//   - `--check` never writes anything; it only verifies the committed file
//     still carries the placeholders, for a pre-commit hook or CI guard
//     that must fail if a stamped build-info.ts was accidentally committed.
//
// Commit SHA source, in priority order:
//   1. WORKERS_CI_COMMIT_SHA — injected by Cloudflare Workers Builds
//      (https://developers.cloudflare.com/workers/ci-cd/builds/configuration/#environment-variables)
//   2. CF_PAGES_COMMIT_SHA   — Cloudflare Pages' equivalent, kept as a
//      defensive fallback for apps fronted by Pages instead of Workers Builds
//   3. GITHUB_SHA            — GitHub Actions' own commit SHA env var
//      (sneat-apps deploys from GitHub Actions, not Cloudflare Workers
//      Builds, so this is checked before falling back to git itself)
//   4. `git rev-parse HEAD`  — local runs, and the final fallback anywhere
//      none of the above are set
//
// Version, in priority order:
//   1. the nearest reachable release tag (`<tag-prefix>X.Y.Z`, prefix
//      defaults to `v`), via `git describe`: exactly on the tag -> "X.Y.Z";
//      N commits past it -> "X.Y.Z+N" (the commit itself is reported
//      separately as gitHash)
//   2. the `--package` package.json's "version" field (default: the repo
//      root's package.json) — a shallow clone without tags, or a repo/app
//      that has not been tagged yet
//
// The UTC build timestamp is `new Date().toISOString()` (no `date -u`
// subprocess), so it is identical and portable across GitHub Actions'
// ubuntu-latest runners, Cloudflare's build container, and a developer's
// own machine.

import { execFileSync } from 'node:child_process';
import { readFileSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// The literal placeholder values every consumer's build-info.ts must commit
// (never a real stamped value — see --check below).
export const PLACEHOLDERS = {
  version: 'version t0be$et',
  gitHash: 'gitHash t0be$et',
  buildTimestamp: 'timestamp t0be$et',
};

const FIELD_ORDER = /** @type {const} */ (['version', 'gitHash', 'buildTimestamp']);

/**
 * Resolves the commit SHA to stamp, preferring CI-injected env vars (which
 * are correct even in a shallow/detached checkout) over `git rev-parse`.
 */
export function resolveGitHash(cwd, env = process.env) {
  const fromEnv =
    env.WORKERS_CI_COMMIT_SHA || env.CF_PAGES_COMMIT_SHA || env.GITHUB_SHA;
  if (fromEnv) return fromEnv;
  return execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd,
    encoding: 'utf8',
  }).trim();
}

/** Escapes a string for safe use inside a `RegExp` literal. */
function escapeForRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Parses `git describe --tags --long --match '<prefix>[0-9]*'` output into a
 * version string: exactly on a tag -> "X.Y.Z"; N commits past it ->
 * "X.Y.Z+N". Falls back to `packageVersion` when `describe` isn't a
 * `<prefix>X.Y.Z-N-gHASH` triple (e.g. no matching tag is reachable).
 * `prefix` defaults to `'v'` (e.g. `v1.2.3`); pass a longer prefix such as
 * `'sneat-app/v'` for a per-app tag namespace (`sneat-app/v1.2.3`).
 */
export function versionFromDescribe(describe, packageVersion, prefix = 'v') {
  const pattern = new RegExp(
    `^${escapeForRegExp(prefix)}(\\d+\\.\\d+\\.\\d+)-(\\d+)-g[0-9a-f]+$`,
  );
  const match = pattern.exec(describe.trim());
  if (!match) return packageVersion;
  return match[2] === '0' ? match[1] : `${match[1]}+${match[2]}`;
}

function readRepoRoot(cwd) {
  return execFileSync('git', ['rev-parse', '--show-toplevel'], {
    cwd,
    encoding: 'utf8',
  }).trim();
}

/**
 * Reads the `version` field from `packagePath` (default: the repo root's
 * `package.json`) — resolved relative to `cwd`, matching `--ts`/`--json`.
 */
function readPackageVersion(cwd, packagePath) {
  const resolvedPath = packagePath
    ? path.resolve(cwd, packagePath)
    : path.join(readRepoRoot(cwd), 'package.json');
  const pkg = JSON.parse(readFileSync(resolvedPath, 'utf8'));
  return typeof pkg.version === 'string' ? pkg.version : '0.0.0';
}

/**
 * Resolves the version to stamp — see the module doc comment for precedence.
 * `packagePath` (default: repo root `package.json`) is the fallback source
 * and the `--package` flag's value; `tagPrefix` (default `'v'`) is the
 * `--tag-prefix` flag's value, namespacing `git describe --match`.
 */
export function resolveVersion(cwd, packagePath, tagPrefix = 'v') {
  const packageVersion = readPackageVersion(cwd, packagePath);
  try {
    const describe = execFileSync(
      'git',
      ['describe', '--tags', '--long', '--match', `${tagPrefix}[0-9]*`],
      { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    );
    return versionFromDescribe(describe, packageVersion, tagPrefix);
  } catch {
    return packageVersion;
  }
}

/**
 * Rewrites the `field: '...'` literal for one field in a build-info.ts's
 * source text. Throws if the field isn't present in the expected shape —
 * a loud failure beats silently leaving a stale placeholder in place.
 */
function replaceField(content, field, value) {
  if (typeof value !== 'string' || value.includes("'")) {
    throw new Error(
      `Refusing to stamp ${field} with a non-string or single-quote-containing value: ${JSON.stringify(value)}`,
    );
  }
  const pattern = new RegExp(`(${field}\\s*:\\s*)'[^']*'`);
  if (!pattern.test(content)) {
    throw new Error(
      `Could not find a "${field}: '...'" field to stamp — did build-info.ts's shape change? Expected an IBuildInfo-shaped object literal (see @sneat/core-public).`,
    );
  }
  return content.replace(pattern, `$1'${value}'`);
}

/** Stamps version/gitHash/buildTimestamp into a build-info.ts's source text. */
export function stampTs(content, buildInfo) {
  return FIELD_ORDER.reduce(
    (next, field) => replaceField(next, field, buildInfo[field]),
    content,
  );
}

/** Returns the placeholder field names, if any, missing from `content`. */
export function findMissingPlaceholders(content) {
  return FIELD_ORDER.filter(
    field => !content.includes(`${field}: '${PLACEHOLDERS[field]}'`),
  );
}

export function parseArgs(argv) {
  const args = {
    ts: 'build-info.ts',
    json: 'build-info.json',
    package: undefined,
    tagPrefix: 'v',
    check: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--ts') {
      i += 1;
      if (argv[i] === undefined) throw new Error('--ts requires a path argument');
      args.ts = argv[i];
    } else if (arg === '--json') {
      i += 1;
      if (argv[i] === undefined) throw new Error('--json requires a path argument');
      args.json = argv[i];
    } else if (arg === '--package') {
      i += 1;
      if (argv[i] === undefined) throw new Error('--package requires a path argument');
      args.package = argv[i];
    } else if (arg === '--tag-prefix') {
      i += 1;
      if (argv[i] === undefined) throw new Error('--tag-prefix requires a value argument');
      args.tagPrefix = argv[i];
    } else if (arg === '--check') {
      args.check = true;
    } else if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg} (see --help)`);
    }
  }
  return args;
}

const HELP_TEXT = `sneat-stamp-build-info — stamp version/gitHash/buildTimestamp into a build-info.ts + build-info.json

Usage:
  sneat-stamp-build-info [--ts <path>] [--json <path>] [--package <path>] [--tag-prefix <prefix>]
  sneat-stamp-build-info --check [--ts <path>]

Options:
  --ts <path>          Path to the app's build-info.ts (default: ./build-info.ts, relative to cwd)
  --json <path>        Path to write build-info.json (default: ./build-info.json, relative to cwd)
  --package <path>     Path to the package.json whose "version" is the fallback/source of truth
                        (default: the repo root's package.json). Relative to cwd. Use this for a
                        per-app version in a monorepo, e.g. --package apps/<app>/package.json.
  --tag-prefix <pfx>   Prefix for the release-tag match passed to
                        \`git describe --tags --long --match '<prefix>[0-9]*'\` (default: "v").
                        Use a per-app namespace, e.g. --tag-prefix <app>/v to match <app>/vX.Y.Z.
  --check              Verify --ts still carries the committed placeholders; writes nothing. Exits
                        non-zero if a real stamped value is found (for a pre-commit hook or CI guard).
  -h, --help           Show this help.
`;

function runCheck(tsPath) {
  const content = readFileSync(tsPath, 'utf8');
  const missing = findMissingPlaceholders(content);
  if (missing.length > 0) {
    console.error(
      `[sneat-stamp-build-info] ${tsPath} is missing the placeholder(s) for: ${missing.join(', ')}. ` +
        'A stamped build-info.ts must never be committed — did a stamped working tree get "git add"ed by mistake?',
    );
    process.exitCode = 1;
    return;
  }
  console.log(`[sneat-stamp-build-info] ${tsPath} still carries its committed placeholders — OK.`);
}

function runStamp(tsPath, jsonPath, cwd, packagePath, tagPrefix) {
  const gitHash = resolveGitHash(cwd);
  const buildTimestamp = new Date().toISOString();
  const version = resolveVersion(cwd, packagePath, tagPrefix);
  const buildInfo = { version, gitHash, buildTimestamp };

  const originalTs = readFileSync(tsPath, 'utf8');
  writeFileSync(tsPath, stampTs(originalTs, buildInfo));
  writeFileSync(jsonPath, `${JSON.stringify(buildInfo, null, 2)}\n`);

  console.log(
    `[sneat-stamp-build-info] version=${version} gitHash=${gitHash.substring(0, 7)} buildTimestamp=${buildTimestamp}`,
  );
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(HELP_TEXT);
    return;
  }
  const cwd = process.cwd();
  const tsPath = path.resolve(cwd, args.ts);
  if (args.check) {
    runCheck(tsPath);
    return;
  }
  const jsonPath = path.resolve(cwd, args.json);
  runStamp(tsPath, jsonPath, cwd, args.package, args.tagPrefix);
}

function isBeingRunDirectly() {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
}

// Guarded so tests can `import` the pure functions above without triggering
// filesystem/git side effects — resolved via realpathSync because npm
// installs this bin as a symlink (node_modules/.bin/sneat-stamp-build-info),
// and process.argv[1] reports that symlink path unresolved while
// import.meta.url already reports this file's real path.
if (isBeingRunDirectly()) {
  try {
    main();
  } catch (error) {
    console.error(
      `[sneat-stamp-build-info] ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exitCode = 1;
  }
}
