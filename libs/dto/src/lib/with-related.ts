import { IWithCreatedShort } from './dto-with-modified';

export interface IRelatedItemKey {
  readonly itemID: string;
  readonly spaceID?: string;
  readonly subPath?: string;
}

// specscore: decisions/0002-reserved-extension-space-ids
// See sneat-specs Decision 0002:
// https://github.com/sneat-co/sneat-specs/blob/main/spec/decisions/0002-reserved-extension-space-ids.md
export interface ISpaceModuleItemRef {
  readonly module: string;
  readonly collection: string;
  // spaceID is optional: an empty/undefined spaceID denotes the spaceless
  // system namespace (record stored at /ext/{ext-id}/...). A non-empty spaceID
  // denotes a space-bound record at /spaces/{space-id}/ext/{ext-id}/...
  // (sneat-specs Decision 0002).
  readonly spaceID?: string;
  readonly itemID: string;
  // Optional stable-key path inside the document, e.g. /items/@id=item-123.
  // The owner resolves and authorizes it; array positions are never identities.
  readonly subPath?: string;
}

export interface IRelationshipRole {
  readonly created: IWithCreatedShort;
}

export type WritableRelationshipRoles = Record<string, IRelationshipRole>;
// {
// 	// -readonly [K in keyof IRelationshipRoles]: IRelationshipRoles[K];
// };
export type IRelationshipRoles = Readonly<WritableRelationshipRoles>;

export interface IRelatedItem {
  // readonly keys: readonly IRelatedItemKey[];
  readonly rolesOfItem?: IRelationshipRoles; // if related item is a child of the current record, then rolesOfItem = {"child": ...}
  readonly rolesToItem?: IRelationshipRoles; // if related item is a child of the current contact, then rolesToItem = {"parent": ...}
  // Embedded relationships share the containing document key without being
  // mistaken for a relationship to the document itself.
  readonly subPaths?: Readonly<Record<string, IRelatedItem>>;
}

export type IRelatedItems = Readonly<Record<string, IRelatedItem>>;
export type IRelatedCollections = Readonly<Record<string, IRelatedItems>>;
export type IRelatedModules = Readonly<Record<string, IRelatedCollections>>;

export interface IRelatedTo extends IWithRelatedOnly {
  readonly key: ISpaceModuleItemRef;
  readonly title: string; // pass empty string if you don't want to display name
}

export function getRelatedItems(
  moduleId: string,
  collectionId: string,
  related?: IRelatedModules,
): IRelatedItems {
  return (related && related[moduleId]?.[collectionId]) || {};
}

export interface IWithRelatedOnly {
  readonly related?: IRelatedModules;
}

export function validateRelated(related?: IRelatedModules): void {
  if (!related) {
    return;
  }
  Object.entries(related).forEach(([, collections]) => {
    Object.entries(collections).forEach(([, items]) => {
      if (!items) {
        return;
      }
      Object.entries(items).forEach(([itemID]) => {
        if (!itemID) {
          throw new Error('ItemID is not set');
        }
      });
    });
  });
}

export interface IWithRelatedAndRelatedIDs extends IWithRelatedOnly {
  readonly relatedIDs?: readonly string[];
}

export const addRelatedItem = (
  related: IRelatedModules | undefined,
  key: ISpaceModuleItemRef,
  rolesOfItem?: IRelationshipRoles,
) => {
  related = related || {};
  let collectionRelated = related[key.module] || {};
  let relatedItems = collectionRelated[key.collection] || {};
  if (!hasRelated(related, key)) {
    const storedKey = relatedStorageKey(relatedItems, key);
    const parent = relatedItems[storedKey];
    relatedItems = {
      ...relatedItems,
      [storedKey]: key.subPath
        ? {
            ...parent,
            subPaths: { ...parent?.subPaths, [key.subPath]: { rolesOfItem } },
          }
        : {
            ...parent,
            rolesOfItem: rolesOfItem ?? (parent?.subPaths ? {} : undefined),
          },
    };
    collectionRelated = {
      ...collectionRelated,
      [key.collection]: relatedItems,
    };
    related = { ...related, [key.module]: collectionRelated };
  }
  return related;
};

export const removeRelatedItem = (
  related: IRelatedModules | undefined,
  key: ISpaceModuleItemRef,
) => {
  if (!related) {
    return related;
  }
  let collectionRelated = related[key.module];
  if (!collectionRelated) {
    return related;
  }
  const relatedItems = collectionRelated[key.collection];
  if (!relatedItems) {
    return related;
  }
  if (hasRelated(related, key)) {
    const collectionItems = { ...relatedItems };
    const storedKey = relatedStorageKey(relatedItems, key);
    const parent = collectionItems[storedKey];
    if (key.subPath && parent?.subPaths) {
      const subPaths = { ...parent.subPaths };
      delete subPaths[key.subPath];
      const { subPaths: previousPaths, ...documentLink } = parent;
      void previousPaths;
      if (Object.keys(subPaths).length) {
        collectionItems[storedKey] = { ...documentLink, subPaths };
      } else if (documentLink.rolesOfItem || documentLink.rolesToItem) {
        collectionItems[storedKey] = documentLink;
      } else {
        delete collectionItems[storedKey];
      }
    } else if (parent?.subPaths && Object.keys(parent.subPaths).length) {
      collectionItems[storedKey] = { subPaths: parent.subPaths };
    } else {
      delete collectionItems[storedKey];
    }
    collectionRelated = {
      ...collectionRelated,
      [key.collection]: collectionItems,
    };
    related = { ...related, [key.module]: collectionRelated };
  }
  return related;
};

// specscore: decisions/0002-reserved-extension-space-ids
// Omit the "@{spaceID}" suffix for the spaceless system namespace. See
// sneat-specs Decision 0002:
// https://github.com/sneat-co/sneat-specs/blob/main/spec/decisions/0002-reserved-extension-space-ids.md
export const getLongRelatedItemID = (itemID: string, spaceID?: string) =>
  spaceID ? `${itemID}@${spaceID}` : itemID;

export const getRelatedItemByIDs = (
  relatedItems: Readonly<Record<string, IRelatedItem>> | undefined,
  itemID: string,
  spaceID?: string,
) =>
  relatedItems &&
  (relatedItems[itemID] ||
    (spaceID && relatedItems[getLongRelatedItemID(itemID, spaceID)]));

export const getRelatedItemByKey = (
  related: IRelatedModules | undefined,
  key: ISpaceModuleItemRef,
): IRelatedItem | undefined => {
  const items = related?.[key.module]?.[key.collection];
  const { itemID, spaceID } = key;
  const item = getRelatedItemByIDs(items, itemID, spaceID);
  return key.subPath ? item?.subPaths?.[key.subPath] : documentRelationship(item);
};

export const getRelatedItemIDs = (
  related: IRelatedModules | undefined,
  module: string,
  collection: string,
  spaceID?: string,
): readonly string[] => {
  if (!related) {
    return [];
  }
  // console.log('getRelatedItemIDs', module, collection, spaceID, related);
  const collectionRelated = (related || {})[module] || {};
  const relatedItems = collectionRelated[collection];
  // A subPaths-only entry shares its storage key with the containing document
  // without being a relationship to the document itself (see
  // `documentRelationship`); exclude it here so this list stays consistent
  // with `hasRelated`/`getRelatedItemByKey` for the same, no-subPath key.
  const keys = Object.keys(relatedItems).filter((k) =>
    documentRelationship(relatedItems[k]),
  );
  return spaceID
    ? keys.filter((k) => !k.includes('@') || k.endsWith(`@${spaceID}`))
    : keys;
};

export const hasRelated = (
  related: IRelatedModules | undefined,
  key: ISpaceModuleItemRef,
): boolean => {
  if (!related) {
    return false;
  }
  const collectionRelated = (related || {})[key.module] || {};
  const relatedItems = collectionRelated[key.collection];
  return hasRelatedItem(relatedItems, key);
};

const hasRelatedItem = (
  relatedItems: IRelatedItems,
  itemKey: IRelatedItemKey,
): boolean => {
  const { itemID, spaceID } = itemKey;
  const item = getRelatedItemByIDs(relatedItems, itemID, spaceID);
  return !!(itemKey.subPath
    ? item?.subPaths?.[itemKey.subPath]
    : documentRelationship(item));
};

const documentRelationship = (item: IRelatedItem | undefined) =>
  item?.subPaths && !item.rolesOfItem && !item.rolesToItem ? undefined : item;

const relatedStorageKey = (items: IRelatedItems, key: IRelatedItemKey): string => {
  if (items[key.itemID]) return key.itemID;
  const qualified = getLongRelatedItemID(key.itemID, key.spaceID);
  return items[qualified] || key.subPath ? qualified : key.itemID;
};
