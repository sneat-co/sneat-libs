import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { IIdAndBriefAndOptionalDbo, ISpaceRef } from '@sneat/core';
import {
  ISpaceContext,
  ISpaceItemWithOptionalBriefAndOptionalDbo,
} from '@sneat/space-models';
import { IContactBrief, IContactDbo } from './dto';
import { IContactWithDboAndSpace } from './dto';
import { ContactRole, MemberRole } from './dto';
import { IContactContext } from './contexts';
import { ICreateContactRequest } from './apidto/requests';
import {
  IAddContactCommChannelRequest,
  IContactCommChannelRequest,
  IContactRequest,
  IContactRequestWithOptionalMessage,
  ISetContactsStatusRequest,
  IUpdateContactCommChannelRequest,
  IUpdateContactRequest,
} from './dto/contact-requests';

export interface IChangeMemberRoleRequest {
  readonly spaceID: string;
  readonly contactID: string;
  readonly role: MemberRole;
}

export interface IContactsFilter {
  status?: string;
  role?: ContactRole;
}

export interface IContactService {
  createContact(
    spaceRef: ISpaceRef,
    request: ICreateContactRequest,
    endpoint?: string,
  ): Observable<IContactWithDboAndSpace>;

  deleteContact(request: IContactRequest): Observable<void>;

  updateContact(request: IUpdateContactRequest): Observable<void>;

  addContactCommChannel(
    request: IAddContactCommChannelRequest,
  ): Observable<void>;

  updateContactCommChannel(
    request: IUpdateContactCommChannelRequest,
  ): Observable<void>;

  deleteContactCommChannel(
    request: IContactCommChannelRequest,
  ): Observable<void>;

  setContactsStatus(request: ISetContactsStatusRequest): Observable<void>;

  watchContactsWithRole(
    space: ISpaceContext,
    role: string,
    status?: 'active' | 'archived',
  ): Observable<IIdAndBriefAndOptionalDbo<IContactBrief, IContactDbo>[]>;

  watchSpaceContacts(
    space: ISpaceContext,
    status?: 'active' | 'archived',
  ): Observable<IIdAndBriefAndOptionalDbo<IContactBrief, IContactDbo>[]>;

  watchContactById(
    space: ISpaceContext,
    contactID: string,
  ): Observable<
    ISpaceItemWithOptionalBriefAndOptionalDbo<IContactBrief, IContactDbo>
  >;

  watchContactsByRole(
    space: ISpaceContext,
    filter?: IContactsFilter,
  ): Observable<IContactContext[]>;

  watchChildContacts(
    space: ISpaceContext,
    id: string,
    filter?: IContactsFilter,
  ): Observable<IContactContext[]>;

  changeContactRole(request: IChangeMemberRoleRequest): Observable<void>;

  removeSpaceMember(
    request: IContactRequestWithOptionalMessage,
  ): Observable<ISpaceContext>;
}

export const CONTACT_SERVICE = new InjectionToken<IContactService>(
  'ContactService',
);
