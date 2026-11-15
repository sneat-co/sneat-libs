import { TestBed } from '@angular/core/testing';
import { SNEAT_LANGUAGES, SneatLanguageService } from '@sneat/core';
import { describe, expect, it } from 'vitest';
import {
  AUTH_UI_LABELS,
  AUTH_UI_LABELS_EN,
  AUTH_UI_LABEL_SETS,
  IAuthUiLabels,
} from './auth-ui-labels';
import { pseudoLocalize, pseudoLocalizeLabels } from './auth-ui-labels.pseudo';

type Key = keyof IAuthUiLabels;
const keys = Object.keys(AUTH_UI_LABELS_EN).sort() as Key[];

/** Every label as text: functions are called with sample values. */
function render(set: IAuthUiLabels, key: Key): string[] {
  const v = set[key] as unknown;
  if (typeof v === 'string') return [v];
  if (key === 'pendingLinkNext') {
    const f = set.pendingLinkNext;
    return [
      f({ provider: 'Sample', autoLink: true }),
      f({ provider: 'Sample', autoLink: false }),
    ];
  }
  return [(v as (s: string) => string)('Sample')];
}

/**
 * Words on buttons, tabs and menu rows: they must fit the layout the
 * pseudo-locale (English + ~40%) is tested at.
 */
const CONTROL_KEYS: Key[] = [
  'signUp',
  'signIn',
  'forgotReset',
  'getSignInLink',
  'tryAgain',
  'dismiss',
  'useAnotherAccount',
  'retryAccountSetup',
  'signOut',
  'pleaseSignIn',
  'quickLogin',
  'ssoContinue',
];

describe('auth-ui label sets', () => {
  it('ship one set per Sneat language, tagged with its code', () => {
    expect(Object.keys(AUTH_UI_LABEL_SETS).sort()).toEqual(
      SNEAT_LANGUAGES.map((l) => l.code).sort(),
    );
    for (const l of SNEAT_LANGUAGES) {
      expect(AUTH_UI_LABEL_SETS[l.code].lang).toBe(l.code);
    }
  });

  it.each(SNEAT_LANGUAGES.map((l) => [l.code]))(
    '%s has exactly the English keys (no silent fallback)',
    (code) => {
      const set = AUTH_UI_LABEL_SETS[code];
      expect(Object.keys(set).sort()).toEqual(keys);
      for (const k of keys) {
        expect(typeof set[k], `${code}.${k}`).toBe(typeof AUTH_UI_LABELS_EN[k]);
      }
    },
  );

  it.each(SNEAT_LANGUAGES.map((l) => [l.code]))(
    '%s has no empty values, and functions keep their arguments',
    (code) => {
      const set = AUTH_UI_LABEL_SETS[code];
      for (const k of keys) {
        for (const text of render(set, k)) {
          expect(text.trim().length, `${code}.${k}`).toBeGreaterThan(0);
          expect(text, `${code}.${k}`).not.toMatch(/undefined|\$\{/);
        }
        if (typeof set[k] === 'function') {
          expect(render(set, k)[0], `${code}.${k}`).toContain('Sample');
        }
      }
      for (const text of render(set, 'pendingLinkNext')) {
        expect(text, `${code}.pendingLinkNext`).toContain('Sample');
      }
      // The template splits on the email to bold it: exactly one occurrence.
      expect(
        set.pendingLinkHasAccount('\u0000').split('\u0000'),
        `${code}.pendingLinkHasAccount`,
      ).toHaveLength(2);
    },
  );

  it('non-English sets are translated, not copies of English', () => {
    for (const l of SNEAT_LANGUAGES.filter((x) => x.code !== 'en')) {
      const set = AUTH_UI_LABEL_SETS[l.code];
      const same = keys.filter(
        (k) =>
          k !== 'lang' &&
          typeof set[k] === 'string' &&
          set[k] === AUTH_UI_LABELS_EN[k],
      );
      // Words that are the same in some languages ("Details:", "E-Mail", "OK").
      expect(
        same.filter((k) => !['failureDetails', 'email'].includes(k)),
        l.code,
      ).toEqual([]);
    }
  });

  it.each(SNEAT_LANGUAGES.filter((l) => l.code !== 'en').map((l) => [l.code]))(
    '%s control words fit the pseudo-locale budget',
    (code) => {
      const set = AUTH_UI_LABEL_SETS[code];
      for (const k of CONTROL_KEYS) {
        const budget = Array.from(
          pseudoLocalize(AUTH_UI_LABELS_EN[k] as string),
        ).length;
        const len = Array.from(set[k] as string).length;
        expect(len, `${code}.${k} "${set[k]}" > ${budget}`).toBeLessThanOrEqual(
          budget,
        );
      }
    },
  );
});

describe('pseudo-locale', () => {
  it('is about 40% longer, accented and bracketed, so overflow shows up', () => {
    const s = pseudoLocalize('Sign in with company SSO');
    expect(s.startsWith('[')).toBe(true);
    expect(s.endsWith(']')).toBe(true);
    expect(s).toMatch(/[À-ž]/);
    expect(Array.from(s).length).toBeGreaterThanOrEqual(
      Math.ceil('Sign in with company SSO'.length * 1.4),
    );
  });

  it('keeps placeholders intact and covers every key', () => {
    const pseudo = pseudoLocalizeLabels(AUTH_UI_LABELS_EN);
    expect(Object.keys(pseudo).sort()).toEqual(keys);
    expect(pseudo.continueTo('Sneat.app')).toContain('Sneat.app');
    expect(
      pseudo.pendingLinkNext({ provider: 'Google', autoLink: true }),
    ).toContain('Google');
    expect(pseudo.pendingLinkHasAccount('a@b.co')).toContain('a@b.co');
    expect(pseudo.lang).toBe('en');
  });
});

describe('AUTH_UI_LABELS token', () => {
  it('follows the language service, switching in place', () => {
    TestBed.resetTestingModule();
    const labels = TestBed.inject(AUTH_UI_LABELS);
    expect(labels().signIn).toBe('Sign in');
    TestBed.inject(SneatLanguageService).setLang('ru');
    expect(labels().signIn).toBe('Войти');
    TestBed.inject(SneatLanguageService).setLang('en');
  });
});
