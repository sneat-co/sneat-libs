import { describe, expect, it } from 'vitest';
import { addRelatedItem, getRelatedItemByKey, hasRelated, removeRelatedItem } from './with-related';

describe('embedded Linkage relationships', () => {
  const parent = { module: 'listus', collection: 'lists', itemID: 'list1' };
  const first = { ...parent, subPath: '/items/@id=first' };
  const second = { ...parent, subPath: '/items/@id=second' };

  it('keeps two item links distinct and preserves the containing document link', () => {
    const initial = addRelatedItem(undefined, first);
    expect(hasRelated(initial, first)).toBe(true);
    expect(hasRelated(initial, parent)).toBe(false);
    expect(hasRelated(initial, second)).toBe(false);
    const both = addRelatedItem(initial, second);
    const withParent = addRelatedItem(both, parent);
    expect(getRelatedItemByKey(withParent, first)).toEqual({ rolesOfItem: undefined });
    expect(hasRelated(withParent, second)).toBe(true);
    expect(hasRelated(withParent, parent)).toBe(true);
    expect(removeRelatedItem(withParent, parent)).toEqual(both);
    const onlyParent = removeRelatedItem(removeRelatedItem(withParent, first), second);
    expect(hasRelated(onlyParent, parent)).toBe(true);
    expect(hasRelated(onlyParent, first)).toBe(false);
    expect(hasRelated(initial, first)).toBe(true);
  });

  it('removes only the requested subpath and handles explicit Space references', () => {
    const qualified = { ...first, spaceID: 'space1' };
    const links = addRelatedItem(undefined, qualified);
    expect(links.listus.lists['list1@space1'].subPaths?.[first.subPath]).toBeDefined();
    expect(hasRelated(links, qualified)).toBe(true);
    expect(hasRelated(links, { ...qualified, spaceID: 'space2' })).toBe(false);
    const removed = removeRelatedItem(links, qualified);
    expect(hasRelated(removed, qualified)).toBe(false);
    expect(Object.keys(removed?.listus.lists || {})).toEqual([]);
  });
});
