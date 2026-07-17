export const SpaceTypeFamily = 'family';
export const SpaceTypePersonal = 'personal';

export type SpaceType =
  | 'family'
  | 'personal'
  | 'private' // reserved for future restricted-visibility spaces — do not use for personal/home spaces
  | 'company'
  | 'team'
  | 'parish'
  | 'educator'
  | 'realtor'
  | 'sport_club'
  | 'cohabit'
  | 'unknown';
