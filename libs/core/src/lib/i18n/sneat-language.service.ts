import { DOCUMENT } from '@angular/common';
import {
  EnvironmentProviders,
  Injectable,
  computed,
  inject,
  provideEnvironmentInitializer,
  signal,
} from '@angular/core';
import {
  ISneatLanguage,
  SNEAT_DEFAULT_LANG,
  SneatLang,
  normalizeSneatLang,
  resolveSneatLang,
  sneatLanguage,
} from './sneat-languages';

export const SNEAT_LANG_STORAGE_KEY = 'sneat.lang';

/** Button words Ionic controls take as inputs (`ion-select`, `ion-datetime`). */
export interface ISneatIonicTexts {
  readonly okText: string;
  readonly cancelText: string;
  readonly doneText: string;
  readonly clearText: string;
}

export const SNEAT_IONIC_TEXTS: Readonly<Record<SneatLang, ISneatIonicTexts>> =
  {
    en: {
      okText: 'OK',
      cancelText: 'Cancel',
      doneText: 'Done',
      clearText: 'Clear',
    },
    es: {
      okText: 'Aceptar',
      cancelText: 'Cancelar',
      doneText: 'Listo',
      clearText: 'Borrar',
    },
    de: {
      okText: 'OK',
      cancelText: 'Abbrechen',
      doneText: 'Fertig',
      clearText: 'Löschen',
    },
    fr: {
      okText: 'OK',
      cancelText: 'Annuler',
      doneText: 'Terminé',
      clearText: 'Effacer',
    },
    'pt-BR': {
      okText: 'OK',
      cancelText: 'Cancelar',
      doneText: 'Concluído',
      clearText: 'Limpar',
    },
    ru: {
      okText: 'ОК',
      cancelText: 'Отмена',
      doneText: 'Готово',
      clearText: 'Очистить',
    },
  };

/**
 * The current UI language as a signal, so screens re-render on a switch
 * without a reload. It stays English until the app calls `init()` (through
 * `provideSneatLanguage()`), so a library upgrade alone never changes an
 * app's language.
 *
 * Angular's `LOCALE_ID` is fixed at start-up; pass `locale()` to `Intl`,
 * date pipes and `ion-datetime`, and `ionicTexts()` to `ion-select`.
 */
@Injectable({ providedIn: 'root' })
export class SneatLanguageService {
  private readonly document = inject(DOCUMENT);
  private readonly $lang = signal<SneatLang>(SNEAT_DEFAULT_LANG);

  readonly lang = this.$lang.asReadonly();
  readonly language = computed<ISneatLanguage>(() =>
    sneatLanguage(this.$lang()),
  );
  readonly locale = computed(() => this.language().locale);
  readonly ionicTexts = computed(() => SNEAT_IONIC_TEXTS[this.$lang()]);

  /**
   * Resolves the start-up language: `?lang` → `sneat.lang` → browser →
   * English. Applies it for this visit only and never writes `sneat.lang`:
   * only an explicit choice (`setLang()`, from the selector) is remembered,
   * so the browser language keeps being consulted and a one-off `?lang` link
   * does not stick.
   */
  init(): SneatLang {
    const win = this.document.defaultView;
    const lang = resolveSneatLang({
      query: new URLSearchParams(win?.location?.search ?? '').get('lang'),
      // TODO(preferredLocale): read the signed-in user's `preferredLocale`
      // through a sneat-go endpoint once one exists; until then it is skipped.
      userPreference: undefined,
      stored: this.readStored(),
      browser: win?.navigator?.languages,
    });
    this.apply(lang);
    return lang;
  }

  /**
   * Switches the language in place and remembers it in `sneat.lang` (the
   * user's explicit choice); ignores codes Sneat does not ship.
   */
  setLang(code: SneatLang | string): void {
    const lang = normalizeSneatLang(code);
    if (!lang) return;
    this.apply(lang);
    try {
      this.document.defaultView?.localStorage.setItem(
        SNEAT_LANG_STORAGE_KEY,
        lang,
      );
    } catch {
      // Storage may be disabled (private mode); the choice then lasts the session.
    }
  }

  private apply(lang: SneatLang): void {
    this.$lang.set(lang);
    this.document.documentElement?.setAttribute(
      'lang',
      sneatLanguage(lang).locale,
    );
  }

  private readStored(): string | null {
    try {
      return (
        this.document.defaultView?.localStorage.getItem(
          SNEAT_LANG_STORAGE_KEY,
        ) ?? null
      );
    } catch {
      return null;
    }
  }
}

/** Opts an app in: resolves the start-up language when the app boots. */
export function provideSneatLanguage(): EnvironmentProviders {
  return provideEnvironmentInitializer(() => {
    inject(SneatLanguageService).init();
  });
}
