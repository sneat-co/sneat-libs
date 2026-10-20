import {
  clearLoginRedirectIntent,
  consumeLoginRedirectIntent,
  markLoginRedirectIntent,
} from './login-redirect-intent';

describe('login redirect intent', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('persists a validated continuation and consumes the intent once', () => {
    markLoginRedirectIntent('/reports?view=recent');

    expect(consumeLoginRedirectIntent()).toEqual({
      returnTo: '/reports?view=recent',
    });
    expect(consumeLoginRedirectIntent()).toBeUndefined();
  });

  it('drops unsafe and expired intent data', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_000);
    markLoginRedirectIntent('/reports?token=private');
    expect(consumeLoginRedirectIntent()).toEqual({ returnTo: undefined });

    markLoginRedirectIntent('/reports');
    vi.spyOn(Date, 'now').mockReturnValue(1_000 + 10 * 60 * 1000 + 1);
    expect(consumeLoginRedirectIntent()).toBeUndefined();
  });

  it('clears intent when provider sign-in fails or is canceled', () => {
    markLoginRedirectIntent('/reports');
    clearLoginRedirectIntent();
    expect(consumeLoginRedirectIntent()).toBeUndefined();
  });
});
