import { InjectionToken, Provider } from '@angular/core';

// Runtime contract for showing an app's own build metadata (version, git
// commit, build time) — e.g. in a side-menu "App version" panel. Mirrors the
// shape of `app-info.ts`'s `IAppInfo`/`APP_INFO` pair in this same file
// group: a plain interface + an `InjectionToken` an app provides a concrete
// value for at bootstrap.
//
// Why this is a *runtime* contract and not a compile-time import: a
// consuming app's own git hash/build timestamp/version can only be known at
// that app's own build time, never at sneat-libs' build time. A component
// that imports a literal `buildInfo` object (as `@sneat/components`'
// `AppVersionComponent` used to) bakes sneat-libs' own (never-restamped)
// values into every consumer, however the earlier `sneat-stamp-build-info`
// bin (`@sneat/build-info`) stamps that app's own files. Providing this
// token instead lets each app supply its own stamped `IBuildInfo` via
// `provideBuildInfo()` — `AppVersionComponent` renders whatever is (or
// isn't) provided, and never needs a code change per consumer.
export interface IBuildInfo {
  readonly version: string;
  readonly gitHash: string;
  readonly buildTimestamp: string;
}

export const BUILD_INFO = new InjectionToken<IBuildInfo>('build_info');

/** Registers `buildInfo` for injection via `BUILD_INFO` — call once in the app's bootstrap providers (e.g. `app.config.ts` or `main.ts`'s `bootstrapApplication`). */
export function provideBuildInfo(buildInfo: IBuildInfo): Provider {
  return { provide: BUILD_INFO, useValue: buildInfo };
}
