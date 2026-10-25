import { ISneatAuthState } from '../sneat-auth-state-service';
import { ISneatUserState } from './sneat-user.service';

/**
 * Returns true only when the current permanent Firebase identity has a usable
 * token and its matching persisted Sneat user record is ready.
 */
export function isSneatAccountReady(
  authState: ISneatAuthState | null | undefined,
  userState: ISneatUserState | null | undefined,
): boolean {
  const authUser = authState?.user;
  const user = userState?.user;
  const uid = authUser?.uid;
  return (
    authState?.status === 'authenticated' &&
    authState.loadingPhase === 'ready' &&
    typeof authState.token === 'string' &&
    authState.token.trim().length > 0 &&
    !!uid?.trim() &&
    authUser?.isAnonymous === false &&
    userState?.status === 'authenticated' &&
    user?.uid === uid &&
    user?.isAnonymous === false &&
    userState.userRecordStatus === 'ready' &&
    !!userState.record
  );
}
