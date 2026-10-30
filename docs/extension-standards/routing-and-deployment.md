# Routing & deployment: root-mounted app, locale-prefixed content

The URL scheme every Sneat product/extension follows, and how it is served at
the edge. The canonical decision record is
[backstage ADR 0001](https://github.com/sneat-co/backstage/blob/main/docs/decisions/0001-root-mounted-app-routing.md).

## The scheme

The Angular application is mounted at the **root** (`/`). A small, fixed set of
paths is reserved for the public landing/content and static-resource surface;
remaining app navigation belongs to Angular. This is a URL-ownership contract,
not permission to return HTML for missing static resources. The deployment
must preserve both that static boundary and the product's app fallback.

```txt
/                        root landing page
/{locale}/*              content, marketing, legal, docs, SEO pages
/static/*                shared static files/assets
/.well-known/*           standards / well-known files
/robots.txt              robots
/sitemap.xml             sitemap (+ /sitemap-*.xml, /sitemap-index.xml)
/favicon.ico             favicon (+ /favicon.svg)
/manifest.webmanifest    web manifest

everything else          Angular application routes
```

Examples:

```txt
# application (root-mounted)
/space/family/abc/assets
/my/assets
/event/abc
/game/abc
/u/alex

# landing / content (locale-prefixed)
/en/about
/en/privacy
/en/pricing
/ru/about
```

### `/my/*` is an application section, not the app mount point

`/my` is correct for personal-dashboard routes (`/my`, `/my/assets`,
`/my/settings`). It must **never** be used as the global application prefix,
because many application pages represent shared or public resources — an event
you were invited to (`/event/abc`), someone else's profile (`/u/alex`), a game
you're spectating (`/game/abc`). A possessive prefix would misdescribe them.

### Locales are an explicit allow-list

`/{locale}/*` is matched against an **explicit list** of published locale codes
(`en`, later `ru`, …) — **not** "any two-letter segment". This is load-bearing:
`/my` is also two letters. Matching "any two letters" would swallow `/my/assets`
as if `my` were a locale. An allow-list keeps `/my/assets` an application route
and avoids classifying unknown two-letter segments as public locale content.
Under the remaining-app-navigation contract, those segments reach the app;
a product that instead chooses 404s must explicitly agree and test that change. See
[`isReservedPublicPath`](../../libs/core/src/lib/reserved-public-path.ts).

### Do not use `/pwa/`

New products/extensions must not mount the app under `/pwa/` (or `/app/`). Those
expose an implementation detail and, on `.app` domains, read as `.app/app`.
`/pwa/*` may remain temporarily where already deployed, redirecting to the
root-mounted equivalent (`/pwa/x` → `/x`, HTTP 301).

## Cloudflare static routing (amended 2026-10-30)

Serve the assembled site through **Cloudflare static assets by default**. A
custom Worker is not needed to serve HTML, JavaScript, CSS or images. Global
`assets.run_worker_first: true` sends those requests through Worker code and
consumes its request allowance; it must never be the copied website default.
Do not introduce a service-binding router to perform the same static split.

### One origin, two builds, one distribution

Keep the same origin so the landing can read the Firebase auth session
(per-origin IndexedDB) and show the signed-in user:

1. Build Astro into `dist/`, then move its root `index.html` to `landing.html`.
2. Build Angular with `--base-href=/` and copy its `index.html` to the root of
   `dist/`. Copy its bundles and assets alongside it, checking collisions with
   Astro's `_astro/`, locale pages and public files.
3. Use native `_redirects` rules to rewrite `/` to `/landing` with status 200
   (the extensionless target avoids an HTML canonicalization redirect), and
   explicit app routes to `/index.html` with status 200. Keep the requested
   deep-link URL. Publish `_redirects` and `_headers` in the final distribution.

For a site that must preserve missing-public-resource 404s, start with:

```jsonc
{
  "name": "<product>",
  "assets": {
    "directory": "./dist",
    "not_found_handling": "none"
  }
}
```

There is no `main`, `services` routing layer, or `run_worker_first`. A checked
`404.html` may instead use `not_found_handling: "404-page"`.

Example `_redirects` for a product whose Angular router owns these sections:

```txt
/                 /landing       200
/landing          /              301
/pwa              /              301
/pwa/*            /:splat         301
/my               /index.html    200
/my/*             /index.html    200
/space            /index.html    200
/space/*          /index.html    200
/login            /index.html    200
```

These rules illustrate a product with a finite app route set; they are not a
universal route list or a replacement for the remaining-app-navigation contract.
Cover the product's real app entry points, including public/shared routes such
as `/event/:id`, and check exact-prefix and nested matches. If the product
routes arbitrary nonreserved navigation to Angular, preserve that behavior.
The finite list above returns 404 for unlisted namespaces: adopting that change
requires an explicit contract decision. If native rules cannot express the
required app fallback while preserving static misses, retain the existing
verified routing until a topology meeting both requirements is validated. Native rewrites run before asset
lookup: an overbroad rule can turn a real asset or missing file into HTML.
Do not add `/* /index.html 200`. Explicitly reserve the published locale
prefixes, `/_astro/`, `/assets/`, `/static/`, `/.well-known/`, robots,
sitemaps, favicon, manifests and the build's bundle filenames. A missing
resource under those paths must retain a 404 and must not return the app
shell. Public content and app URLs must not overlap.

The [current template](https://github.com/sneat-co/sneat-ext-template/blob/main/docs/HOSTING.md)
contains the assembly and native-routing starting point. It currently uses
`single-page-application` fallback: that is broader than the explicit route
allow-list above and does not by itself guarantee reserved-path 404s. Adapt
and verify the fallback before adopting it for a product with that contract.
Do not copy the historical `index.app.html` Worker router. The
[ImproveIt migration diff](https://github.com/improveit-now/improveit-now/pull/14)
is another assets-only implementation example, not evidence that a copied
header policy is correct in production. Check the deployed response headers:
local Wrangler behavior alone does not prove production header precedence.

### Headers, caching and embedding

Use native `_headers` rules for static response headers. Cache content-hashed
public bundles as immutable; HTML must revalidate so it changes on deployment.
Do not apply immutable caching to unhashed mutable files or public caching to
private/user-specific responses. A static shell can be public; backend data
and dynamic auth responses retain their own authentication and cache policy.

Keep framing/CSP policy scoped to the surface: embeddable widgets may need
approved cross-origin `frame-ancestors`, while administration/auth surfaces
need their restrictive framing policy. Do not blindly apply a global
`X-Frame-Options: SAMEORIGIN` or `frame-ancestors 'self'` to a widget that is
intended to embed. Preserve the product's actual script, connection and
privacy restrictions when moving existing headers into `_headers`.

### Dynamic exceptions

Add a `main` only when an actual server-side function needs it. Scope
`run_worker_first` to that function's paths, such as `/api/*` or `/__/auth/*`,
and keep ordinary assets outside those matches. These patterns select
**ordering before asset lookup**, not all script invocations: with asset-first
fallback, an asset miss can still invoke `main` (including under
`not_found_handling: "none"`). Handle non-dynamic misses deliberately and retain
the correct 404, access and cache behavior. Do not promise zero invocation
outside the dynamic namespace without a verified configuration/topology that
provides it. See [Cloudflare's Worker routing semantics](https://developers.cloudflare.com/workers/static-assets/routing/worker-script/).
Preserve authentication gates
where asset access is intentionally private; that is a reviewed exception,
not justification for routing every public site's asset through a Worker.
Catch-all patterns, global `true`, and router/service-binding indirection must
not become the default. Document the function and its required route scope.

### Local and deployment verification

Preview the assembled output with `wrangler dev`, using the exact deployment
config. Verify `/`, a real app deep link, built JS/CSS and images, legacy
redirects, and missing locale/static/well-known resources. Check status,
content type, cache/framing headers and that static misses are 404s. For a
hybrid site, observe handler entry to prove representative static assets
bypass Worker code. Also observe a missing static resource and non-dynamic
unknown navigation to verify handler entry and the intended 404/app fallback;
HTTP 200 alone does not prove bypass. Verify dynamic auth
and private-resource access separately. Preserve each existing site's routing
contract during migration; changing config is not deployment verification.

These are guidance and acceptance requirements. A shared CI rejection of
unsafe Worker-first configurations is not implemented by this document.

## Service Worker

The service worker is currently **disabled** and stays disabled. When it is
enabled later it must be scoped so it never intercepts the reserved public
paths above — otherwise it would cache-serve the app shell over landing/content
URLs.

## Migration from `/pwa/`

1. Set the app's base href to `/` (most Sneat apps already ship
   `<base href="/" />`).
2. Move non-home landing pages under `/{locale}/*` (home stays at `/`).
3. Assemble the combined `dist/` and add the native routing rules above;
   preserve reserved public/static 404s and the product's app entry points.
4. Keep `/pwa/*` → `/*` 301s for as long as old links may be live.
