import template from './login-page.component.html?raw';
import authPanelTemplate from './auth-panel.component.html?raw';
import { AUTH_UI_LABEL_SETS, AUTH_UI_LABELS_EN as EN } from '../../i18n/auth-ui-labels';

describe('LoginPage', () => {
  it('uses product-neutral account copy', () => {
    expect(template).toContain('{{ L().signInWithSneatAccount }}');
    expect(EN.signInWithSneatAccount).toBe('Sign in with your Sneat account.');
    for (const set of Object.values(AUTH_UI_LABEL_SETS)) {
      expect(set.signInWithSneatAccount).not.toMatch(/free|open source/i);
    }
  });

  it('reuses the inline auth panel and preserves the login continuation', () => {
    expect(template).toContain('[returnTo]="redirectTo"');
    expect(template).toContain('[initialMode]="initialMode"');
    expect(authPanelTemplate).toContain('{{ L().signInWithCompanySso }}');
    expect(EN.signInWithCompanySso).toBe('Sign in with company SSO');
    expect(authPanelTemplate).toContain('routerLink="/sso"');
  });

  it('uses a neutral account choice with the current provider and app destination', () => {
    expect(template).toContain('{{ L().signedInAsLead }} <strong>');
    expect(template).toContain('{{ L().signedInWith(provider) }}');
    expect(template).toContain('L().continueTo(appTitle)');
    expect(template).toContain('{{ L().useAnotherAccount }}');
    expect(EN.signedInAsLead).toBe('You’re signed in as');
    expect(EN.signedInWith('Google')).toBe('Signed in with Google');
    expect(EN.continueTo('Sneat.app')).toBe('Continue to Sneat.app');
    expect(EN.useAnotherAccount).toBe('Use another account');
    expect(template).not.toContain('color="success"');
  });
});
