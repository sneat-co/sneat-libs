export interface ISneatExtension {
  id: string;
  title: string;
  emoji: string;
}

const assetsExtension: ISneatExtension = {
  id: 'assets',
  title: 'Assets',
  emoji: '🏡',
};

// const contactsExtension: ISneatExtension = {
// 	id: 'contacts',
// 	title: 'Contacts',
// 	emoji: '📇'
// }

const documentsExtension: ISneatExtension = {
  id: 'documents',
  title: 'Documents',
  emoji: '📄',
};

const sizesExtension: ISneatExtension = {
  id: 'sizes',
  title: 'Sizes',
  emoji: '📏',
};

const calendariusExtension: ISneatExtension = {
  id: 'calendarius',
  title: 'Calendar',
  emoji: '🗓️',
};

export const defaultFamilyExtension: ISneatExtension[] = [
  assetsExtension,
  calendariusExtension,
  documentsExtension,
  sizesExtension,
];

export const defaultFamilyMemberExtensions: ISneatExtension[] = [
  assetsExtension,
  calendariusExtension,
  documentsExtension,
  sizesExtension,
];
