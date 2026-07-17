export const SpaceTypeFamily = 'family';
export const SpaceTypePersonal = 'personal';

// A restricted-visibility space type may be introduced later if a real use
// case arises; it was intentionally left out to avoid confusion with 'personal'.
export type SpaceType =
  | 'family'
  | 'personal'
  | 'company'
  | 'team'
  | 'parish'
  | 'educator'
  | 'realtor'
  | 'sport_club'
  | 'cohabit'
  | 'unknown';
