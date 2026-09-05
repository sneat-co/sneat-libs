# Sneat frontend technology stack

This document records shared frontend technology choices for Sneat Co. apps and
extension libraries. It is the first place maintainers and AI agents should
check before adding a framework, runtime, or cross-cutting dependency.

The baseline below reflects the stack in use on 2026-08-28. Repository
manifests and lockfiles remain the source of truth for exact installed versions.

## Selection principles

Shared frontend dependencies should:

- support Angular 22, Ionic 9, standalone components, signals, and zoneless
  change detection;
- publish ESM that can be tree-shaken;
- run in browsers and Angular server-side rendering without relying on Node.js
  built-ins;
- remain compatible with a platform-neutral Cloudflare Workers bundle;
- add no runtime dependency when a small, maintained zero-dependency option is
  sufficient;
- keep browser-only work out of the initial bundle when it is not needed for the
  first render;
- have an explicit test at the boundary that motivated the dependency.

## Current frontend baseline

| Concern | Choice | Notes |
| --- | --- | --- |
| Application framework | Angular 22 | Standalone APIs, signals, zoneless change detection, hydration, and hybrid rendering |
| UI and native shell | Ionic 9 and Capacitor 8 | Import focused standalone Ionic components instead of the `@ionic/angular` root barrel |
| Workspace and package manager | Nx 23 and pnpm 11 | Run project tasks through `pnpm nx` |
| Authentication and data | Firebase Authentication and Firestore | App-session providers load lazily; public bootstrap and server rendering remain Firebase-free |
| Web hosting and SSR | Cloudflare Workers and Angular SSR | Server bundles must use Angular's neutral platform unless a documented exception is approved |
| Unit and journey tests | Vitest and Playwright | Test the dependency boundary and the complete user journey |

## Dependency decisions

### QR code generation: `better-qr@0.1.2`

**Status:** selected on 2026-08-28 for Contactus and Eventius QR images.

The required journey is simple: turn an existing share or join URL into a
scannable image while keeping the ordinary link visible. The same code must be
safe during browser rendering, Angular SSR, hydration, and a platform-neutral
Cloudflare Workers build.

We selected [`better-qr@0.1.2`](https://www.npmjs.com/package/better-qr)
because it:

- is pure ESM and declares no runtime dependencies;
- generates SVG synchronously through `toSvg()` without reading `window`,
  `document`, `Buffer`, the filesystem, or other Node.js APIs;
- supports QR Code Model 2 versions 1 through 40 and error-correction levels
  L, M, Q, and H;
- was 11.6 kB packed and 40.9 kB unpacked when inspected;
- lets the QR image be present in server-rendered HTML instead of waiting for
  client hydration;
- keeps a normal share URL as the accessible and failure-safe alternative.

The integration pins `better-qr@0.1.2` exactly at application/workspace roots.
Published extension packages declare `better-qr` as a compatible peer. Tests
must verify SVG QR generation, and the Sneat.app neutral SSR production build
must remain green.

#### Alternatives considered

| Package | What was attractive | Why it was not selected |
| --- | --- | --- |
| [`qrcode@1.5.4`](https://www.npmjs.com/package/qrcode) | Mature API and PNG data URLs | CommonJS pulls `pngjs` and Node.js built-ins such as `fs`, `stream`, and `zlib` into the neutral SSR graph |
| [`angularx-qrcode@22.0.1`](https://www.npmjs.com/package/angularx-qrcode) | Angular component API | Wraps `qrcode@1.5.4`, so it retains the same SSR and bundling problem |
| [`@tapple.io/qr-code-generator@0.9.10`](https://www.npmjs.com/package/@tapple.io/qr-code-generator) | Typed universal API, browser bundle, SVG and raster output | Its export map defaults neutral consumers to the Node.js ESM build, whose PNG path dynamically loads optional `@resvg/resvg-js`; selecting its browser condition for a server build would add avoidable bundler coupling |
| [`qreator@10.0.2`](https://www.npmjs.com/package/qreator) | Explicit tree-shaking and rich SVG, PNG, PDF, logo, and label features | More capability than the journey needs; the package declares `color-string`, `js-base64`, and `sharp` and was about 1.37 MB unpacked when inspected |

#### Risks and reevaluation

`better-qr@0.1.2` is a young pre-1.0 package. Keep the exact pin and the
generated-QR and neutral-SSR tests. Reevaluate this decision if the project is
unmaintained, a security issue appears, QR scanning tests expose an encoding
problem, or the product needs output that the library cannot provide. Any
replacement must first prove the browser, SSR, Cloudflare Workers, bundle-size,
and scannability boundaries that led to this choice.
