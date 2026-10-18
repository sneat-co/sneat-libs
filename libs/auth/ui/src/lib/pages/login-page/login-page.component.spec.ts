import template from './login-page.component.html?raw';
import authPanelTemplate from './auth-panel.component.html?raw';

describe('LoginPage', () => {
  it('uses product-neutral account copy', () => {
    expect(template).toContain('Sign in with your Sneat account.');
    expect(template).not.toContain('free to use');
    expect(template).not.toContain('open source');
  });

  it('reuses the inline auth panel and preserves the login continuation', () => {
    expect(template).toContain('[returnTo]="redirectTo"');
    expect(template).toContain('[initialMode]="initialMode"');
    expect(authPanelTemplate).toContain('Sign in with company SSO');
    expect(authPanelTemplate).toContain('routerLink="/sso"');
  });
});
