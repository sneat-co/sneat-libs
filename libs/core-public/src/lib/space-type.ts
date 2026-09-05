// Kept in step with sneat-go-core/coretypes (decision 0006, unified space
// registration): club/space/spot/system are real backend types this union was
// missing — a club app could not even TYPE its own space kind — and
// community-center is retired (a centre registers as company; the
// communitycentrum module marker says what the space is for).
//
// team/parish/educator/realtor/sport_club/cohabit predate the backend enum and
// survive here because legacy UI still branches on them; the backend rejects
// them at creation.
export type SpaceType =
  | 'family'
  | 'personal'
  | 'group'
  | 'company'
  | 'club'
  | 'space'
  | 'spot'
  | 'system'
  | 'team'
  | 'parish'
  | 'educator'
  | 'realtor'
  | 'sport_club'
  | 'cohabit'
  | 'unknown';

export const groupKinds = [
  'general',
  'friends',
  'event',
  'housemates',
] as const;

/** A purpose-specific subtype of a group space. Omitted means a legacy/general group. */
export type GroupKind = (typeof groupKinds)[number];

export const isGroupKind = (value: unknown): value is GroupKind =>
  typeof value === 'string' && groupKinds.includes(value as GroupKind);
