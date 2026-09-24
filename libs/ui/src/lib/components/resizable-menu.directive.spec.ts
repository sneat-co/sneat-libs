import {
  clampResizableMenuWidth,
  parseResizableMenuWidth,
  RESIZABLE_MENU_DEFAULT_WIDTH,
  RESIZABLE_MENU_MAX_WIDTH,
  RESIZABLE_MENU_MIN_WIDTH,
  ResizableMenuDirective,
} from './resizable-menu.directive';
import { ElementRef, Renderer2 } from '@angular/core';

function pointerEvent(type: string, values: Partial<PointerEvent> = {}): Event {
  const event = new Event(type, { bubbles: true, cancelable: true });
  for (const [key, value] of Object.entries(values)) {
    Object.defineProperty(event, key, { value });
  }
  return event;
}

describe('resizable menu width helpers', () => {
  it('uses the default width and clamps narrower and wider values', () => {
    expect(RESIZABLE_MENU_DEFAULT_WIDTH).toBe(280);
    expect(clampResizableMenuWidth(100)).toBe(RESIZABLE_MENU_MIN_WIDTH);
    expect(clampResizableMenuWidth(900)).toBe(RESIZABLE_MENU_MAX_WIDTH);
    expect(clampResizableMenuWidth(350)).toBe(350);
  });

  it('restores persisted widths within bounds and rejects invalid values', () => {
    expect(parseResizableMenuWidth('410')).toBe(410);
    expect(parseResizableMenuWidth('100')).toBe(RESIZABLE_MENU_MIN_WIDTH);
    expect(parseResizableMenuWidth('900')).toBe(RESIZABLE_MENU_MAX_WIDTH);
    expect(parseResizableMenuWidth('not-a-width')).toBeUndefined();
    expect(parseResizableMenuWidth('')).toBeUndefined();
    expect(parseResizableMenuWidth(null)).toBeUndefined();
  });
});

describe('ResizableMenuDirective', () => {
  let splitPane: HTMLElement;
  let menu: HTMLElement;
  let directive: ResizableMenuDirective;

  beforeEach(() => {
    localStorage.clear();
    splitPane = document.createElement('ion-split-pane');
    menu = document.createElement('ion-menu');
    splitPane.appendChild(menu);
    const renderer = {
      createElement: (name: string) => document.createElement(name),
      appendChild: (parent: HTMLElement, child: HTMLElement) => parent.appendChild(child),
    } as unknown as Renderer2;
    directive = new ResizableMenuDirective(
      { nativeElement: menu } as ElementRef<HTMLElement>,
      renderer,
    );
  });

  afterEach(() => directive.ngOnDestroy());

  it('keeps resizing unavailable until Ionic reports persistent split-pane mode', () => {
    localStorage.setItem('sneat.resizable-menu.width', '430');
    directive.ngAfterViewInit();
    const handle = menu.querySelector('button.sneat-resizable-menu-handle') as HTMLButtonElement;
    expect(handle.hidden).toBe(true);
    expect(handle.getAttribute('aria-valuenow')).toBe('430');
    expect(menu.style.getPropertyValue('--width')).toBe('');
    expect(splitPane.style.getPropertyValue('--side-width')).toBe('');

    splitPane.dispatchEvent(new CustomEvent('ionSplitPaneVisible', { bubbles: true, detail: { visible: true } }));
    expect(handle.hidden).toBe(false);
    expect(menu.style.getPropertyValue('--width')).toBe('430px');
    expect(splitPane.style.getPropertyValue('--side-width')).toBe('430px');
    splitPane.dispatchEvent(new CustomEvent('ionSplitPaneVisible', { bubbles: true, detail: { visible: false } }));
    expect(handle.hidden).toBe(true);
    expect(menu.style.getPropertyValue('--width')).toBe('');
    expect(menu.style.getPropertyValue('--min-width')).toBe('');
    expect(menu.style.getPropertyValue('--max-width')).toBe('');
    expect(splitPane.style.getPropertyValue('--side-width')).toBe('');
    expect(splitPane.style.getPropertyValue('--side-min-width')).toBe('');
    expect(splitPane.style.getPropertyValue('--side-max-width')).toBe('');
    splitPane.dispatchEvent(new CustomEvent('ionSplitPaneVisible', { detail: { visible: true } }));
    expect(menu.style.getPropertyValue('--width')).toBe('430px');
    expect(splitPane.style.getPropertyValue('--side-width')).toBe('430px');
  });

  it('restores and applies a persisted width safely', () => {
    splitPane.classList.add('split-pane-visible');
    localStorage.setItem('sneat.resizable-menu.width', '430');
    directive.ngAfterViewInit();
    expect(menu.style.getPropertyValue('--width')).toBe('430px');
    expect(splitPane.style.getPropertyValue('--side-width')).toBe('430px');
  });

  it('uses the default width for corrupt persisted state', () => {
    splitPane.classList.add('split-pane-visible');
    localStorage.setItem('sneat.resizable-menu.width', 'Infinity');
    directive.ngAfterViewInit();
    expect(menu.style.getPropertyValue('--width')).toBe('280px');
  });

  it('resizes immediately within limits and persists only when dragging ends', () => {
    directive.ngAfterViewInit();
    splitPane.classList.add('split-pane-visible');
    splitPane.dispatchEvent(new CustomEvent('ionSplitPaneVisible', { detail: { visible: true } }));
    const handle = menu.querySelector('button.sneat-resizable-menu-handle') as HTMLButtonElement;

    handle.dispatchEvent(pointerEvent('pointerdown', { button: 0, pointerId: 1, clientX: 100 } as Partial<PointerEvent>));
    handle.dispatchEvent(pointerEvent('pointermove', { pointerId: 1, clientX: 180 } as Partial<PointerEvent>));
    expect(menu.style.getPropertyValue('--width')).toBe('360px');
    expect(localStorage.getItem('sneat.resizable-menu.width')).toBeNull();
    handle.dispatchEvent(pointerEvent('pointerup', { pointerId: 1 } as Partial<PointerEvent>));
    expect(localStorage.getItem('sneat.resizable-menu.width')).toBe('360');

    handle.dispatchEvent(pointerEvent('pointerdown', { button: 0, pointerId: 2, clientX: 100 } as Partial<PointerEvent>));
    handle.dispatchEvent(pointerEvent('pointermove', { pointerId: 2, clientX: -500 } as Partial<PointerEvent>));
    expect(menu.style.getPropertyValue('--width')).toBe(`${RESIZABLE_MENU_MIN_WIDTH}px`);
    handle.dispatchEvent(pointerEvent('pointerup', { pointerId: 2 } as Partial<PointerEvent>));

    handle.dispatchEvent(pointerEvent('pointerdown', { button: 0, pointerId: 3, clientX: 100 } as Partial<PointerEvent>));
    handle.dispatchEvent(pointerEvent('pointermove', { pointerId: 3, clientX: 1000 } as Partial<PointerEvent>));
    expect(menu.style.getPropertyValue('--width')).toBe(`${RESIZABLE_MENU_MAX_WIDTH}px`);
    handle.dispatchEvent(pointerEvent('pointerup', { pointerId: 3 } as Partial<PointerEvent>));
  });

  it('supports keyboard resizing in fixed increments', () => {
    directive.ngAfterViewInit();
    splitPane.dispatchEvent(new CustomEvent('ionSplitPaneVisible', { detail: { visible: true } }));
    const handle = menu.querySelector('button.sneat-resizable-menu-handle') as HTMLButtonElement;
    handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(menu.style.getPropertyValue('--width')).toBe('290px');
    expect(localStorage.getItem('sneat.resizable-menu.width')).toBe('290');
  });
});
