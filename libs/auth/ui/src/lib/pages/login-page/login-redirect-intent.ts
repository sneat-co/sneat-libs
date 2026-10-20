import { safeAuthReturnPath } from './safe-auth-return-path';

const storageKey = 'sneat.auth.login-redirect-intent';
const maxAgeMs = 10 * 60 * 1000;

export interface LoginRedirectIntent {
  readonly returnTo?: string;
}

export function markLoginRedirectIntent(returnTo?: string): void {
  try {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.setItem(
      storageKey,
      JSON.stringify({ createdAt: Date.now(), returnTo: safeAuthReturnPath(returnTo) }),
    );
  } catch {
    // Storage may be unavailable in private browsing; auth still works.
  }
}

export function consumeLoginRedirectIntent(): LoginRedirectIntent | undefined {
  try {
    if (typeof sessionStorage === 'undefined') return undefined;
    const value = sessionStorage.getItem(storageKey);
    sessionStorage.removeItem(storageKey);
    if (!value) return undefined;

    const intent = JSON.parse(value) as {
      createdAt?: unknown;
      returnTo?: unknown;
    };
    const age = Date.now() - Number(intent.createdAt);
    if (!Number.isFinite(age) || age < 0 || age > maxAgeMs) return undefined;
    return { returnTo: safeAuthReturnPath(intent.returnTo as string | undefined) };
  } catch {
    return undefined;
  }
}

export function clearLoginRedirectIntent(): void {
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(storageKey);
    }
  } catch {
    // Storage may be unavailable in private browsing; auth still works.
  }
}
