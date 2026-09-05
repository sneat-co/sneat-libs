import { SpaceType } from '@sneat/core-public';

export type { GroupKind, SpaceType } from '@sneat/core-public';
export { groupKinds, isGroupKind } from '@sneat/core-public';

export const SpaceTypeFamily = 'family';
export const SpaceTypePersonal = 'personal';
export const SpaceTypeGroup = 'group';

// A restricted-visibility space type may be introduced later if a real use
// case arises; it was intentionally left out to avoid confusion with 'personal'.
const concreteSpaceTypes = new Set<Exclude<SpaceType, 'unknown'>>([
  SpaceTypeFamily,
  SpaceTypePersonal,
  SpaceTypeGroup,
  'company',
  'team',
  'parish',
  'educator',
  'realtor',
  'sport_club',
  'cohabit',
  // Backend types this set was missing (decision 0006): a space/club URL
  // segment must parse as its real type. community-center is retired — a
  // centre registers as company.
  'club',
  'space',
  'spot',
]);

/** Returns whether a value is a concrete space type accepted at an external boundary. */
export function isSpaceType(
  value: unknown,
): value is Exclude<SpaceType, 'unknown'> {
  return (
    typeof value === 'string' &&
    concreteSpaceTypes.has(value as Exclude<SpaceType, 'unknown'>)
  );
}

/** Parses a concrete space type from untyped external input. */
export function parseSpaceType(value: unknown): Exclude<SpaceType, 'unknown'> | undefined {
  return isSpaceType(value) ? value : undefined;
}
