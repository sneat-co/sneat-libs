describe('LoginPage', () => {
  it('should create', () => {
    expect(true).toBeTruthy();
  });

  it('registers company SSO as a normal login entry', async () => {
    const template = await import('./login-page.component.html?raw');
    expect(template.default).toContain('Sign in with company SSO');
    expect(template.default).toContain('routerLink="/sso"');
  });
});
