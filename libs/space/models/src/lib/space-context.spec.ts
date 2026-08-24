import { signal } from '@angular/core';
import {
  computeSpaceIdFromSpaceRef,
  computeSpaceRefFromSpaceContext,
  createShortSpaceInfoFromDbo,
  ISpaceContext,
  spaceContextFromBrief,
  zipMapBriefsWithIDs,
  zipMapBriefsWithIDsAndSpaceRef,
} from './space-context';

describe('space context helpers', () => {
  const space = { id: 'space-1', type: 'family' } as ISpaceContext;

  it('zips keyed briefs with IDs and space references', () => {
    expect(zipMapBriefsWithIDs({ one: { title: 'One' } })).toEqual([
      { id: 'one', brief: { title: 'One' } },
    ]);
    expect(zipMapBriefsWithIDs()).toEqual([]);
    expect(
      zipMapBriefsWithIDsAndSpaceRef(space, { one: { title: 'One' } }),
    ).toEqual([{ id: 'one', brief: { title: 'One' }, space }]);
    expect(zipMapBriefsWithIDsAndSpaceRef(space)).toEqual([]);
  });

  it('computes stable space references and IDs', () => {
    const context = signal<ISpaceContext | undefined>(space);
    expect(computeSpaceRefFromSpaceContext(context)()).toEqual({
      id: 'space-1',
      type: 'family',
    });
    context.set(undefined);
    expect(computeSpaceRefFromSpaceContext(context)()).toEqual({ id: '' });
    expect(computeSpaceIdFromSpaceRef(() => space)()).toBe('space-1');
  });

  it('creates contexts and short space info', () => {
    const brief = { title: 'Home', type: 'family' } as ISpaceContext['brief'];
    const context = spaceContextFromBrief('space-1', brief!);
    expect(context).toEqual({ id: 'space-1', type: 'family', brief });
    expect(createShortSpaceInfoFromDbo(context)).toEqual({
      id: 'space-1',
      type: 'family',
      title: 'Home',
    });
    expect(() =>
      createShortSpaceInfoFromDbo({ id: 'space-2' } as ISpaceContext),
    ).toThrow('!team.type');
  });
});
