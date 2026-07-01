// Reserved public paths for the standard Sneat routing model: the Angular
// application is mounted at the ROOT (`/`), and a small, fixed set of paths is
// reserved for the public landing/content surface. The edge (Cloudflare Worker)
// uses this to split traffic:
//
//   if (isReservedPublicPath(pathname)) return serveLanding(request)
//   return serveApplication(request)   // root-mounted Angular SPA
//
// See docs/extension-standards/routing-and-deployment.md for the full contract.

/**
 * Locale codes whose `/{locale}/*` subtree is reserved for landing/content
 * pages. Two-letter ISO-639-1 codes.
 *
 * This is an explicit ALLOW-LIST, not an "any two-letter segment" rule, and
 * that distinction is load-bearing: `/my` (the personal-dashboard section) is
 * also two letters. Matching "any two letters" would swallow `/my/assets` as if
 * `my` were a locale. With an allow-list, unknown two-letter segments fall
 * through to the application (fail-closed): `/my/assets` → app, `/en/about` →
 * landing.
 */
export const DEFAULT_RESERVED_LOCALES: readonly string[] = ['en'];

export interface ReservedPublicPathOptions {
  /**
   * Locale codes reserved for `/{locale}/*` landing content. Defaults to
   * {@link DEFAULT_RESERVED_LOCALES}. Pass the set your landing actually
   * publishes so unknown locales fail closed to the application.
   */
  locales?: readonly string[];
}

/**
 * Returns `true` when `pathname` belongs to the public landing/content surface
 * rather than the root-mounted Angular application.
 *
 * Reserved:
 * - `/` — root landing page
 * - `/{locale}` and `/{locale}/*` — localized content/marketing/legal/docs/SEO
 *   (locale ∈ the allow-list; see {@link ReservedPublicPathOptions.locales})
 * - `/static` and `/static/*` — shared static files
 * - `/.well-known` and `/.well-known/*` — well-known files
 * - `/robots.txt`
 * - `/sitemap.xml`, `/sitemap-*.xml`, `/sitemap-index.xml`
 * - `/favicon.ico`, `/favicon.svg`
 * - `/manifest.webmanifest`
 *
 * Everything else (e.g. `/`, `/space/...`, `/my/assets`, `/event/abc`,
 * `/u/alex`) is an application route.
 *
 * Query strings and fragments are ignored — pass a bare pathname (a full URL is
 * tolerated and reduced to its pathname).
 */
export function isReservedPublicPath(
  pathname: string,
  options?: ReservedPublicPathOptions,
): boolean {
  const locales = options?.locales ?? DEFAULT_RESERVED_LOCALES;

  let p = pathname || '/';
  // Tolerate a full URL or a path carrying a query/hash.
  if (/^[a-z]+:\/\//i.test(p)) {
    try {
      p = new URL(p).pathname;
    } catch {
      // fall through with the raw value
    }
  } else {
    const cut = p.search(/[?#]/);
    if (cut >= 0) p = p.slice(0, cut);
  }
  if (!p.startsWith('/')) p = '/' + p;
  // Normalize a trailing slash away (except for the bare root).
  if (p.length > 1 && p.endsWith('/')) p = p.replace(/\/+$/, '') || '/';

  if (p === '/') return true;

  const firstSegment = p.split('/')[1];
  if (locales.includes(firstSegment)) return true;

  if (p === '/static' || p.startsWith('/static/')) return true;
  if (p === '/.well-known' || p.startsWith('/.well-known/')) return true;
  if (p === '/robots.txt') return true;
  if (/^\/sitemap[-\w]*\.xml$/.test(p)) return true;
  if (p === '/favicon.ico' || p === '/favicon.svg') return true;
  if (p === '/manifest.webmanifest') return true;

  return false;
}
