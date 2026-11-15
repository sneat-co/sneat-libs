/**
 * The UI languages Sneat apps ship. English is the default; the rest follow
 * in the order the language selector lists them.
 *
 * Why native names and not flags: flags mark countries, not languages (which
 * flag is English? Russian?), Windows renders flag emoji as bare letters, and
 * screen readers announce them unpredictably. A native name reads cleanly.
 */
export type SneatLang = 'en' | 'es' | 'de' | 'fr' | 'pt-BR' | 'ru';

export interface ISneatLanguage {
  readonly code: SneatLang;
  /** The language's name in its own language. Never a flag, never a code. */
  readonly nativeName: string;
  /**
   * Latin 2-letter badge for narrow screens ("EN ▾"). Written out, not derived
   * from `code`: 'pt-BR' is "PT".
   */
  readonly short: string;
  /** BCP 47 tag for `<html lang>`, `Intl` and Ionic's `locale` inputs. */
  readonly locale: string;
  /**
   * The 5-character code stored in the user record's `preferredLocale`
   * (sneat-core-modules `dbo4userus`), which shared notifications (emails,
   * bots) read. `normalizeSneatLang()` maps it back.
   */
  readonly preferredLocale: string;
}

export const SNEAT_DEFAULT_LANG: SneatLang = 'en';

export const SNEAT_LANGUAGES: readonly ISneatLanguage[] = [
  {
    code: 'en',
    nativeName: 'English',
    short: 'EN',
    locale: 'en',
    preferredLocale: 'en-US',
  },
  {
    code: 'es',
    nativeName: 'Español',
    short: 'ES',
    locale: 'es',
    preferredLocale: 'es-ES',
  },
  {
    code: 'de',
    nativeName: 'Deutsch',
    short: 'DE',
    locale: 'de',
    preferredLocale: 'de-DE',
  },
  {
    code: 'fr',
    nativeName: 'Français',
    short: 'FR',
    locale: 'fr',
    preferredLocale: 'fr-FR',
  },
  {
    code: 'pt-BR',
    nativeName: 'Português (BR)',
    short: 'PT',
    locale: 'pt-BR',
    preferredLocale: 'pt-BR',
  },
  {
    code: 'ru',
    nativeName: 'Русский',
    short: 'RU',
    locale: 'ru',
    preferredLocale: 'ru-RU',
  },
];

export function sneatLanguage(code: SneatLang): ISneatLanguage {
  return (
    SNEAT_LANGUAGES.find((l) => l.code === code) ??
    (SNEAT_LANGUAGES[0] as ISneatLanguage)
  );
}

/**
 * Maps any language tag to a shipped language, or undefined.
 * Case and `_`/`-` are ignored; any Portuguese (`pt`, `pt-PT`, `pt-BR`) is
 * `pt-BR`; any other region falls back to its base language (`es-MX` → `es`).
 */
export function normalizeSneatLang(
  raw: string | null | undefined,
): SneatLang | undefined {
  const base = raw?.trim().toLowerCase().replace(/_/g, '-').split('-')[0];
  if (!base) return undefined;
  if (base === 'pt') return 'pt-BR';
  return SNEAT_LANGUAGES.find((l) => l.code === base)?.code;
}

/** Where the start-up language can come from, highest priority first. */
export interface ISneatLangSources {
  /** The `?lang=` query parameter. */
  readonly query?: string | null;
  /**
   * TODO(preferredLocale): the signed-in user's stored preference
   * (`preferredLocale` on the user record). Not wired yet: no sneat-go
   * endpoint reads or writes it for the web apps.
   */
  readonly userPreference?: string | null;
  /** `localStorage['sneat.lang']`. */
  readonly stored?: string | null;
  /** `navigator.languages`, in the browser's order. */
  readonly browser?: readonly string[] | null;
}

/** `?lang` → user preference → `sneat.lang` → `navigator.languages` → English. */
export function resolveSneatLang(sources: ISneatLangSources): SneatLang {
  for (const candidate of [
    sources.query,
    sources.userPreference,
    sources.stored,
    ...(sources.browser ?? []),
  ]) {
    const lang = normalizeSneatLang(candidate);
    if (lang) return lang;
  }
  return SNEAT_DEFAULT_LANG;
}

/** The user record's 5-character `preferredLocale` for a UI language. */
export function sneatPreferredLocale(lang: SneatLang): string {
  return sneatLanguage(lang).preferredLocale;
}

/** The plural category forms a count-dependent phrase needs. */
export interface ISneatPluralForms {
  readonly one: string;
  /** Russian 2–4, 22–24…; unused by en/es/de/fr/pt. */
  readonly few?: string;
  /** Russian 5–20, 25…; unused by en/es/de/fr/pt. */
  readonly many?: string;
  readonly other: string;
}

/**
 * Picks the form for `n` by CLDR rules (`Intl.PluralRules`), so Russian gets
 * 1 файл / 2 файла / 5 файлов / 21 файл. A missing form falls back to `other`.
 */
export function sneatPlural(
  lang: SneatLang,
  n: number,
  forms: ISneatPluralForms,
): string {
  const category = new Intl.PluralRules(sneatLanguage(lang).locale).select(n);
  const form = (forms as unknown as Record<string, string | undefined>)[
    category
  ];
  return form ?? forms.other;
}
