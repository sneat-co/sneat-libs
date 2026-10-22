import {
  AuthCredential,
  FacebookAuthProvider,
  GithubAuthProvider,
  GoogleAuthProvider,
  OAuthCredential,
  OAuthProvider,
} from 'firebase/auth';

/**
 * Firebase's error for "this email already has an account that signs in a
 * different way". The Sneat identity project allows one account per email, so
 * signing in with GitHub when the account was created with Google (or an
 * email link) fails with it.
 */
export const ACCOUNT_EXISTS_WITH_DIFFERENT_CREDENTIAL =
  'auth/account-exists-with-different-credential';

/** Where the credential waits for the user to sign in the usual way. */
export const PENDING_CREDENTIAL_LINK_STORAGE_KEY =
  'sneat:auth:pending-credential-link';

/**
 * How long a pending credential is kept. Long enough to finish an email-link
 * sign-in in another tab; short enough that a forgotten one does not link on
 * some unrelated later sign-in.
 */
export const PENDING_CREDENTIAL_LINK_TTL_MS = 30 * 60 * 1000;

/** A provider credential to attach to the account once the user signs in. */
export interface IPendingCredentialLink {
  readonly providerId: string;
  readonly email?: string;
  readonly createdAt: number;
  /** `OAuthCredential.toJSON()` — restored with `OAuthCredential.fromJSON()`. */
  readonly credential: object;
}

interface IAuthErrorShape {
  readonly code?: string;
  readonly customData?: {
    readonly email?: string;
    readonly _tokenResponse?: { readonly providerId?: string };
  };
}

export function isAccountExistsWithDifferentCredential(err: unknown): boolean {
  return (
    (err as IAuthErrorShape | undefined)?.code ===
    ACCOUNT_EXISTS_WITH_DIFFERENT_CREDENTIAL
  );
}

function credentialFromError(
  err: IAuthErrorShape,
): OAuthCredential | AuthCredential | null {
  const providerId = err.customData?._tokenResponse?.providerId;
  // Each provider class only knows how to read its own token response.
  switch (providerId) {
    case 'github.com':
      return GithubAuthProvider.credentialFromError(err as never);
    case 'google.com':
      return GoogleAuthProvider.credentialFromError(err as never);
    case 'facebook.com':
      return FacebookAuthProvider.credentialFromError(err as never);
    default:
      return OAuthProvider.credentialFromError(err as never);
  }
}

/**
 * Reads the credential Firebase hands back with an
 * `account-exists-with-different-credential` error, or undefined for any other
 * error (or when Firebase gave no usable credential).
 */
export function pendingCredentialLinkFromError(
  err: unknown,
  now = Date.now(),
): IPendingCredentialLink | undefined {
  if (!isAccountExistsWithDifferentCredential(err)) {
    return undefined;
  }
  const authError = err as IAuthErrorShape;
  const credential = credentialFromError(authError);
  if (!credential) {
    return undefined;
  }
  return {
    providerId: credential.providerId,
    email: authError.customData?.email,
    createdAt: now,
    credential: credential.toJSON(),
  };
}

function storage(): Storage | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

export function savePendingCredentialLink(link: IPendingCredentialLink): void {
  try {
    storage()?.setItem(
      PENDING_CREDENTIAL_LINK_STORAGE_KEY,
      JSON.stringify(link),
    );
  } catch {
    // Storage blocked: the user can still connect the provider from settings.
  }
}

export function clearPendingCredentialLink(): void {
  try {
    storage()?.removeItem(PENDING_CREDENTIAL_LINK_STORAGE_KEY);
  } catch {
    // nothing to clear
  }
}

/** The stored pending link, or undefined when there is none or it expired. */
export function loadPendingCredentialLink(
  now = Date.now(),
): IPendingCredentialLink | undefined {
  let link: IPendingCredentialLink | undefined;
  try {
    const json = storage()?.getItem(PENDING_CREDENTIAL_LINK_STORAGE_KEY);
    link = json ? (JSON.parse(json) as IPendingCredentialLink) : undefined;
  } catch {
    link = undefined;
  }
  if (
    !link?.providerId ||
    !link.credential ||
    typeof link.createdAt !== 'number' ||
    now - link.createdAt > PENDING_CREDENTIAL_LINK_TTL_MS
  ) {
    if (link) {
      clearPendingCredentialLink();
    }
    return undefined;
  }
  return link;
}

/** Restores the Firebase credential saved in a pending link. */
export function credentialOfPendingLink(
  link: IPendingCredentialLink,
): OAuthCredential | undefined {
  return OAuthCredential.fromJSON(link.credential) ?? undefined;
}

/** A human name for a provider ID, for messages. */
export function authProviderTitle(providerId: string): string {
  switch (providerId) {
    case 'github.com':
      return 'GitHub';
    case 'google.com':
      return 'Google';
    case 'facebook.com':
      return 'Facebook';
    case 'microsoft.com':
      return 'Microsoft';
    case 'apple.com':
      return 'Apple';
    default:
      return providerId;
  }
}
