import { GroupKind, SpaceType } from '@sneat/core';

export interface ISpaceBrief {
  readonly title: string;
  readonly type: SpaceType;
  readonly groupKind?: GroupKind;
  readonly parentSpaceID?: string;
  readonly roles?: string[];
}

export const equalSpaceBriefs = (
  v1?: ISpaceBrief | null | undefined,
  v2?: ISpaceBrief | null | undefined,
): boolean => {
  if (v1 === v2) return true;
  return (
    v1?.parentSpaceID === v2?.parentSpaceID &&
    v1?.title === v2?.title &&
    v1?.type === v2?.type &&
    v1?.groupKind === v2?.groupKind
  );
};

export const isSpaceSupportsMemberGroups = (t: SpaceType): boolean => {
  return t === 'educator' || t === 'sport_club' || t === 'cohabit';
};
