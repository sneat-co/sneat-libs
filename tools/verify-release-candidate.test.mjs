import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, unlinkSync, renameSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const verifier = fileURLToPath(
  new URL('./verify-release-candidate.mjs', import.meta.url),
);

test('accepts staged and committed fixed release candidates', () => {
  const staged = fixture();
  prepareCandidate(staged, '0.26.0');
  assert.equal(run(staged, '--cached').stdout.trim(), '0.26.0');

  git(staged, ['commit', '-m', 'chore(release): prepare 0.26.0']);
  assert.equal(run(staged, '--committed').stdout.trim(), '0.26.0');
});

test('accepts a release candidate that also refreshes pnpm-lock.yaml', () => {
  // `nx release` runs a lockfile-only install after bumping versions, so a
  // real release candidate always touches pnpm-lock.yaml alongside the
  // manifests. That is an expected, derived change, not scope creep.
  const directory = fixture();
  prepareCandidate(directory, '0.26.0');
  writeFileSync(join(directory, 'pnpm-lock.yaml'), 'lockfileVersion: 9.0\n');
  git(directory, ['add', 'pnpm-lock.yaml']);
  assert.equal(run(directory, '--cached').stdout.trim(), '0.26.0');
});

const planPath = '.nx/version-plans/version-plan-1234567890.md';
const nativePlan = '---\n__default__: minor\n---\n\nFix authenticated linking.\n';
function trackedPlan(directory, content = nativePlan) {
  mkdirSync(join(directory, '.nx/version-plans'), { recursive: true });
  writeFileSync(join(directory, planPath), content);
  git(directory, ['add', planPath]);
  git(directory, ['commit', '-m', 'fix: record native version plan']);
}

test('accepts only consumed preexisting native plans in staged and committed releases', () => {
  const directory = fixture();
  trackedPlan(directory);
  prepareCandidate(directory, '0.26.0');
  git(directory, ['rm', planPath]); // Nx itself stages consumed plan removals.
  assert.equal(run(directory, '--cached').stdout.trim(), '0.26.0');
  git(directory, ['commit', '-m', 'chore(release): prepare 0.26.0']);
  assert.equal(run(directory, '--committed').stdout.trim(), '0.26.0');
});

test('rejects added, modified and renamed version-plan metadata', () => {
  for (const change of ['added', 'modified', 'renamed']) {
    const directory = fixture();
    if (change !== 'added') trackedPlan(directory);
    else mkdirSync(join(directory, '.nx/version-plans'), { recursive: true });
    prepareCandidate(directory, '0.26.0');
    if (change === 'renamed') renameSync(join(directory, planPath), join(directory, '.nx/version-plans/renamed.md'));
    else writeFileSync(join(directory, planPath), nativePlan + 'Unexpected candidate edit.\n');
    git(directory, ['add', '-A', '.nx']);
    assert.match(run(directory, '--cached', false).stderr, /non-release files/);
  }
});

test('rejects deletion of malformed, nested, other metadata or symlink plans', () => {
  for (const kind of ['malformed', 'nested', 'other', 'symlink']) {
    const directory = fixture();
    trackedPlan(directory, kind === 'malformed' ? '# Not a native version plan\n' : nativePlan);
    let path = planPath;
    if (kind === 'nested') {
      path = '.nx/version-plans/nested/plan.md';
      mkdirSync(join(directory, '.nx/version-plans/nested'));
      renameSync(join(directory, planPath), join(directory, path));
    } else if (kind === 'other') {
      path = '.nx/operator-notes.md';
      renameSync(join(directory, planPath), join(directory, path));
    } else if (kind === 'symlink') {
      unlinkSync(join(directory, planPath));
      symlinkSync('../../CHANGELOG.md', join(directory, planPath));
    }
    git(directory, ['add', '-A', '.nx']);
    git(directory, ['commit', '-m', 'test: baseline metadata shape', '--allow-empty']);
    prepareCandidate(directory, '0.26.0');
    git(directory, ['rm', path]);
    assert.match(run(directory, '--cached', false).stderr, /non-release files/);
  }
});

test('actual prepare step uses native plans and otherwise the chosen bump without interpolation', () => {
  const workflow = readFileSync(new URL('../.github/workflows/release.yml', import.meta.url), 'utf8');
  const step = workflow.split('      - name: Prepare version and changelog\n')[1].split('      - name: Validate the staged release candidate')[0];
  assert.match(step, /RELEASE_BUMP: \$\{\{ inputs.bump \}\}/);
  const command = step.split('        run: |\n')[1].split('\n').map(line => line.replace(/^ {10}/, '')).join('\n');
  for (const withPlan of [false, true]) {
    const directory = fixture();
    if (withPlan) trackedPlan(directory);
    const bin = join(directory, 'fake-bin');
    mkdirSync(bin);
    writeFileSync(join(bin, 'pnpm'), '#!/bin/sh\nprintf "%s\\n" "$@" > "$ARGS_RECEIPT"\n', { mode: 0o755 });
    const receipt = join(directory, 'args.txt');
    const result = spawnSync('bash', ['-c', command], { cwd: directory, encoding: 'utf8', env: { ...process.env, PATH: bin + ':' + process.env.PATH, RELEASE_BUMP: 'minor', ARGS_RECEIPT: receipt } });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(readFileSync(receipt, 'utf8').trim().split('\n'), withPlan ? ['nx', 'release', '--skip-publish'] : ['nx', 'release', 'minor', '--skip-publish']);
    const invalid = spawnSync('bash', ['-c', command], { cwd: directory, encoding: 'utf8', env: { ...process.env, PATH: bin + ':' + process.env.PATH, RELEASE_BUMP: '$(touch unexpected)', ARGS_RECEIPT: receipt } });
    assert.notEqual(invalid.status, 0);
  }
});

test('ignores the structured-data secondary entrypoint manifest in fixed release checks', () => {
  const directory = fixture();
  mkdirSync(join(directory, 'libs/structured-data/core'), { recursive: true });
  writeFileSync(join(directory, 'libs/structured-data/core/package.json'),
    '{"name":"@sneat/structured-data/core"}\n');
  git(directory, ['add', 'libs/structured-data/core/package.json']);
  git(directory, ['commit', '-m', 'feat: add secondary entrypoint']);
  prepareCandidate(directory, '0.26.0');
  assert.equal(run(directory, '--cached').stdout.trim(), '0.26.0');
});

test('skips an ordinary manifest-only source change', () => {
  const directory = fixture();
  writeManifest(directory, 'libs/alpha/package.json', '@sneat/alpha', '0.25.0', {
    description: 'source metadata',
  });
  git(directory, ['add', 'libs/alpha/package.json']);
  assert.equal(run(directory, '--cached').stdout, '');
});

test('rejects a release candidate containing source files', () => {
  const directory = fixture();
  prepareCandidate(directory, '0.26.0');
  writeFileSync(join(directory, 'libs/alpha/index.js'), 'export const changed = true;\n');
  git(directory, ['add', 'libs/alpha/index.js']);
  assert.match(run(directory, '--cached', false).stderr, /non-release files/);
});

test('rejects a changelog without a package manifest', () => {
  const directory = fixture();
  writeFileSync(join(directory, 'CHANGELOG.md'), '# 0.26.0\n');
  git(directory, ['add', 'CHANGELOG.md']);
  assert.match(run(directory, '--cached', false).stderr, /no package manifest/);
});

test('rejects non-advancing and tag-colliding versions', () => {
  const nonAdvancing = fixture();
  prepareCandidate(nonAdvancing, '0.24.9');
  assert.match(run(nonAdvancing, '--cached', false).stderr, /does not advance/);

  const tagCollision = fixture();
  git(tagCollision, ['tag', 'v0.26.0']);
  prepareCandidate(tagCollision, '0.26.0');
  assert.match(run(tagCollision, '--cached', false).stderr, /does not advance v0\.26\.0/);
});

test('rejects mismatched fixed package versions', () => {
  const directory = fixture();
  writeFileSync(join(directory, 'CHANGELOG.md'), '# 0.26.0\n');
  writeManifest(directory, 'libs/alpha/package.json', '@sneat/alpha', '0.26.0');
  writeManifest(directory, 'libs/beta/package.json', '@sneat/beta', '0.27.0');
  git(directory, ['add', 'CHANGELOG.md', 'libs/alpha/package.json', 'libs/beta/package.json']);
  assert.match(run(directory, '--cached', false).stderr, /versions disagree/);
});

test('rejects leaving an unchanged package behind the fixed release', () => {
  const directory = fixture();
  writeFileSync(join(directory, 'CHANGELOG.md'), '# 0.26.0\n');
  writeManifest(directory, 'libs/alpha/package.json', '@sneat/alpha', '0.26.0');
  git(directory, ['add', 'CHANGELOG.md', 'libs/alpha/package.json']);
  assert.match(run(directory, '--cached', false).stderr, /remains at 0\.25\.0/);
});

test('rejects a changelog version that disagrees with the fixed release', () => {
  const directory = fixture();
  prepareCandidate(directory, '0.26.0');
  writeFileSync(join(directory, 'CHANGELOG.md'), '# Changelog\n\n## 0.27.0\n');
  git(directory, ['add', 'CHANGELOG.md']);
  assert.match(run(directory, '--cached', false).stderr, /announces 0\.27\.0/);
});

function fixture() {
  const directory = mkdtempSync(join(tmpdir(), 'sneat-release-candidate-'));
  git(directory, ['init', '--initial-branch=main']);
  git(directory, ['config', 'user.email', 'tests@sneat.co']);
  git(directory, ['config', 'user.name', 'Sneat tests']);
  mkdirSync(join(directory, 'libs/alpha'), { recursive: true });
  mkdirSync(join(directory, 'libs/beta'), { recursive: true });
  writeFileSync(join(directory, 'CHANGELOG.md'), '# Changelog\n');
  writeManifest(directory, 'libs/alpha/package.json', '@sneat/alpha', '0.25.0');
  writeManifest(directory, 'libs/beta/package.json', '@sneat/beta', '0.25.0');
  git(directory, ['add', '.']);
  git(directory, ['commit', '-m', 'chore: baseline']);
  git(directory, ['tag', 'v0.25.0']);
  return directory;
}

function prepareCandidate(directory, version) {
  writeFileSync(join(directory, 'CHANGELOG.md'), `# Changelog\n\n## ${version}\n`);
  writeManifest(directory, 'libs/alpha/package.json', '@sneat/alpha', version);
  writeManifest(directory, 'libs/beta/package.json', '@sneat/beta', version);
  git(directory, ['add', 'CHANGELOG.md', 'libs/alpha/package.json', 'libs/beta/package.json']);
}

function writeManifest(directory, path, name, version, additional = {}) {
  writeFileSync(
    join(directory, path),
    `${JSON.stringify({ name, version, ...additional }, null, 2)}\n`,
  );
}

function git(directory, args) {
  return execFileSync('git', args, { cwd: directory, encoding: 'utf8' });
}

function run(directory, mode, succeeds = true) {
  const result = spawnSync(
    process.execPath,
    [verifier, mode, '--version'],
    { cwd: directory, encoding: 'utf8' },
  );
  if (succeeds) {
    assert.equal(result.status, 0, result.stderr);
  } else {
    assert.notEqual(result.status, 0, result.stdout);
  }
  return result;
}
