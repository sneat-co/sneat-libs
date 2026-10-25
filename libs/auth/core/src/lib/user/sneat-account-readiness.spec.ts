import { ISneatAuthState } from '../sneat-auth-state-service';
import { ISneatUserState } from './sneat-user.service';
import { isSneatAccountReady } from './sneat-account-readiness';

describe('isSneatAccountReady', () => {
  const user = { uid: 'buyer', isAnonymous: false };
  const auth = (overrides: Partial<ISneatAuthState> = {}): ISneatAuthState => ({
    status: 'authenticated',
    loadingPhase: 'ready',
    token: 'buyer-token',
    user,
    ...overrides,
  });
  const record = (
    overrides: Partial<ISneatUserState> = {},
  ): ISneatUserState => ({
    status: 'authenticated',
    user,
    record: {},
    userRecordStatus: 'ready',
    ...overrides,
  });

  it('accepts only a matching permanent identity with ready token and persisted record', () => {
    expect(isSneatAccountReady(auth(), record())).toBe(true);
  });

  it.each([
    ['not authenticated', auth({ status: 'notAuthenticated' })],
    ['token still pending', auth({ loadingPhase: 'getting-token' })],
    ['failed token despite old token value', auth({ loadingPhase: 'failed' })],
    ['missing token', auth({ token: null })],
    ['blank token', auth({ token: '  ' })],
    [
      'anonymous auth identity',
      auth({ user: { ...user, isAnonymous: true } as ISneatAuthState['user'] }),
    ],
  ])('rejects %s', (_label, authState) => {
    expect(isSneatAccountReady(authState, record())).toBe(false);
  });

  it.each([
    ['different UID', record({ user: { ...user, uid: 'old-buyer' } as ISneatUserState['user'] })],
    [
      'anonymous persisted identity',
      record({ user: { ...user, isAnonymous: true } as ISneatUserState['user'] }),
    ],
    ['record still loading', record({ userRecordStatus: 'loading' })],
    ['record initialization failed', record({ userRecordStatus: 'failed' })],
    ['missing persisted record', record({ record: null })],
  ])('rejects a user record that is %s', (_label, userState) => {
    expect(isSneatAccountReady(auth(), userState)).toBe(false);
  });
});
