import {
  addRelatedItem,
  getLongRelatedItemID,
  getRelatedItemByIDs,
  getRelatedItemByKey,
  getRelatedItemIDs,
  getRelatedItems,
  hasRelated,
  ISpaceModuleItemRef,
  IRelatedModules,
  removeRelatedItem,
  validateRelated,
} from './with-related';

// sneat-specs Decision 0002 (spaceless system namespace): the presence/absence
// of the "@{spaceID}" suffix is the sole discriminator between a space-bound ref
// and a spaceless system-namespace ref.
// https://github.com/sneat-co/sneat-specs/blob/main/spec/decisions/0002-reserved-extension-space-ids.md

const spaceBoundKey: ISpaceModuleItemRef = {
  module: 'contactus',
  collection: 'contacts',
  spaceID: 'space1',
  itemID: 'item1',
};

const systemKey: ISpaceModuleItemRef = {
  module: 'contactus',
  collection: 'contacts',
  itemID: 'item1',
};

describe('getLongRelatedItemID', () => {
  it('appends @spaceID for a space-bound ref', () => {
    expect(getLongRelatedItemID('item1', 'space1')).toBe('item1@space1');
  });

  it('omits the suffix for the system namespace (empty spaceID)', () => {
    expect(getLongRelatedItemID('item1', '')).toBe('item1');
  });

  it('omits the suffix for the system namespace (undefined spaceID)', () => {
    expect(getLongRelatedItemID('item1')).toBe('item1');
  });
});

describe('addRelatedItem / hasRelated / removeRelatedItem', () => {
  it('adds, finds and removes a system-namespace (spaceless) related item', () => {
    let related = addRelatedItem(undefined, systemKey);
    expect(hasRelated(related, systemKey)).toBe(true);
    // stored under the bare itemID (no "@" suffix)
    expect(related?.['contactus']?.['contacts']?.['item1']).toBeDefined();
    related = removeRelatedItem(related, systemKey);
    expect(hasRelated(related, systemKey)).toBe(false);
  });

  it('adds, finds and removes a space-bound related item', () => {
    let related = addRelatedItem(undefined, spaceBoundKey);
    expect(hasRelated(related, spaceBoundKey)).toBe(true);
    related = removeRelatedItem(related, spaceBoundKey);
    expect(hasRelated(related, spaceBoundKey)).toBe(false);
  });

  it('returns related unchanged when removing from undefined / missing', () => {
    expect(removeRelatedItem(undefined, systemKey)).toBeUndefined();
    expect(hasRelated(undefined, systemKey)).toBe(false);
  });
});

describe('getRelatedItems / getRelatedItemByKey / getRelatedItemByIDs', () => {
  const related: IRelatedModules = {
    contactus: {
      contacts: {
        item1: { rolesOfItem: { parent: { created: { by: 'u1', at: 't' } } } },
        'item2@space2': {},
      },
    },
  };

  it('getRelatedItems returns the collection map', () => {
    expect(Object.keys(getRelatedItems('contactus', 'contacts', related))).toEqual(
      ['item1', 'item2@space2'],
    );
    expect(getRelatedItems('missing', 'contacts', related)).toEqual({});
  });

  it('getRelatedItemByKey resolves a bare (system-namespace) item', () => {
    expect(getRelatedItemByKey(related, systemKey)).toBeDefined();
  });

  it('getRelatedItemByIDs resolves the long id when a space is given', () => {
    const items = related['contactus']['contacts'];
    expect(getRelatedItemByIDs(items, 'item2', 'space2')).toBeDefined();
    expect(getRelatedItemByIDs(items, 'item1')).toBeDefined();
  });
});

describe('getRelatedItemIDs', () => {
  const related: IRelatedModules = {
    contactus: {
      contacts: {
        item1: {},
        'item2@space2': {},
      },
    },
  };

  it('returns all ids when no space filter is given', () => {
    expect(getRelatedItemIDs(related, 'contactus', 'contacts')).toEqual([
      'item1',
      'item2@space2',
    ]);
  });

  it('filters to bare ids and the matching @space when a space is given', () => {
    expect(getRelatedItemIDs(related, 'contactus', 'contacts', 'space2')).toEqual([
      'item1',
      'item2@space2',
    ]);
  });

  it('returns [] for undefined related', () => {
    expect(getRelatedItemIDs(undefined, 'contactus', 'contacts')).toEqual([]);
  });
});

describe('validateRelated', () => {
  it('accepts undefined and valid related maps', () => {
    expect(() => validateRelated(undefined)).not.toThrow();
    expect(() =>
      validateRelated({ contactus: { contacts: { item1: {} } } }),
    ).not.toThrow();
  });
});
