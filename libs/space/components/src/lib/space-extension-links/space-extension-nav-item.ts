import { InjectionToken, Provider } from '@angular/core';

export type SpaceExtensionLinksPresentation = 'menu' | 'card';

export interface SpaceExtensionNavAction {
  readonly id: string;
  readonly title: string;
  readonly path: string;
  readonly emoji?: string;
  readonly presentations?: readonly SpaceExtensionLinksPresentation[];
}

export interface SpaceExtensionNavItem {
  readonly id: string;
  readonly title: string;
  readonly path: string;
  /** An imported Ionicon SVG definition, passed directly to ion-icon. */
  readonly icon: string;
  readonly spaceTypes?: readonly string[];
  readonly actions?: readonly SpaceExtensionNavAction[];
}

export const SPACE_EXTENSION_NAV_ITEMS = new InjectionToken<
  readonly SpaceExtensionNavItem[]
>('space-extension-nav-items');

export function provideSpaceExtensionNavItems(
  items: readonly SpaceExtensionNavItem[],
): Provider {
  return { provide: SPACE_EXTENSION_NAV_ITEMS, useValue: items };
}
