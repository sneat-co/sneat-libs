import { safeAuthReturnPath } from './safe-auth-return-path';

describe('safeAuthReturnPath', () => {
  it('keeps an internal route and its checkout selection', () => {
    expect(
      safeAuthReturnPath(
        '/business/checkout?planID=datatug-business-usage-annual&spaceID=space_1',
      ),
    ).toBe(
      '/business/checkout?planID=datatug-business-usage-annual&spaceID=space_1',
    );
    expect(
      safeAuthReturnPath('/pricing/return?mode=test&session_id=cs_test_paid'),
    ).toBe('/pricing/return?mode=test&session_id=cs_test_paid');
  });

  it.each([
    'https://evil.invalid/checkout',
    '//evil.invalid/checkout',
    '/\\evil.invalid/checkout',
    '/%2e%2e/%2f/evil.invalid/checkout',
    '/%5cevil.invalid/checkout',
    '/subscribe?token=secret',
    '/subscribe?access_token=secret',
    '/subscribe?code=credential',
    '/subscribe?oauth_code=credential',
    '/subscribe?state=opaque',
    '/subscribe#token=secret',
  ])('rejects unsafe continuation %s', (value) => {
    expect(safeAuthReturnPath(value)).toBeUndefined();
  });
});
