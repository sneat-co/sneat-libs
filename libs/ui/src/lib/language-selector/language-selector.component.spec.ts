import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SNEAT_LANGUAGES, SneatLanguageService } from '@sneat/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  LanguageSelectorComponent,
  SNEAT_LANGUAGE_WORD,
} from './language-selector.component';

function must<T>(v: T | null | undefined): T {
  if (v == null) throw new Error('expected an element');
  return v;
}

describe('LanguageSelectorComponent', () => {
  let fixture: ComponentFixture<LanguageSelectorComponent>;
  let el: HTMLElement;
  let service: SneatLanguageService;

  const trigger = () =>
    must(el.querySelector<HTMLButtonElement>('button.trigger'));
  const menu = () => el.querySelector<HTMLElement>('[role="menu"]');
  const items = () =>
    Array.from(
      el.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]'),
    );
  const key = (target: HTMLElement, k: string) => {
    const e = new KeyboardEvent('keydown', {
      key: k,
      bubbles: true,
      cancelable: true,
    });
    target.dispatchEvent(e);
    fixture.detectChanges();
    return e;
  };
  const openByClick = async () => {
    trigger().click();
    fixture.detectChanges();
    await vi.runAllTimersAsync();
  };

  beforeEach(async () => {
    vi.useFakeTimers();
    try {
      localStorage.removeItem('sneat.lang');
    } catch {
      /* no storage */
    }
    await TestBed.configureTestingModule({
      imports: [LanguageSelectorComponent],
    }).compileComponents();
    service = TestBed.inject(SneatLanguageService);
    fixture = TestBed.createComponent(LanguageSelectorComponent);
    el = fixture.nativeElement;
    document.body.appendChild(el);
    fixture.detectChanges();
  });

  afterEach(() => {
    el.remove();
    vi.useRealTimers();
  });

  it('shows the native name, a chevron, no flags, and an accessible name', () => {
    expect(trigger().textContent).toContain('English');
    expect(trigger().querySelector('.short')?.textContent).toBe('EN');
    expect(trigger().textContent).toContain('▾');
    expect(trigger().getAttribute('aria-haspopup')).toBe('menu');
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(trigger().getAttribute('aria-label')).toBe('Language: English');
    expect(trigger().textContent).not.toMatch(/\p{Regional_Indicator}/u);
  });

  it('opens a role="menu" of native names, focusing the current one', async () => {
    service.setLang('de');
    fixture.detectChanges();
    await openByClick();
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    expect(menu()?.getAttribute('aria-label')).toBe('Sprache');
    expect(menu()?.id).toBe(trigger().getAttribute('aria-controls'));
    expect(items().map((b) => b.textContent?.trim())).toEqual(
      SNEAT_LANGUAGES.map((l) => l.nativeName),
    );
    expect(items().map((b) => b.getAttribute('lang'))).toEqual(
      SNEAT_LANGUAGES.map((l) => l.locale),
    );
    const active = items().filter(
      (b) => b.getAttribute('aria-checked') === 'true',
    );
    expect(active.map((b) => b.textContent?.trim())).toEqual(['Deutsch']);
    expect(active[0]?.hasAttribute('aria-current')).toBe(false);
    expect(document.activeElement).toBe(active[0]);
  });

  it('switches in place on click, emits, closes and returns focus', async () => {
    const changes: string[] = [];
    fixture.componentInstance.langChange.subscribe((l) => changes.push(l));
    await openByClick();
    must(items().find((b) => b.textContent?.includes('Русский'))).click();
    fixture.detectChanges();
    expect(service.lang()).toBe('ru');
    expect(changes).toEqual(['ru']);
    expect(menu()).toBeNull();
    expect(trigger().textContent).toContain('Русский');
    expect(trigger().getAttribute('aria-label')).toBe(
      `${SNEAT_LANGUAGE_WORD.ru}: Русский`,
    );
    expect(document.activeElement).toBe(trigger());
  });

  it('does not emit when the current language is picked again', async () => {
    const changes: string[] = [];
    fixture.componentInstance.langChange.subscribe((l) => changes.push(l));
    await openByClick();
    must(items()[0]).click();
    fixture.detectChanges();
    expect(changes).toEqual([]);
    expect(menu()).toBeNull();
  });

  it('works by keyboard: ArrowDown opens, arrows/Home/End move, Escape closes', async () => {
    key(trigger(), 'ArrowDown');
    await vi.runAllTimersAsync();
    expect(menu()).not.toBeNull();
    expect(document.activeElement).toBe(items()[0]);
    key(must(menu()), 'ArrowDown');
    expect(document.activeElement).toBe(items()[1]);
    key(must(menu()), 'ArrowUp');
    key(must(menu()), 'ArrowUp');
    expect(document.activeElement).toBe(items()[items().length - 1]);
    key(must(menu()), 'Home');
    expect(document.activeElement).toBe(items()[0]);
    key(must(menu()), 'End');
    expect(document.activeElement).toBe(items()[items().length - 1]);
    const esc = key(must(menu()), 'Escape');
    expect(esc.defaultPrevented).toBe(true);
    expect(menu()).toBeNull();
    expect(document.activeElement).toBe(trigger());
  });

  it('ArrowUp on the button opens on the last item; Tab closes', async () => {
    key(trigger(), 'ArrowUp');
    await vi.runAllTimersAsync();
    expect(document.activeElement).toBe(items()[items().length - 1]);
    key(must(menu()), 'Tab');
    expect(menu()).toBeNull();
  });

  it('ignores other keys on the button and in the menu', async () => {
    key(trigger(), 'a');
    expect(menu()).toBeNull();
    await openByClick();
    key(must(menu()), 'x');
    expect(menu()).not.toBeNull();
  });

  it('closes on an outside click but not on a click inside', async () => {
    await openByClick();
    must(menu()).click();
    fixture.detectChanges();
    expect(menu()).not.toBeNull();
    document.body.click();
    fixture.detectChanges();
    expect(menu()).toBeNull();
    document.body.click(); // closed: nothing to do
    expect(menu()).toBeNull();
  });

  it('a second click on the button closes the menu', async () => {
    await openByClick();
    trigger().click();
    fixture.detectChanges();
    expect(menu()).toBeNull();
  });

  it('compact shows the 2-letter badge', () => {
    fixture.componentRef.setInput('compact', true);
    fixture.detectChanges();
    expect(trigger().classList).toContain('compact');
  });
});
