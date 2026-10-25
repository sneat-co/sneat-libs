# AppVersionComponent (`<sneat-app-version />`)

A collapsible footer row showing an app's copyright line, expandable to
reveal its version, short git hash, and UTC build timestamp. Collapsed by
default — founder ruling 2026-09-11: the previous always-expanded "App
version" card took too much side-menu/footer space, so this is one tappable
`ion-item` row instead, using Ionic's own chevron icon for the
expand/collapse control (no emoji).

## Usage

Wire up `@sneat/build-info` once (see
[`libs/build-info/README.md`](../../../../build-info/README.md)'s consumer
recipe) so the component shows *your* app's real build info instead of
`@sneat/components`' own placeholders:

```ts
import { provideBuildInfo } from '@sneat/core-public';
import { buildInfo } from './build-info'; // this app's own stamped file

// app.config.ts, or main.ts's bootstrapApplication(...) providers
providers: [provideBuildInfo(buildInfo) /* , ...other providers */];
```

```html
<sneat-app-version />
```

Collapsed, it renders `<startYear> - <buildYear> © <copyrightHolder>`, where
`copyrightHolder` is a link to `copyrightUrl`. Tapping the row expands two
more rows: `Version v<version>` and `Build <short hash> @ <timestamp>` (the
full hash is that row's `title`). With no `provideBuildInfo()` call anywhere
in the app, it falls back to `@sneat/components`' own committed placeholder
values.

## Inputs

| Input             | Default                  | Meaning                                                                                                                                                            |
| ------------------ | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `copyrightHolder` | `'Sneat.Work'`            | Name shown in the collapsed row's link. Sneat.Work is the copyright holder for every Sneat app — override only for a genuinely different rights holder.          |
| `copyrightUrl`    | `'https://sneat.work'`    | URL the `copyrightHolder` link points to.                                                                                                                         |
| `startYear`       | `2020`                    | First year of the copyright range. The end year is always the build year (from `BUILD_INFO`'s `buildTimestamp`, or the current year when unstamped) — never hand-committed, so it can't go stale. |

## `data-testid` hooks

`build-info-toggle` (the collapsed row, also carries `aria-expanded`),
`build-info-version`, `build-info-hash` — for e2e/unit assertions that don't
depend on rendered copy. `build-info-chevron` is also present on the icon
for convenience but isn't part of the stable contract above.
