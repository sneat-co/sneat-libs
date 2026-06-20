import { InjectionToken } from '@angular/core';
import { IIdAndDbo, ISpaceRef } from '@sneat/core';
import { Observable } from 'rxjs';
import { IContactGroupDbo } from './dto';

export interface IContactGroupService {
  getContactGroups(): Observable<readonly IIdAndDbo<IContactGroupDbo>[]>;

  getContactGroupByID(
    id: string,
    space: ISpaceRef,
  ): Observable<IIdAndDbo<IContactGroupDbo>>;
}

export const CONTACT_GROUP_SERVICE = new InjectionToken<IContactGroupService>(
  'ContactGroupService',
);
