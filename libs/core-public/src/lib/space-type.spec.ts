import { groupKinds, isGroupKind } from './space-type';

describe('GroupKind', () => {
  it.each(['general', 'friends', 'event', 'housemates'])(
    'accepts %s',
    (kind) => expect(isGroupKind(kind)).toBe(true),
  );

  it.each(['', 'house', 'family', undefined, null])('rejects %s', (kind) => {
    expect(isGroupKind(kind)).toBe(false);
  });

  it('keeps the public values explicit', () => {
    expect(groupKinds).toEqual(['general', 'friends', 'event', 'housemates']);
  });
});
