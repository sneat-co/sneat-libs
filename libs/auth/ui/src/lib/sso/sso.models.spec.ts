import { emailDomain } from './sso.models';

describe('SSO models', () => {
  it('extracts and normalizes a work email domain', () => {
    expect(emailDomain(' Alice@Acme.COM ')).toBe('acme.com');
  });

  it.each(['alice', 'alice@localhost', '@acme.com', 'alice@@acme.com'])(
    'rejects invalid work email %s',
    (email) => expect(emailDomain(email)).toBeUndefined(),
  );
});
