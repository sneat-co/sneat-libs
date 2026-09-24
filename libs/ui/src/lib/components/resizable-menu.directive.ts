import {
  AfterViewInit,
  Directive,
  ElementRef,
  Input,
  OnDestroy,
  Renderer2,
} from '@angular/core';

export const RESIZABLE_MENU_DEFAULT_WIDTH = 280;
export const RESIZABLE_MENU_MIN_WIDTH = 220;
export const RESIZABLE_MENU_MAX_WIDTH = 600;
export const RESIZABLE_MENU_KEYBOARD_STEP = 10;
export const RESIZABLE_MENU_STORAGE_KEY = 'sneat.resizable-menu.width';

export function clampResizableMenuWidth(
  width: number,
  min: number = RESIZABLE_MENU_MIN_WIDTH,
  max: number = RESIZABLE_MENU_MAX_WIDTH,
): number {
  return Math.round(Math.min(max, Math.max(min, width)));
}

export function parseResizableMenuWidth(
  value: string | null | undefined,
  min: number = RESIZABLE_MENU_MIN_WIDTH,
  max: number = RESIZABLE_MENU_MAX_WIDTH,
): number | undefined {
  if (value == null || value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? clampResizableMenuWidth(parsed, min, max) : undefined;
}

/** Attach to an existing ion-menu inside ion-split-pane to enable desktop resizing. */
@Directive({
  selector: 'ion-menu[sneatResizableMenu]',
  standalone: true,
})
export class ResizableMenuDirective implements AfterViewInit, OnDestroy {
  @Input() sneatResizableMenuMin = RESIZABLE_MENU_MIN_WIDTH;
  @Input() sneatResizableMenuMax = RESIZABLE_MENU_MAX_WIDTH;
  @Input() sneatResizableMenuDefault = RESIZABLE_MENU_DEFAULT_WIDTH;
  @Input() sneatResizableMenuStorageKey = RESIZABLE_MENU_STORAGE_KEY;

  private readonly menu: HTMLElement;
  private readonly splitPane: HTMLElement | null;
  private handle?: HTMLButtonElement;
  private visible = false;
  private width = RESIZABLE_MENU_DEFAULT_WIDTH;
  private dragPointerId?: number;
  private dragStartX = 0;
  private dragStartWidth = 0;
  private previousUserSelect = '';
  private readonly onSplitPaneVisible = (event: Event): void => {
    if (event.target !== this.splitPane) return;
    const visible = !!(event as CustomEvent<{ visible?: boolean }>).detail?.visible;
    this.setVisible(visible);
  };
  private readonly onPointerMove = (event: PointerEvent): void => {
    if (event.pointerId !== this.dragPointerId || !this.visible) return;
    this.setWidth(this.dragStartWidth + event.clientX - this.dragStartX);
  };
  private readonly onPointerEnd = (event: PointerEvent): void => {
    if (event.pointerId !== this.dragPointerId) return;
    this.finishDrag(true);
  };
  private readonly onLostPointerCapture = (event: PointerEvent): void => {
    if (event.pointerId === this.dragPointerId) this.finishDrag(true);
  };

  constructor(
    elementRef: ElementRef<HTMLElement>,
    private readonly renderer: Renderer2,
  ) {
    this.menu = elementRef.nativeElement;
    this.splitPane = this.menu.closest('ion-split-pane');
  }

  ngAfterViewInit(): void {
    if (!this.splitPane) return;
    this.width = this.readStoredWidth();
    this.applyWidth();
    this.createHandle();
    this.setVisible(this.splitPane.classList.contains('split-pane-visible'));
    this.splitPane.addEventListener('ionSplitPaneVisible', this.onSplitPaneVisible);
  }

  ngOnDestroy(): void {
    this.finishDrag(false);
    this.splitPane?.removeEventListener('ionSplitPaneVisible', this.onSplitPaneVisible);
    this.handle?.remove();
    this.handle = undefined;
  }

  private createHandle(): void {
    const handle = this.renderer.createElement('button') as HTMLButtonElement;
    handle.type = 'button';
    handle.className = 'sneat-resizable-menu-handle';
    handle.setAttribute('aria-label', 'Resize navigation menu');
    handle.setAttribute('role', 'separator');
    handle.setAttribute('aria-orientation', 'vertical');
    handle.setAttribute('aria-valuemin', String(this.sneatResizableMenuMin));
    handle.setAttribute('aria-valuemax', String(this.sneatResizableMenuMax));
    handle.setAttribute('aria-valuenow', String(this.width));
    handle.tabIndex = 0;
    Object.assign(handle.style, {
      position: 'absolute',
      top: '0',
      right: '-3px',
      bottom: '0',
      width: '7px',
      height: '100%',
      padding: '0',
      border: '0',
      background: 'transparent',
      cursor: 'col-resize',
      touchAction: 'none',
      zIndex: '10',
    });
    handle.addEventListener('pointerdown', this.onPointerDown);
    handle.addEventListener('pointermove', this.onPointerMove);
    handle.addEventListener('pointerup', this.onPointerEnd);
    handle.addEventListener('pointercancel', this.onPointerEnd);
    handle.addEventListener('lostpointercapture', this.onLostPointerCapture);
    handle.addEventListener('keydown', this.onKeyDown);
    this.renderer.appendChild(this.menu, handle);
    this.handle = handle;
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (!this.visible || !this.handle || event.button !== 0) return;
    event.preventDefault();
    this.dragPointerId = event.pointerId;
    this.dragStartX = event.clientX;
    this.dragStartWidth = this.width;
    this.previousUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = 'none';
    try {
      this.handle.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture may be unavailable in test DOMs or older embedded browsers.
    }
  };

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (!this.visible) return;
    const direction = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!direction) return;
    event.preventDefault();
    this.setWidth(this.width + direction * RESIZABLE_MENU_KEYBOARD_STEP);
    this.persistWidth();
  };

  private setVisible(visible: boolean): void {
    this.visible = visible;
    if (this.handle) this.handle.hidden = !visible;
    if (visible) {
      this.applyWidth();
    } else {
      this.finishDrag(true);
      this.clearWidthOverrides();
    }
  }

  private setWidth(width: number): void {
    this.width = clampResizableMenuWidth(width, this.sneatResizableMenuMin, this.sneatResizableMenuMax);
    this.applyWidth();
  }

  private applyWidth(): void {
    const cssWidth = `${this.width}px`;
    this.menu.style.setProperty('--width', cssWidth);
    this.menu.style.setProperty('--min-width', `${this.sneatResizableMenuMin}px`);
    this.menu.style.setProperty('--max-width', `${this.sneatResizableMenuMax}px`);
    this.splitPane?.style.setProperty('--side-width', cssWidth);
    this.splitPane?.style.setProperty('--side-min-width', `${this.sneatResizableMenuMin}px`);
    this.splitPane?.style.setProperty('--side-max-width', `${this.sneatResizableMenuMax}px`);
    this.handle?.setAttribute('aria-valuenow', String(this.width));
  }

  private clearWidthOverrides(): void {
    this.menu.style.removeProperty('--width');
    this.menu.style.removeProperty('--min-width');
    this.menu.style.removeProperty('--max-width');
    this.splitPane?.style.removeProperty('--side-width');
    this.splitPane?.style.removeProperty('--side-min-width');
    this.splitPane?.style.removeProperty('--side-max-width');
  }

  private readStoredWidth(): number {
    try {
      if (typeof localStorage === 'undefined') return this.sneatResizableMenuDefault;
      const stored = parseResizableMenuWidth(
        localStorage.getItem(this.sneatResizableMenuStorageKey),
        this.sneatResizableMenuMin,
        this.sneatResizableMenuMax,
      );
      return stored ?? clampResizableMenuWidth(
        this.sneatResizableMenuDefault,
        this.sneatResizableMenuMin,
        this.sneatResizableMenuMax,
      );
    } catch {
      return clampResizableMenuWidth(this.sneatResizableMenuDefault, this.sneatResizableMenuMin, this.sneatResizableMenuMax);
    }
  }

  private persistWidth(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.sneatResizableMenuStorageKey, String(this.width));
      }
    } catch {
      // Storage can be disabled by browser policy; resizing remains available for this session.
    }
  }

  private finishDrag(persist: boolean): void {
    if (this.dragPointerId === undefined) return;
    const pointerId = this.dragPointerId;
    this.dragPointerId = undefined;
    if (this.handle?.hasPointerCapture(pointerId)) {
      try {
        this.handle.releasePointerCapture(pointerId);
      } catch {
        // Capture can already have been released by the browser.
      }
    }
    if (typeof document !== 'undefined') document.body.style.userSelect = this.previousUserSelect;
    if (persist) this.persistWidth();
  }
}
