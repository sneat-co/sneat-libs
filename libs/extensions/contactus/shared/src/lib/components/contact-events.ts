import {
  ContactGroupWithIdAndBrief,
  IContactRoleWithIdAndBrief,
} from '@sneat/extension-contactus-contract';

export interface IContactAddEventArgs {
  event: Event;
  group?: ContactGroupWithIdAndBrief;
  role?: IContactRoleWithIdAndBrief;
}
