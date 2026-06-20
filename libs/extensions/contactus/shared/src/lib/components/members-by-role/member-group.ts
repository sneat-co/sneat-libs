import {
  IContactWithBriefAndSpace,
  MemberGroupType,
} from '@sneat/extension-contactus-contract';

export interface MemberGroup {
  readonly id: MemberGroupType;
  readonly role: string;
  readonly emoji: string;
  readonly plural: string;
  readonly addLabel: string;
  readonly contacts?: readonly IContactWithBriefAndSpace[];
}
