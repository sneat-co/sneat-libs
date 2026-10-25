import type { ISneatAuthUser } from '../sneat-auth-state-service';
import type { IInitUserRecordRequest } from './user-record.service';

/**
 * The auth provider IDs that `POST /v0/users/init_user_record` accepts: the server's `knownAuthProviderIDs`
 * (strongoapp `strongoauth`). Any other value, including Firebase's own `"firebase"`, answers 400
 * `authProvider: supported auth providers=...`.
 */
export const INIT_USER_RECORD_AUTH_PROVIDERS: readonly string[] = [
  'password',
  'emailLink',
  'phone',
  'google.com',
  'facebook.com',
  'twitter.com',
  'github.com',
  'microsoft.com',
  'apple.com',
  'yahoo.com',
  'telegram',
  'custom',
];

/**
 * The provider to report for a signed-in Firebase user. `user.providerId` is `"firebase"` for an account that has
 * more than one linked provider (Google plus GitHub, say), which the server rejects with 400, so the first linked
 * provider the server knows is reported instead. `undefined` when none is known: the field is then left out.
 */
export function initUserRecordAuthProvider(
  user: Pick<ISneatAuthUser, 'providerId' | 'providerData'>,
): string | undefined {
  const candidates = [
    user.providerId,
    ...(user.providerData ?? []).map((info) => info.providerId),
  ];
  return candidates.find((id) => INIT_USER_RECORD_AUTH_PROVIDERS.includes(id));
}

/**
 * The email to report: the account's own, else the first one a linked provider holds (GitHub with a private primary
 * address leaves `user.email` empty while the provider record has it).
 */
function initUserRecordEmail(
  user: Pick<ISneatAuthUser, 'email' | 'providerData'>,
): string | undefined {
  return (
    user.email ||
    (user.providerData ?? []).find((info) => !!info.email)?.email ||
    undefined
  );
}

export function initUserRecordRequestFromAuthUser(
  user: ISneatAuthUser,
): IInitUserRecordRequest {
  const request: IInitUserRecordRequest = {
    email: initUserRecordEmail(user),
    emailIsVerified: user.emailVerified,
    authProvider: initUserRecordAuthProvider(user),
  };
  return user.displayName
    ? { ...request, names: { fullName: user.displayName } }
    : request;
}
