/**
 * Device list of public referral codes (backstage spec videoroomius-referrals).
 *
 * A referral code is a public Invitus invite ID that grants nothing and has no
 * PIN. The device keeps at most MAX_REFERRAL_CODES of them, each with the
 * channel it came through and when it was opened. The product sends them with
 * its fix-point request (AMAStage: create_show, the creator's first "New
 * show"), where the server fixes the last valid one; the caller then clears
 * the list with clearReferralCodes once that request succeeds.
 *
 * This list NEVER holds a join invite (an invite ID with a PIN) or any other
 * security code: a join invite is acted on only on the page its link opens, or
 * by typing its code in. A URL that carries `invite` or `pin` is refused whole.
 *
 * Inert until an app calls captureReferralFromUrl / rememberReferralCode.
 * Storage failures are ignored: sign-in never depends on this list.
 */

export const MAX_REFERRAL_CODES = 10;
export const REFERRAL_CODE_MAX_AGE_DAYS = 30;
/** Browser storage is scoped to the current origin; the server validates the product. */
export const REFERRAL_CODES_STORAGE_KEY = 'sneat.referral-codes';

const referralCodePattern = /^mi_[A-Za-z0-9_-]{32}$/;
const referralSourcePattern = /^[a-z0-9_-]{1,32}$/;
const maxAgeMs = REFERRAL_CODE_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
/** Recognize decoded credential keys, including namespaced and bracketed form fields. */
const joinCredentialKey = /(?:^|[^a-z0-9])(?:invite|pin)(?:$|[^a-z0-9])/i;

export interface IReferralCode {
  readonly code: string;
  readonly source?: string;
  /** ISO 8601 time the code was opened on this device. */
  readonly at: string;
}

export function isReferralCode(value: unknown): value is string {
  return typeof value === 'string' && referralCodePattern.test(value);
}

function isReferralSource(value: unknown): value is string {
  return typeof value === 'string' && referralSourcePattern.test(value);
}

function isFresh(at: string, now: Date): boolean {
  const age = now.getTime() - Date.parse(at);
  return Number.isFinite(age) && age >= 0 && age <= maxAgeMs;
}

/** Keeps only well-formed, fresh, distinct entries, newest last, at most the cap. */
function sanitize(value: unknown, now: Date): IReferralCode[] {
  if (!Array.isArray(value)) return [];
  const byCode = new Map<string, IReferralCode>();
  for (const item of value as unknown[]) {
    const entry = item as Partial<IReferralCode> | null;
    if (
      !entry ||
      !isReferralCode(entry.code) ||
      typeof entry.at !== 'string' ||
      !isFresh(entry.at, now)
    ) {
      continue;
    }
    const at = new Date(entry.at).toISOString();
    byCode.delete(entry.code);
    byCode.set(
      entry.code,
      isReferralSource(entry.source)
        ? { code: entry.code, source: entry.source, at }
        : { code: entry.code, at },
    );
  }
  return [...byCode.values()].slice(-MAX_REFERRAL_CODES);
}

/** Reads the device list, dropping anything malformed or older than 30 days. */
export function readReferralCodes(now: Date = new Date()): IReferralCode[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(REFERRAL_CODES_STORAGE_KEY);
    return raw ? sanitize(JSON.parse(raw), now) : [];
  } catch {
    return [];
  }
}

/**
 * Adds a referral code at the end of the list (a code already there moves to
 * the end); the oldest entries drop off past MAX_REFERRAL_CODES. Returns false,
 * writing nothing, for anything that is not a referral code.
 */
export function rememberReferralCode(
  code: string,
  source?: string,
  now: Date = new Date(),
): boolean {
  if (!isReferralCode(code)) return false;
  const entry: IReferralCode = isReferralSource(source)
    ? { code, source, at: now.toISOString() }
    : { code, at: now.toISOString() };
  const list = readReferralCodes(now).filter((c) => c.code !== code);
  list.push(entry);
  try {
    if (typeof localStorage === 'undefined') return false;
    localStorage.setItem(
      REFERRAL_CODES_STORAGE_KEY,
      JSON.stringify(list.slice(-MAX_REFERRAL_CODES)),
    );
    return true;
  } catch {
    return false; // private browsing or full storage: sign-in still works
  }
}

/**
 * Remembers `?ref=<code>&src=<channel>` from a landing URL. A URL that carries
 * a join invite (`invite` or `pin`) is refused whole: nothing is stored.
 */
export function captureReferralFromUrl(
  url: string | URL,
  now: Date = new Date(),
): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url.toString(), 'https://sneat.invalid');
  } catch {
    return false;
  }
  // A public referral uses the query. The fragment may contain private login
  // return paths or hash-router parameters that the URL parser does not split.
  if (parsed.hash || parsed.username || parsed.password) return false;
  for (const name of parsed.searchParams.keys()) {
    if (joinCredentialKey.test(name)) return false;
  }
  const code = parsed.searchParams.get('ref');
  return (
    code !== null &&
    rememberReferralCode(code, parsed.searchParams.get('src') ?? undefined, now)
  );
}

export function clearReferralCodes(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(REFERRAL_CODES_STORAGE_KEY);
    }
  } catch {
    // Storage may be unavailable; nothing to clear then.
  }
}
