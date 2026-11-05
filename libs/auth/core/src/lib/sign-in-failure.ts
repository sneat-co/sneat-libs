import { authProviderTitle } from './pending-credential-link';

/**
 * Set right before `signInWithRedirect()` navigates away, read when the app
 * starts again. A marker with no redirect result and no signed-in user means
 * the sign-in silently did not complete.
 */
export const REDIRECT_SIGN_IN_MARKER_STORAGE_KEY =
  'sneat:auth:redirect-sign-in-started';

/** A marker older than this is from an abandoned attempt, not this return. */
export const REDIRECT_SIGN_IN_MARKER_TTL_MS = 15 * 60 * 1000;

/** The code used when a redirect came back with no result and no user. */
export const REDIRECT_RESULT_EMPTY = 'redirect-result-empty';

interface IRedirectSignInMarker {
  readonly providerId: string;
  readonly startedAt: number;
}

/** What the login page tells the user about a sign-in that did not complete. */
export interface ISignInFailure {
  /** Short human summary, e.g. "Sign-in with Google didn't complete". */
  readonly summary: string;
  readonly providerId?: string;
  /** Firebase error code, or REDIRECT_RESULT_EMPTY for the silent case. */
  readonly code?: string;
  readonly message?: string;
  /** The host the user is on: unauthorized-domain errors are about it. */
  readonly host: string;
  /** One to three short, actionable hints. */
  readonly hints: readonly string[];
}

const storage = (): Storage | undefined => {
  try {
    return globalThis.sessionStorage;
  } catch {
    return undefined; // access can throw when storage is blocked
  }
};

export function markRedirectSignInStarted(
  providerId: string,
  now = Date.now(),
): void {
  const marker: IRedirectSignInMarker = { providerId, startedAt: now };
  try {
    storage()?.setItem(
      REDIRECT_SIGN_IN_MARKER_STORAGE_KEY,
      JSON.stringify(marker),
    );
  } catch {
    // Without storage the silent case can't be detected; errors still are.
  }
}

/** Reads and removes the marker; undefined when absent, stale or invalid. */
export function consumeRedirectSignInMarker(
  now = Date.now(),
): IRedirectSignInMarker | undefined {
  let raw: string | null | undefined;
  try {
    raw = storage()?.getItem(REDIRECT_SIGN_IN_MARKER_STORAGE_KEY);
    storage()?.removeItem(REDIRECT_SIGN_IN_MARKER_STORAGE_KEY);
  } catch {
    return undefined;
  }
  if (!raw) return undefined;
  try {
    const marker = JSON.parse(raw) as Partial<IRedirectSignInMarker>;
    if (
      typeof marker.providerId !== 'string' ||
      typeof marker.startedAt !== 'number' ||
      now - marker.startedAt > REDIRECT_SIGN_IN_MARKER_TTL_MS
    ) {
      return undefined;
    }
    return { providerId: marker.providerId, startedAt: marker.startedAt };
  } catch {
    return undefined;
  }
}

const CANCELLED_CODES = new Set([
  'auth/popup-closed-by-user',
  'auth/cancelled-popup-request',
  'auth/user-cancelled',
  'auth/redirect-cancelled-by-user',
]);

/** True for errors that mean the user chose to stop: nothing to explain. */
export function isSignInCancelled(err: unknown): boolean {
  const code = (err as { code?: unknown } | undefined)?.code;
  return typeof code === 'string' && CANCELLED_CODES.has(code);
}

const TRY_ANOTHER_METHOD =
  'Try again, or sign in with email or another method.';
const CONTACT_SUPPORT =
  "If it keeps happening, this site's sign-in setup may be wrong — please contact support.";

function hintsFor(code: string | undefined, host: string): string[] {
  switch (code) {
    case 'auth/unauthorized-domain':
      return [
        `This site (${host}) isn't allowed to use this sign-in method yet — please contact support.`,
        'Meanwhile, sign in with email or another method.',
      ];
    case 'auth/operation-not-allowed':
      return [
        "This sign-in method isn't enabled for this site — please contact support.",
        'Sign in with email or another method.',
      ];
    case 'auth/network-request-failed':
      return [
        'Check your internet connection and try again.',
        'A VPN, firewall or ad blocker may be blocking the sign-in service.',
      ];
    case 'auth/popup-blocked':
      return [
        'Your browser blocked the sign-in window. Allow pop-ups for this site and try again.',
      ];
    case 'auth/web-storage-unsupported':
      return [
        'Your browser blocks the storage sign-in needs (e.g. private mode or blocked cookies). Allow cookies and site data for this site, or use another browser.',
      ];
    case REDIRECT_RESULT_EMPTY:
      return [
        'Your browser may block third-party cookies or site storage (e.g. Safari, private mode). Allow them for this site and try again.',
        TRY_ANOTHER_METHOD,
        CONTACT_SUPPORT,
      ];
    default:
      return [TRY_ANOTHER_METHOD, CONTACT_SUPPORT];
  }
}

function summaryFor(providerId: string | undefined): string {
  return providerId
    ? `Sign-in with ${authProviderTitle(providerId)} didn't complete`
    : "Sign-in didn't complete";
}

const currentHost = (): string => globalThis.location?.host ?? '';

/** Explains a sign-in error, for a popup or a redirect. */
export function signInFailureFromError(
  err: unknown,
  providerId?: string,
  host = currentHost(),
): ISignInFailure {
  const e = err as
    | {
        code?: unknown;
        message?: unknown;
        customData?: { _tokenResponse?: { providerId?: string } };
      }
    | undefined;
  const code = typeof e?.code === 'string' ? e.code : undefined;
  const message =
    typeof e?.message === 'string'
      ? e.message
      : typeof err === 'string'
        ? err
        : undefined;
  const provider = providerId ?? e?.customData?._tokenResponse?.providerId;
  return {
    summary: summaryFor(provider),
    providerId: provider,
    code,
    message,
    host,
    hints: hintsFor(code, host),
  };
}

/** Explains a redirect that came back with no result and nobody signed in. */
export function silentRedirectSignInFailure(
  providerId: string,
  host = currentHost(),
): ISignInFailure {
  return {
    summary: summaryFor(providerId),
    providerId,
    code: REDIRECT_RESULT_EMPTY,
    message:
      'Returned from the sign-in provider, but no sign-in result was received.',
    host,
    hints: hintsFor(REDIRECT_RESULT_EMPTY, host),
  };
}
