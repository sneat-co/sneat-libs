import { describe, expect, it } from 'vitest';
import {
  DEFAULT_RESERVED_LOCALES,
  isReservedPublicPath,
} from './reserved-public-path';

describe('isReservedPublicPath', () => {
  it('reserves the root landing page', () => {
    expect(isReservedPublicPath('/')).toBe(true);
    expect(isReservedPublicPath('')).toBe(true);
  });

  it('reserves allow-listed locale subtrees', () => {
    expect(isReservedPublicPath('/en')).toBe(true);
    expect(isReservedPublicPath('/en/')).toBe(true);
    expect(isReservedPublicPath('/en/about')).toBe(true);
    expect(isReservedPublicPath('/en/privacy')).toBe(true);
  });

  it('does NOT treat unknown two-letter segments as locales (fail-closed)', () => {
    // The load-bearing case: /my is a two-letter APP section, not a locale.
    expect(isReservedPublicPath('/my')).toBe(false);
    expect(isReservedPublicPath('/my/assets')).toBe(false);
    expect(isReservedPublicPath('/my/settings')).toBe(false);
    // A locale not (yet) published must route to the app, never be swallowed.
    expect(isReservedPublicPath('/ru/about')).toBe(false);
  });

  it('honours a custom locale allow-list', () => {
    const locales = ['en', 'ru'];
    expect(isReservedPublicPath('/ru/about', { locales })).toBe(true);
    expect(isReservedPublicPath('/my/assets', { locales })).toBe(false);
  });

  it('reserves static, well-known, and standard files', () => {
    expect(isReservedPublicPath('/static')).toBe(true);
    expect(isReservedPublicPath('/static/logo.svg')).toBe(true);
    expect(isReservedPublicPath('/.well-known')).toBe(true);
    expect(isReservedPublicPath('/.well-known/assetlinks.json')).toBe(true);
    expect(isReservedPublicPath('/robots.txt')).toBe(true);
    expect(isReservedPublicPath('/manifest.webmanifest')).toBe(true);
    expect(isReservedPublicPath('/favicon.ico')).toBe(true);
    expect(isReservedPublicPath('/favicon.svg')).toBe(true);
  });

  it('reserves sitemap variants', () => {
    expect(isReservedPublicPath('/sitemap.xml')).toBe(true);
    expect(isReservedPublicPath('/sitemap-0.xml')).toBe(true);
    expect(isReservedPublicPath('/sitemap-index.xml')).toBe(true);
  });

  it('treats everything else as an application route', () => {
    expect(isReservedPublicPath('/space/family/abc/assets')).toBe(false);
    expect(isReservedPublicPath('/event/abc')).toBe(false);
    expect(isReservedPublicPath('/game/abc')).toBe(false);
    expect(isReservedPublicPath('/u/alex')).toBe(false);
    expect(isReservedPublicPath('/login')).toBe(false);
    // A one-letter segment can never collide with a two-letter locale.
    expect(isReservedPublicPath('/u')).toBe(false);
    // "staticky" must not match the /static prefix.
    expect(isReservedPublicPath('/staticky')).toBe(false);
    // "sitemap.json" is not a reserved sitemap.
    expect(isReservedPublicPath('/sitemap.json')).toBe(false);
  });

  it('ignores query strings and fragments', () => {
    expect(isReservedPublicPath('/en/about?ref=x')).toBe(true);
    expect(isReservedPublicPath('/my/assets?tab=1')).toBe(false);
    expect(isReservedPublicPath('/my/assets#top')).toBe(false);
  });

  it('reduces a full URL to its pathname', () => {
    expect(isReservedPublicPath('https://assetus.app/en/about')).toBe(true);
    expect(isReservedPublicPath('https://assetus.app/my/assets')).toBe(false);
  });

  it('exposes a sane default locale list', () => {
    expect(DEFAULT_RESERVED_LOCALES).toContain('en');
  });
});
