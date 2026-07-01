# Routing & deployment: root-mounted app, locale-prefixed content

The URL scheme every Sneat product/extension follows, and how it is served at
the edge. The canonical decision record is
[backstage ADR 0001](https://github.com/sneat-co/backstage/blob/main/docs/decisions/0001-root-mounted-app-routing.md).

## The scheme

The Angular application is mounted at the **root** (`/`). A small, fixed set of
paths is reserved for the public landing/content surface; everything else is an
application route.

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
and lets unknown locales fail closed to the application. See
[`isReservedPublicPath`](../../libs/core/src/lib/reserved-public-path.ts).

### Do not use `/pwa/`

New products/extensions must not mount the app under `/pwa/` (or `/app/`). Those
expose an implementation detail and, on `.app` domains, read as `.app/app`.
`/pwa/*` may remain temporarily where already deployed, redirecting to the
root-mounted equivalent (`/pwa/x` → `/x`, HTTP 301).

## Edge routing

The split is decided at the **edge** (a Cloudflare Worker), not in a service
worker. This keeps it authoritative and per-request — there is no client-cached
allow-list that can drift or fail open:

```ts
import { isReservedPublicPath } from '@sneat/core';

if (isReservedPublicPath(pathname)) {
  return serveLanding(request); // static landing asset, or its own 404
}
return serveApplication(request); // root-mounted Angular SPA
```

`isReservedPublicPath(pathname, { locales })` lives in `@sneat/core`
(`libs/core/src/lib/reserved-public-path.ts`) and is the single source of truth
for the reserved set. Because a Cloudflare Worker bundle should stay
dependency-free (importing the `@sneat/core` barrel pulls in Angular), Workers
**inline a small copy** of the matcher with a header comment pointing back to
this canonical version — keep the two in sync.

### One origin, two builds, one distribution

Landing and app share a single origin so the landing can read the Firebase auth
session (per-origin IndexedDB) and show the signed-in user. They are assembled
into **one** distribution directory served by **one** Worker:

1. Build the Astro landing → `dist/` (owns `dist/index.html` at `/`, plus
   `dist/{locale}/...`, `dist/static/...`, `robots.txt`, sitemaps, favicon).
2. Build the Angular app with `--base-href=/` and merge its output into `dist/`,
   **renaming the app's `index.html` → `index.app.html`** (the SPA shell). The
   landing owns `/` → `index.html`, so the shell must not collide with it.
   Angular's hashed JS/CSS and `assets/` do not collide with Astro's `_astro/`.
3. The Worker serves matching static assets directly; for a non-reserved path
   with no matching asset (an application deep link), it serves
   `index.app.html` so the Angular router can take over.

### Reference Worker

```js
// Canonical reserved-path contract: @sneat/core reserved-public-path.ts
// (inlined to keep the Worker dependency-free — keep in sync).
const RESERVED_LOCALES = ['en'];

function isReservedPublicPath(pathname) {
  let p = pathname || '/';
  if (p.length > 1 && p.endsWith('/')) p = p.replace(/\/+$/, '') || '/';
  if (p === '/') return true;
  if (RESERVED_LOCALES.includes(p.split('/')[1])) return true;
  if (p === '/static' || p.startsWith('/static/')) return true;
  if (p === '/.well-known' || p.startsWith('/.well-known/')) return true;
  if (p === '/robots.txt') return true;
  if (/^\/sitemap[-\w]*\.xml$/.test(p)) return true;
  if (p === '/favicon.ico' || p === '/favicon.svg') return true;
  if (p === '/manifest.webmanifest') return true;
  return false;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const p = url.pathname;

    // Legacy /pwa/* → root-mounted route (permanent redirect).
    if (p === '/pwa' || p.startsWith('/pwa/')) {
      url.pathname = p.slice('/pwa'.length) || '/';
      return Response.redirect(url.toString(), 301);
    }

    // Serve a matching static asset (landing pages + app JS/CSS/assets).
    const res = await env.ASSETS.fetch(request);
    if (res.status !== 404) return res;

    // Reserved public space never falls back to the app shell — a missing
    // landing page or static file 404s as itself.
    if (isReservedPublicPath(p)) return res;

    // Application deep link → serve the SPA shell as 200 at the REQUESTED url,
    // following any html_handling redirect (Cloudflare Assets rewrites
    // `/index.app.html` → `/index.app`) so the deep link keeps its URL instead
    // of the browser bouncing to the shell path.
    let shell = await env.ASSETS.fetch(new Request(new URL('/index.app.html', url.origin), request));
    if (shell.status >= 301 && shell.status <= 308) {
      const loc = shell.headers.get('location');
      if (loc) shell = await env.ASSETS.fetch(new Request(new URL(loc, url.origin), request));
    }
    return new Response(shell.body, { status: 200, headers: shell.headers });
  },
};
```

`wrangler.jsonc` binds the assets and runs the Worker first so the routing logic
is authoritative:

```jsonc
{
  "name": "<product>",
  "main": "worker.js",
  "assets": {
    "directory": "./dist",
    "binding": "ASSETS",
    "run_worker_first": true,
    "not_found_handling": "none"
  }
}
```

## Local development

Local preview must reproduce production routing as closely as practical — run
the assembled `dist/` through the same Worker (`wrangler dev`) rather than a
dev-only static server that would 404 application deep links or serve the wrong
`index.html`. Avoid routing behaviour that differs between local preview and the
Cloudflare deployment.

## Service Worker

The service worker is currently **disabled** and stays disabled. When it is
enabled later it must be scoped so it never intercepts the reserved public
paths above — otherwise it would cache-serve the app shell over landing/content
URLs.

## Migration from `/pwa/`

1. Set the app's base href to `/` (most Sneat apps already ship
   `<base href="/" />`).
2. Move non-home landing pages under `/{locale}/*` (home stays at `/`).
3. Add the edge Worker with the reserved-path split and combined `dist/`
   assembly above.
4. Keep `/pwa/*` → `/*` 301s for as long as old links may be live.
