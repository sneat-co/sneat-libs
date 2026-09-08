import template from './login-page.component.html?raw';

describe('LoginPage', () => {
  it('uses product-neutral account copy', () => {
    expect(template).toContain('Sign in with your Sneat account.');
    expect(template).not.toContain('free to use');
    expect(template).not.toContain('open source');
  });

  it('registers company SSO as a normal login entry', async () => {
    const template = await import('./login-page.component.html?raw');
    expect(template.default).toContain('Sign in with company SSO');
    expect(template.default).toContain('routerLink="/sso"');
  });
});
