import { BUILD_INFO, IBuildInfo, provideBuildInfo } from './build-info';

describe('BUILD_INFO', () => {
  it('is one stable public injection token', () =>
    expect(BUILD_INFO.toString()).toContain('build_info'));
});

describe('provideBuildInfo', () => {
  it('returns a Provider that binds BUILD_INFO to the given value', () => {
    const buildInfo: IBuildInfo = {
      version: '1.2.3',
      gitHash: 'abc1234',
      buildTimestamp: '2026-09-10T00:00:00.000Z',
    };
    expect(provideBuildInfo(buildInfo)).toEqual({
      provide: BUILD_INFO,
      useValue: buildInfo,
    });
  });
});
