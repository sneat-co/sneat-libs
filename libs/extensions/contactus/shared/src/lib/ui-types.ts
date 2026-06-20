import {
  IContactGroupBrief,
  IContactRoleWithIdAndBrief,
  IContactWithCheck,
} from '@sneat/extension-contactus-contract';

export interface IContactRoleWithContacts extends IContactRoleWithIdAndBrief {
  readonly contacts: readonly IContactWithCheck[] | undefined;
}

export interface IContactGroupWithContacts {
  readonly id: string;
  readonly brief: IContactGroupBrief;
  readonly roles: IContactRoleWithContacts[];
}
