import template from './login-page.component.html?raw';

describe('LoginPage', () => {
  it('uses product-neutral account copy', () => {
    expect(template).toContain('Sign in with your Sneat account.');
    expect(template).not.toContain('free to use');
    expect(template).not.toContain('open source');
  });
});
