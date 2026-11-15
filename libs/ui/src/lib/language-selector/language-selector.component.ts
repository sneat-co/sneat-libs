import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import { SNEAT_LANGUAGES, SneatLang, SneatLanguageService } from '@sneat/core';

/** "Language" in each language: the menu's accessible name follows the UI. */
export const SNEAT_LANGUAGE_WORD: Readonly<Record<SneatLang, string>> = {
  en: 'Language',
  es: 'Idioma',
  de: 'Sprache',
  fr: 'Langue',
  'pt-BR': 'Idioma',
  ru: 'Язык',
};

let nextId = 0;

/**
 * Header language switch: a compact "English ▾" button (the native name;
 * "EN ▾" below 360 px or with `compact`) opening a `role="menu"` list of
 * native names. No flags. Switches in place through `SneatLanguageService`.
 *
 * Keyboard: Enter/Space/ArrowDown open on the current language, ArrowUp/Down,
 * Home/End move, Enter/Space pick, Escape or Tab close (Escape returns focus
 * to the button). A click outside closes it.
 */
@Component({
  selector: 'sneat-language-selector',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'sneat-language-selector',
    '(document:click)': 'onDocumentClick($event)',
  },
  template: `
    <button
      #trigger
      type="button"
      class="trigger"
      [class.compact]="compact()"
      aria-haspopup="menu"
      [attr.aria-expanded]="open()"
      [attr.aria-controls]="menuId"
      [attr.aria-label]="word() + ': ' + current().nativeName"
      (click)="toggle()"
      (keydown)="onTriggerKey($event)"
    >
      <span class="full" [attr.lang]="current().locale">{{
        current().nativeName
      }}</span>
      <span class="short" aria-hidden="true">{{ current().short }}</span>
      <span class="chevron" aria-hidden="true">▾</span>
    </button>
    @if (open()) {
      <ul
        class="menu"
        role="menu"
        [id]="menuId"
        [attr.aria-label]="word()"
        (keydown)="onMenuKey($event)"
      >
        @for (l of languages; track l.code; let i = $index) {
          <li role="none">
            <button
              #item
              type="button"
              role="menuitemradio"
              [attr.aria-checked]="l.code === current().code"
              [attr.lang]="l.locale"
              [attr.tabindex]="i === focusIndex() ? 0 : -1"
              (click)="pick(l.code)"
            >
              {{ l.nativeName }}
            </button>
          </li>
        }
      </ul>
    }
  `,
  styles: `
    :host {
      position: relative;
      display: inline-block;
    }
    .trigger {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      min-height: 36px;
      padding: 4px 10px;
      border: 1px solid var(--ion-color-medium, #92949c);
      border-radius: 18px;
      background: transparent;
      color: inherit;
      font: inherit;
      font-size: 14px;
      white-space: nowrap;
      cursor: pointer;
    }
    .trigger:focus-visible,
    .menu button:focus-visible {
      outline: 2px solid var(--ion-color-primary, #3880ff);
      outline-offset: 2px;
    }
    .short,
    .trigger.compact .full {
      display: none;
    }
    .trigger.compact .short {
      display: inline;
    }
    @media (max-width: 359px) {
      .full {
        display: none;
      }
      .short {
        display: inline;
      }
    }
    .menu {
      position: absolute;
      z-index: 1000;
      inset-inline-end: 0;
      top: calc(100% + 4px);
      min-width: 11rem;
      max-width: calc(100vw - 16px);
      margin: 0;
      padding: 4px 0;
      list-style: none;
      background: var(--ion-background-color, #fff);
      color: var(--ion-text-color, #000);
      border-radius: 8px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
    }
    .menu button {
      display: block;
      width: 100%;
      min-height: 44px;
      padding: 8px 16px;
      border: 0;
      background: transparent;
      color: inherit;
      font: inherit;
      text-align: start;
      cursor: pointer;
    }
    .menu button:hover {
      background: var(--ion-color-light, #f4f5f8);
    }
    .menu button[aria-checked='true'] {
      font-weight: 600;
    }
  `,
})
export class LanguageSelectorComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly languageService = inject(SneatLanguageService);

  /** Always show the 2-letter badge ("EN ▾"), e.g. in a crowded toolbar. */
  readonly compact = input(false);
  /** Emits after the language changed (the service already holds it). */
  readonly langChange = output<SneatLang>();

  protected readonly languages = SNEAT_LANGUAGES;
  protected readonly menuId = `sneat-language-menu-${++nextId}`;
  protected readonly open = signal(false);
  protected readonly focusIndex = signal(0);
  protected readonly current = this.languageService.language;
  protected readonly word = computed(
    () => SNEAT_LANGUAGE_WORD[this.languageService.lang()],
  );

  private readonly trigger =
    viewChild.required<ElementRef<HTMLButtonElement>>('trigger');
  private readonly items = viewChildren<ElementRef<HTMLButtonElement>>('item');

  protected toggle(): void {
    if (this.open()) this.close(false);
    else this.openMenu();
  }

  protected onTriggerKey(e: KeyboardEvent): void {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      this.openMenu(
        e.key === 'ArrowUp' ? this.languages.length - 1 : undefined,
      );
    }
  }

  protected onMenuKey(e: KeyboardEvent): void {
    const n = this.languages.length;
    const moves: Record<string, number> = {
      ArrowDown: this.focusIndex() + 1,
      ArrowUp: this.focusIndex() - 1 + n,
      Home: 0,
      End: n - 1,
    };
    if (e.key in moves) {
      e.preventDefault();
      this.focusItem((moves[e.key] as number) % n);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      this.close(true);
    } else if (e.key === 'Tab') {
      this.close(false);
    }
  }

  protected pick(code: SneatLang): void {
    const changed = code !== this.languageService.lang();
    this.languageService.setLang(code);
    this.close(true);
    if (changed) this.langChange.emit(code);
  }

  protected onDocumentClick(e: Event): void {
    if (this.open() && !this.host.nativeElement.contains(e.target as Node)) {
      this.close(false);
    }
  }

  private openMenu(index?: number): void {
    const currentIndex = this.languages.findIndex(
      (l) => l.code === this.languageService.lang(),
    );
    this.open.set(true);
    // Items render on the next change detection; focus them after it.
    setTimeout(() => this.focusItem(index ?? Math.max(currentIndex, 0)));
  }

  private focusItem(index: number): void {
    this.focusIndex.set(index);
    this.items()[index]?.nativeElement.focus();
  }

  private close(returnFocus: boolean): void {
    this.open.set(false);
    if (returnFocus) this.trigger().nativeElement.focus();
  }
}
