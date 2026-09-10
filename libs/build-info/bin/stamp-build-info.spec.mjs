import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  PLACEHOLDERS,
  findMissingPlaceholders,
  parseArgs,
  resolveGitHash,
  resolveVersion,
  stampTs,
  versionFromDescribe,
} from './stamp-build-info.mjs';

const SAMPLE_TS = `export const buildInfo = {
  version: 'version t0be$et',
  gitHash: 'gitHash t0be$et',
  buildTimestamp: 'timestamp t0be$et',
};
`;

describe('versionFromDescribe', () => {
  it('returns X.Y.Z when exactly on a release tag', () => {
    expect(versionFromDescribe('v1.4.2-0-gabc1234', '0.0.0')).toBe('1.4.2');
  });

  it('returns X.Y.Z+N when N commits past the nearest tag', () => {
    expect(versionFromDescribe('v1.4.2-7-gabc1234', '0.0.0')).toBe('1.4.2+7');
  });

  it('falls back to packageVersion when describe output does not match', () => {
    expect(versionFromDescribe('not-a-describe-output', '2.0.0')).toBe('2.0.0');
  });

  describe('with a custom prefix', () => {
    it('returns X.Y.Z when exactly on a tag under the prefix namespace', () => {
      expect(
        versionFromDescribe('sneat-app/v0.1.0-0-gabc1234', '0.0.0', 'sneat-app/v'),
      ).toBe('0.1.0');
    });

    it('returns X.Y.Z+N when N commits past the nearest prefixed tag', () => {
      expect(
        versionFromDescribe('sneat-app/v0.1.0-3-gabc1234', '0.0.0', 'sneat-app/v'),
      ).toBe('0.1.0+3');
    });

    it('falls back to packageVersion when describe matches a different prefix', () => {
      // A bare `v0.1.0` tag does not satisfy the `sneat-app/v` namespace.
      expect(
        versionFromDescribe('v0.1.0-0-gabc1234', '9.9.9', 'sneat-app/v'),
      ).toBe('9.9.9');
    });

    it('escapes regex-special characters in the prefix', () => {
      expect(
        versionFromDescribe('a+b/v1.0.0-0-gabc1234', '0.0.0', 'a+b/v'),
      ).toBe('1.0.0');
      expect(versionFromDescribe('axb/v1.0.0-0-gabc1234', '0.0.0', 'a+b/v')).toBe(
        '0.0.0',
      );
    });
  });
});

describe('resolveGitHash', () => {
  it('prefers WORKERS_CI_COMMIT_SHA over the other sources', () => {
    const env = {
      WORKERS_CI_COMMIT_SHA: 'workers-sha',
      CF_PAGES_COMMIT_SHA: 'pages-sha',
      GITHUB_SHA: 'actions-sha',
    };
    expect(resolveGitHash(process.cwd(), env)).toBe('workers-sha');
  });

  it('falls back to CF_PAGES_COMMIT_SHA before GITHUB_SHA', () => {
    const env = { CF_PAGES_COMMIT_SHA: 'pages-sha', GITHUB_SHA: 'actions-sha' };
    expect(resolveGitHash(process.cwd(), env)).toBe('pages-sha');
  });

  it('falls back to GITHUB_SHA before running git', () => {
    const env = { GITHUB_SHA: 'actions-sha' };
    expect(resolveGitHash(process.cwd(), env)).toBe('actions-sha');
  });

  it('falls back to `git rev-parse HEAD` when no CI env var is set', () => {
    const hash = resolveGitHash(process.cwd(), {});
    expect(hash).toMatch(/^[0-9a-f]{40}$/);
  });
});

describe('stampTs', () => {
  it('rewrites version, gitHash and buildTimestamp in place', () => {
    const stamped = stampTs(SAMPLE_TS, {
      version: '1.2.3',
      gitHash: 'abcdef0123456789',
      buildTimestamp: '2026-09-10T00:00:00.000Z',
    });
    expect(stamped).toContain("version: '1.2.3'");
    expect(stamped).toContain("gitHash: 'abcdef0123456789'");
    expect(stamped).toContain("buildTimestamp: '2026-09-10T00:00:00.000Z'");
  });

  it('throws when a field is missing from the source shape', () => {
    const missingVersion = SAMPLE_TS.replace(/version:\s*'[^']*',\n/, '');
    expect(() =>
      stampTs(missingVersion, {
        version: '1.2.3',
        gitHash: 'abc',
        buildTimestamp: '2026-01-01T00:00:00.000Z',
      }),
    ).toThrow(/Could not find/);
  });

  it('refuses to stamp a value containing a single quote', () => {
    expect(() =>
      stampTs(SAMPLE_TS, {
        version: "1.2.3'; alert(1)",
        gitHash: 'abc',
        buildTimestamp: '2026-01-01T00:00:00.000Z',
      }),
    ).toThrow(/Refusing to stamp/);
  });
});

describe('findMissingPlaceholders', () => {
  it('returns an empty array when every placeholder is present', () => {
    expect(findMissingPlaceholders(SAMPLE_TS)).toEqual([]);
  });

  it('reports each field whose placeholder is missing', () => {
    const stamped = stampTs(SAMPLE_TS, {
      version: '1.2.3',
      gitHash: 'abcdef0123456789',
      buildTimestamp: '2026-09-10T00:00:00.000Z',
    });
    expect(findMissingPlaceholders(stamped)).toEqual([
      'version',
      'gitHash',
      'buildTimestamp',
    ]);
  });

  it('matches the exact literal placeholder values committed by @sneat/components', () => {
    expect(PLACEHOLDERS).toEqual({
      version: 'version t0be$et',
      gitHash: 'gitHash t0be$et',
      buildTimestamp: 'timestamp t0be$et',
    });
  });
});

describe('parseArgs', () => {
  it('defaults --ts and --json to build-info.ts/.json in the cwd, and --package/--tag-prefix to unset/"v"', () => {
    expect(parseArgs([])).toEqual({
      ts: 'build-info.ts',
      json: 'build-info.json',
      package: undefined,
      tagPrefix: 'v',
      check: false,
      help: false,
    });
  });

  it('parses --ts, --json and --check', () => {
    expect(
      parseArgs(['--ts', 'src/build-info.ts', '--json', 'dist/build-info.json', '--check']),
    ).toEqual({
      ts: 'src/build-info.ts',
      json: 'dist/build-info.json',
      package: undefined,
      tagPrefix: 'v',
      check: true,
      help: false,
    });
  });

  it('parses --package and --tag-prefix', () => {
    expect(
      parseArgs([
        '--package',
        'apps/sneat-app/package.json',
        '--tag-prefix',
        'sneat-app/v',
      ]),
    ).toEqual({
      ts: 'build-info.ts',
      json: 'build-info.json',
      package: 'apps/sneat-app/package.json',
      tagPrefix: 'sneat-app/v',
      check: false,
      help: false,
    });
  });

  it('throws on an unknown argument', () => {
    expect(() => parseArgs(['--nope'])).toThrow(/Unknown argument/);
  });

  it('throws when --ts is missing its value', () => {
    expect(() => parseArgs(['--ts'])).toThrow(/requires a path argument/);
  });

  it('throws when --package is missing its value', () => {
    expect(() => parseArgs(['--package'])).toThrow(/--package requires a path argument/);
  });

  it('throws when --tag-prefix is missing its value', () => {
    expect(() => parseArgs(['--tag-prefix'])).toThrow(
      /--tag-prefix requires a value argument/,
    );
  });
});

describe('resolveVersion', () => {
  const tempDirs = [];

  afterEach(() => {
    while (tempDirs.length > 0) {
      rmSync(tempDirs.pop(), { recursive: true, force: true });
    }
  });

  function makeTempPackageDir(version) {
    const dir = mkdtempSync(path.join(tmpdir(), 'stamp-build-info-'));
    tempDirs.push(dir);
    writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({ name: 'temp-fixture', version }),
    );
    return dir;
  }

  it('falls back to the --package package.json version when no repo/tag is reachable', () => {
    const dir = makeTempPackageDir('3.4.5');
    expect(resolveVersion(dir, 'package.json')).toBe('3.4.5');
  });

  it('resolves a nested --package path relative to cwd, like --ts/--json', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'stamp-build-info-'));
    tempDirs.push(dir);
    mkdirSync(path.join(dir, 'apps', 'sneat-app'), { recursive: true });
    writeFileSync(
      path.join(dir, 'apps', 'sneat-app', 'package.json'),
      JSON.stringify({ name: 'sneat-app', version: '7.8.9' }),
    );
    expect(resolveVersion(dir, 'apps/sneat-app/package.json')).toBe('7.8.9');
  });
});
