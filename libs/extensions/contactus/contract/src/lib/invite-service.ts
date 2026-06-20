import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { ICreatePersonalInviteRequest } from './apidto/requests';
import { ICreatePersonalInviteResponse } from './apidto/responses';

export interface IInviteService {
  createInviteForMember(
    request: ICreatePersonalInviteRequest,
  ): Observable<ICreatePersonalInviteResponse>;

  getInviteLinkForMember(
    request: ICreatePersonalInviteRequest,
  ): Observable<ICreatePersonalInviteResponse>;
}

export const INVITE_SERVICE = new InjectionToken<IInviteService>(
  'InviteService',
);
