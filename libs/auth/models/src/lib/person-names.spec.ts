import {
  getFullName,
  isNameEmpty,
  mustHaveAtLeastOneName,
  namesToUrlParams,
  trimNames,
} from './person-names';

describe('person name helpers', () => {
  it('validates that at least one name is present', () => {
    expect(() => mustHaveAtLeastOneName()).toThrow('Names are required');
    expect(() => mustHaveAtLeastOneName({})).toThrow(
      'At least one name is required',
    );
    expect(() => mustHaveAtLeastOneName({ nickName: 'Al' })).not.toThrow();
  });

  it('serializes and encodes populated names', () => {
    expect(
      namesToUrlParams({
        firstName: 'Alex & Sam',
        lastName: 'Smith',
        middleName: 'Q',
        nickName: 'A/S',
        fullName: 'Alex Smith',
      }),
    ).toBe(
      'firstName=Alex%20%26%20Sam&lastName=Smith&middleName=Q&nickName=A%2FS&fullName=Alex%20Smith',
    );
    expect(namesToUrlParams()).toBe('');
  });

  it('detects, trims, and formats names', () => {
    expect(isNameEmpty()).toBe(true);
    expect(isNameEmpty({ firstName: '  ' })).toBe(true);
    expect(isNameEmpty({ firstName: 'Alex' })).toBe(false);
    expect(
      trimNames({
        firstName: ' Alex ',
        middleName: ' Q ',
        lastName: ' Smith ',
        fullName: ' Alex Q Smith ',
      }),
    ).toEqual({
      firstName: 'Alex',
      middleName: 'Q',
      lastName: 'Smith',
      fullName: 'Alex Q Smith',
    });
    expect(getFullName({ fullName: 'Alex Smith' })).toBe('Alex Smith');
    expect(
      getFullName({ firstName: 'Alex', lastName: 'Smith', nickName: 'Al' }),
    ).toBe('Alex Smith (Al)');
  });
});
