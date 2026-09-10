import { IBuildInfo } from '@sneat/core-public';

// Fallback shown by AppVersionComponent when no app has called
// `provideBuildInfo()` (see @sneat/core-public's build-info.ts for the
// runtime contract). This file's own values are placeholders baked into
// the published @sneat/components package at *sneat-libs'* own build — they
// never reflect a consuming app's real git hash, so they only render when
// nothing overrides BUILD_INFO. A consuming app gets its own real values by
// running `sneat-stamp-build-info` (published as @sneat/build-info) against
// its own `build-info.ts` and calling `provideBuildInfo(buildInfo)` at
// bootstrap — see libs/build-info/README.md for the full recipe.
//
// TODO: Needs pre-commit hook to check gitHash and buildTimestamp are NOT changed.
export const buildInfo: IBuildInfo = {
  version: 'version t0be$et',
  gitHash: 'gitHash t0be$et',
  buildTimestamp: 'timestamp t0be$et',
};
