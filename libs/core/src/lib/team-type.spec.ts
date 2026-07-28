import { describe, it, expect } from 'vitest';
import {
  isSpaceType,
  parseSpaceType,
  SpaceTypeFamily,
  SpaceTypeGroup,
} from './team-type';

describe('team-type', () => {
  it('should have correct value for SpaceTypeFamily', () => {
    expect(SpaceTypeFamily).toBe('family');
  });

  it('should expose group as a concrete space type', () => {
    expect(SpaceTypeGroup).toBe('group');
    expect(isSpaceType(SpaceTypeGroup)).toBe(true);
    expect(parseSpaceType(SpaceTypeGroup)).toBe(SpaceTypeGroup);
  });

  it.each([
    'family',
    'personal',
    'company',
    'team',
    'parish',
    'educator',
    'realtor',
    'sport_club',
    'cohabit',
  ])('accepts existing concrete type %s', (value) => {
    expect(isSpaceType(value)).toBe(true);
    expect(parseSpaceType(value)).toBe(value);
  });

  it.each(['private', 'friends', 'unknown', '', null, undefined, 42])(
    'should reject %j at an external boundary',
    (value) => {
      expect(isSpaceType(value)).toBe(false);
      expect(parseSpaceType(value)).toBeUndefined();
    },
  );
});
