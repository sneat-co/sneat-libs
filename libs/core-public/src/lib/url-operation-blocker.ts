import { inject, Injectable, InjectionToken } from '@angular/core';

export const SNEAT_BLOCKABLE_OPERATIONS = [
  'auth',
  'server-requests',
] as const;

export type SneatBlockableOperation =
  (typeof SNEAT_BLOCKABLE_OPERATIONS)[number];

const isSneatBlockableOperation = (
  value: string,
): value is SneatBlockableOperation =>
  SNEAT_BLOCKABLE_OPERATIONS.some((operation) => operation === value);

/** Parses diagnostic blockers from a URL fragment such as
 * `#block=auth,server-requests&block=auth`. Unknown operations are ignored. */
export function parseSneatBlockedOperations(
  hash: string,
): ReadonlySet<SneatBlockableOperation> {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const blocked = new Set<SneatBlockableOperation>();
  for (const value of params.getAll('block')) {
    for (const candidate of value.split(',').map((item) => item.trim())) {
      if (isSneatBlockableOperation(candidate)) {
        blocked.add(candidate);
      }
    }
  }
  return blocked;
}

/** Snapshot of the URL fragment used by diagnostic operation blocking.
 * The browser reads it once when the root service is created; SSR gets an
 * empty value. Override the token in tests instead of mutating global state. */
export const SNEAT_URL_HASH = new InjectionToken<string>('SNEAT_URL_HASH', {
  providedIn: 'root',
  factory: () => (typeof location === 'undefined' ? '' : location.hash),
});

@Injectable({ providedIn: 'root' })
export class SneatUrlOperationBlocker {
  private readonly blocked = parseSneatBlockedOperations(
    inject(SNEAT_URL_HASH),
  );

  isBlocked(operation: SneatBlockableOperation): boolean {
    return this.blocked.has(operation);
  }
}
