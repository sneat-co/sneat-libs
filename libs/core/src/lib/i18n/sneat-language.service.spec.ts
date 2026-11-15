import { DOCUMENT } from '@angular/common';
import {
  ApplicationInitStatus,
  EnvironmentInjector,
  createEnvironmentInjector,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import {
  SNEAT_IONIC_TEXTS,
  SNEAT_LANG_STORAGE_KEY,
  SneatLanguageService,
  provideSneatLanguage,
} from './sneat-language.service';
import {
  SNEAT_LANGUAGES,
  normalizeSneatLang,
  resolveSneatLang,
  sneatLanguage,
  sneatPlural,
  sneatPreferredLocale,
} from './sneat-languages';

interface FakeEnv {
  search?: string;
  stored?: string;
  languages?: string[];
  storageThrows?: boolean;
}

function fakeDocument(env: FakeEnv) {
  const store = new Map<string, string>();
  if (env.stored) store.set(SNEAT_LANG_STORAGE_KEY, env.stored);
  const attrs = new Map<string, string>();
  const localStorage = {
    getItem: (k: string) => {
      if (env.storageThrows) throw new Error('SecurityError');
      return store.get(k) ?? null;
    },
    setItem: (k: string, v: string) => {
      if (env.storageThrows) throw new Error('QuotaExceededError');
      store.set(k, v);
    },
  };
  const doc = {
    documentElement: {
      setAttribute: (n: string, v: string) => attrs.set(n, v),
      getAttribute: (n: string) => attrs.get(n) ?? null,
    },
    defaultView: {
      location: { search: env.search ?? '' },
      navigator: { languages: env.languages ?? [] },
      localStorage,
    },
  };
  return { doc, store, attrs };
}

function service(env: FakeEnv) {
  const fake = fakeDocument(env);
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [{ provide: DOCUMENT, useValue: fake.doc }],
  });
  return { svc: TestBed.inject(SneatLanguageService), ...fake };
}

describe('normalizeSneatLang', () => {
  it.each([
    ['en', 'en'],
    ['EN-us', 'en'],
    ['es-MX', 'es'],
    ['de_AT', 'de'],
    ['fr-CA', 'fr'],
    ['ru-RU', 'ru'],
    ['pt', 'pt-BR'],
    ['pt-PT', 'pt-BR'],
    ['pt-BR', 'pt-BR'],
    ['pt-br', 'pt-BR'],
  ])('%s → %s', (raw, lang) => {
    expect(normalizeSneatLang(raw)).toBe(lang);
  });

  it.each([undefined, null, '', '  ', 'xx', 'zh-CN', 'english'])(
    'rejects %j',
    (raw) => {
      expect(normalizeSneatLang(raw)).toBeUndefined();
    },
  );
});

describe('resolveSneatLang order', () => {
  const all = {
    query: 'de',
    userPreference: 'fr-FR',
    stored: 'ru',
    browser: ['es-ES', 'en'],
  };

  it('1. ?lang wins over everything', () => {
    expect(resolveSneatLang(all)).toBe('de');
  });
  it('2. then the user preference hook', () => {
    expect(resolveSneatLang({ ...all, query: null })).toBe('fr');
  });
  it('3. then sneat.lang', () => {
    expect(
      resolveSneatLang({ ...all, query: null, userPreference: null }),
    ).toBe('ru');
  });
  it('4. then navigator.languages, first shipped one', () => {
    expect(resolveSneatLang({ browser: ['zh-CN', 'pt-PT', 'en'] })).toBe(
      'pt-BR',
    );
  });
  it('5. then English', () => {
    expect(resolveSneatLang({})).toBe('en');
    expect(
      resolveSneatLang({ query: 'xx', stored: 'klingon', browser: ['ja'] }),
    ).toBe('en');
  });
  it('skips an unsupported higher source instead of stopping at it', () => {
    expect(resolveSneatLang({ query: 'xx', stored: 'es' })).toBe('es');
  });
});

describe('SneatLanguageService', () => {
  it('stays English and touches nothing until init()', () => {
    const { svc, store, attrs } = service({ languages: ['ru'] });
    expect(svc.lang()).toBe('en');
    expect(store.size).toBe(0);
    expect(attrs.size).toBe(0);
  });

  it('init() takes ?lang and sets <html lang> without storing it', () => {
    const { svc, store, attrs } = service({
      search: '?x=1&lang=pt',
      stored: 'ru',
      languages: ['de'],
    });
    expect(svc.init()).toBe('pt-BR');
    expect(svc.lang()).toBe('pt-BR');
    expect(svc.locale()).toBe('pt-BR');
    // A one-off ?lang link applies to this visit only.
    expect(store.get(SNEAT_LANG_STORAGE_KEY)).toBe('ru');
    expect(attrs.get('lang')).toBe('pt-BR');
  });

  it('init() never persists a browser or default language', () => {
    for (const languages of [['fr-BE', 'en'], []]) {
      const { svc, store } = service({ languages });
      svc.init();
      expect(store.has(SNEAT_LANG_STORAGE_KEY), String(languages)).toBe(false);
    }
  });

  it('only an explicit setLang() choice persists across visits', () => {
    const first = service({ search: '?lang=de', languages: ['fr'] });
    expect(first.svc.init()).toBe('de');
    expect(first.store.has(SNEAT_LANG_STORAGE_KEY)).toBe(false);
    // Next visit without ?lang: the browser language is consulted again.
    expect(service({ languages: ['fr'] }).svc.init()).toBe('fr');

    first.svc.setLang('ru');
    const stored = first.store.get(SNEAT_LANG_STORAGE_KEY);
    expect(stored).toBe('ru');
    expect(service({ stored, languages: ['fr'] }).svc.init()).toBe('ru');
  });

  it('init() falls back to sneat.lang, then the browser', () => {
    expect(service({ stored: 'ru', languages: ['de'] }).svc.init()).toBe('ru');
    expect(service({ languages: ['fr-BE', 'en'] }).svc.init()).toBe('fr');
    expect(service({}).svc.init()).toBe('en');
  });

  it('survives storage that throws', () => {
    const { svc, attrs } = service({ storageThrows: true, languages: ['es'] });
    expect(svc.init()).toBe('es');
    svc.setLang('de');
    expect(svc.lang()).toBe('de');
    expect(attrs.get('lang')).toBe('de');
  });

  it('setLang() switches in place and exposes locale + Ionic texts', () => {
    const { svc, store } = service({});
    svc.setLang('ru');
    expect(svc.lang()).toBe('ru');
    expect(svc.language().nativeName).toBe('Русский');
    expect(svc.ionicTexts()).toEqual(SNEAT_IONIC_TEXTS.ru);
    expect(store.get(SNEAT_LANG_STORAGE_KEY)).toBe('ru');
  });

  it('setLang() ignores codes Sneat does not ship', () => {
    const { svc, store } = service({});
    svc.setLang('es');
    svc.setLang('zh');
    expect(svc.lang()).toBe('es');
    expect(store.get(SNEAT_LANG_STORAGE_KEY)).toBe('es');
  });

  it('provideSneatLanguage() runs init() when the injector starts', () => {
    const { doc, store } = fakeDocument({ search: '?lang=de' });
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: DOCUMENT, useValue: doc }],
    });
    const parent = TestBed.inject(EnvironmentInjector);
    TestBed.inject(ApplicationInitStatus);
    const child = createEnvironmentInjector([provideSneatLanguage()], parent);
    expect(child.get(SneatLanguageService).lang()).toBe('de');
    expect(store.has(SNEAT_LANG_STORAGE_KEY)).toBe(false);
  });

  it('has Ionic texts for every shipped language', () => {
    for (const l of SNEAT_LANGUAGES) {
      const t = SNEAT_IONIC_TEXTS[l.code];
      expect(Object.values(t).every((v) => v.trim().length > 0)).toBe(true);
    }
  });
});

describe('preferredLocale mapping', () => {
  it('maps each language to a 5-character code and back', () => {
    expect(SNEAT_LANGUAGES.map((l) => sneatPreferredLocale(l.code))).toEqual([
      'en-US',
      'es-ES',
      'de-DE',
      'fr-FR',
      'pt-BR',
      'ru-RU',
    ]);
    for (const l of SNEAT_LANGUAGES) {
      expect(sneatPreferredLocale(l.code)).toMatch(/^[a-z]{2}-[A-Z]{2}$/);
      expect(normalizeSneatLang(sneatPreferredLocale(l.code))).toBe(l.code);
    }
  });

  it('sneatLanguage() falls back to English for a hand-written code', () => {
    expect(sneatLanguage('xx' as never).code).toBe('en');
  });
});

describe('sneatPlural', () => {
  const files = { one: 'файл', few: 'файла', many: 'файлов', other: 'файла' };
  it.each([
    [1, 'файл'],
    [2, 'файла'],
    [5, 'файлов'],
    [11, 'файлов'],
    [21, 'файл'],
    [22, 'файла'],
    [1.5, 'файла'],
  ])('ru %d → %s', (n, word) => {
    expect(sneatPlural('ru', n, files)).toBe(word);
  });

  it('uses one/other for the other languages and falls back to other', () => {
    const en = { one: 'file', other: 'files' };
    expect(sneatPlural('en', 1, en)).toBe('file');
    expect(sneatPlural('en', 21, en)).toBe('files');
    expect(sneatPlural('ru', 5, { one: 'x', other: 'y' })).toBe('y');
  });
});
