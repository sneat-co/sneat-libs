#!/usr/bin/env node

import { execFileSync } from 'node:child_process';

const argumentsSet = new Set(process.argv.slice(2));
const cached = argumentsSet.has('--cached');
const committed = argumentsSet.has('--committed');
const printVersion = argumentsSet.has('--version');

if (cached === committed) {
  fail('Choose exactly one of --cached or --committed.');
}

const baseline = cached ? 'HEAD' : 'HEAD^1';
const target = cached ? null : 'HEAD';
const changedFiles = git([
  'diff',
  '--name-only',
  '--diff-filter=ACDMRT',
  ...(cached ? ['--cached', baseline] : [baseline, target]),
])
  .split('\n')
  .filter(Boolean);

// Package manifests also change during ordinary feature/dependency work. A
// release candidate is distinguished by the generated workspace changelog.
if (!changedFiles.includes('CHANGELOG.md')) {
  if (!printVersion) {
    console.log('No release candidate in this revision.');
  }
  process.exit(0);
}

const manifestPattern = /^libs\/(?:[^/]+\/)+package\.json$/;
const disallowedFiles = changedFiles.filter(
  file => file !== 'CHANGELOG.md' && !manifestPattern.test(file),
);
if (disallowedFiles.length > 0) {
  fail(`Release candidate changes non-release files: ${disallowedFiles.join(', ')}`);
}

const changedManifests = changedFiles.filter(file => manifestPattern.test(file));
if (changedManifests.length === 0) {
  fail('Release candidate changes CHANGELOG.md but no package manifest.');
}

let candidateVersion = '';
for (const manifest of changedManifests) {
  const before = parseManifest(readRevisionFile(baseline, manifest), manifest, baseline);
  const after = parseManifest(readTargetFile(manifest), manifest, cached ? 'index' : 'HEAD');
  assertStableSemVer(before.version, `${manifest} previous version`);
  assertStableSemVer(after.version, `${manifest} candidate version`);
  if (compareVersions(after.version, before.version) <= 0) {
    fail(`${manifest} does not advance ${before.version}: ${after.version}`);
  }
  if (candidateVersion && after.version !== candidateVersion) {
    fail(`Fixed release versions disagree: ${candidateVersion} and ${after.version}`);
  }
  candidateVersion = after.version;
}

const allManifests = git(['ls-files', 'libs/**/package.json'])
  .split('\n')
  .filter(Boolean);
if (allManifests.length === 0) {
  fail('No publishable package manifests are tracked.');
}
for (const manifest of allManifests) {
  const projection = parseManifest(
    readTargetFile(manifest),
    manifest,
    cached ? 'index' : 'HEAD',
  );
  if (projection.version !== candidateVersion) {
    fail(`${manifest} remains at ${projection.version}; fixed release is ${candidateVersion}`);
  }
}

const changelog = readTargetFile('CHANGELOG.md');
const changelogVersion = changelog.match(
  /^##\s+((?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*))(?:\s|$)/m,
)?.[1];
if (!changelogVersion) {
  fail('CHANGELOG.md has no stable SemVer release heading.');
}
if (changelogVersion !== candidateVersion) {
  fail(`CHANGELOG.md announces ${changelogVersion}; fixed release is ${candidateVersion}.`);
}

const latestTag = git(['tag', '--list', 'v[0-9]*', '--sort=-version:refname'])
  .split('\n')
  .find(tag => /^v(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/.test(tag));
if (!latestTag) {
  fail('No stable vX.Y.Z release tag exists.');
}
if (compareVersions(candidateVersion, latestTag.slice(1)) <= 0) {
  fail(`Candidate ${candidateVersion} does not advance ${latestTag}.`);
}

if (printVersion) {
  console.log(candidateVersion);
} else {
  console.log(
    `Validated fixed release ${candidateVersion}: ${changedManifests.length} changed manifests, ${allManifests.length} packages.`,
  );
}

function git(args) {
  try {
    return execFileSync('git', args, { encoding: 'utf8' }).trim();
  } catch (error) {
    fail(`git ${args.join(' ')} failed: ${error.stderr?.toString().trim() || error.message}`);
  }
}

function readRevisionFile(revision, path) {
  return git(['show', `${revision}:${path}`]);
}

function readTargetFile(path) {
  return cached ? git(['show', `:${path}`]) : readRevisionFile('HEAD', path);
}

function parseManifest(content, path, revision) {
  try {
    const value = JSON.parse(content);
    if (typeof value.name !== 'string' || !value.name.startsWith('@sneat/')) {
      fail(`${path} at ${revision} is not a named @sneat package.`);
    }
    if (typeof value.version !== 'string') {
      fail(`${path} at ${revision} has no string version.`);
    }
    return value;
  } catch (error) {
    fail(`${path} at ${revision} is not valid JSON: ${error.message}`);
  }
}

function assertStableSemVer(version, label) {
  if (!/^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/.test(version)) {
    fail(`${label} is not stable SemVer: ${version}`);
  }
}

function compareVersions(left, right) {
  const leftParts = left.split('.').map(Number);
  const rightParts = right.split('.').map(Number);
  for (let index = 0; index < 3; index += 1) {
    if (leftParts[index] !== rightParts[index]) {
      return leftParts[index] - rightParts[index];
    }
  }
  return 0;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
