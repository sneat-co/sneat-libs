import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const workspaceRoot = process.cwd();
const rootManifest = JSON.parse(
  readFileSync(join(workspaceRoot, 'package.json'), 'utf8'),
);
const testedVersions = rootManifest.devDependencies ?? {};
const peerPackages = new Set([
  '@capacitor/core',
  '@capacitor-firebase/authentication',
]);

function parseVersion(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(version);
  if (!match) throw new Error(`Unsupported version: ${version}`);
  return match.slice(1).map(Number);
}

function compareVersions(left, right) {
  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return 0;
}

function satisfies(version, range) {
  const actual = parseVersion(version);
  return range.split(/\s+/).every((comparator) => {
    const match = /^(>=|<=|>|<|=)?(\d+\.\d+\.\d+)$/.exec(comparator);
    if (!match) throw new Error(`Unsupported peer range: ${range}`);
    const comparison = compareVersions(actual, parseVersion(match[2]));
    switch (match[1] ?? '=') {
      case '>=':
        return comparison >= 0;
      case '<=':
        return comparison <= 0;
      case '>':
        return comparison > 0;
      case '<':
        return comparison < 0;
      default:
        return comparison === 0;
    }
  });
}

function packageManifests(directory) {
  const manifests = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist') continue;
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      manifests.push(...packageManifests(entryPath));
    } else if (entry.name === 'package.json') {
      manifests.push(entryPath);
    }
  }
  return manifests;
}

const mismatches = [];
for (const packageJsonPath of packageManifests(join(workspaceRoot, 'libs'))) {
  const manifest = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  for (const packageName of peerPackages) {
    const range = manifest.peerDependencies?.[packageName];
    const testedVersion = testedVersions[packageName];
    if (!range || !testedVersion || satisfies(testedVersion, range)) continue;
    mismatches.push(
      `${manifest.name} declares ${packageName} ${range}, but the root ` +
        `devDependency tested by this workspace is ${testedVersion}`,
    );
  }
}

if (mismatches.length > 0) {
  throw new Error(
    `Capacitor peer compatibility check failed:\n- ${mismatches.join('\n- ')}`,
  );
}

console.log(
  'Capacitor peer compatibility check passed for all workspace package manifests.',
);
