import { InjectionToken } from '@angular/core';
import { AuthProviderID } from '@sneat/auth-core';

/** Website-specific presentation of the shared authentication panel. */
export interface AuthPanelUiConfig {
  readonly showQuickLoginHeader?: boolean;
  /** Company SSO is off by default; a website opts in with true to show the "Sign in with company SSO" button. */
  readonly showCompanySso?: boolean;
  /** Omit to show all providers. An empty list hides quick login entirely. */
  readonly quickLoginProviders?: readonly (AuthProviderID | 'telegram')[];
}

export const AUTH_PANEL_UI_CONFIG = new InjectionToken<AuthPanelUiConfig>(
  'AUTH_PANEL_UI_CONFIG',
  { providedIn: 'root', factory: () => ({}) },
);
