import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
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
