import { InjectionToken } from '@angular/core';
import { IIdAndBrief } from '@sneat/core';
import { Observable } from 'rxjs';
import { IContactRoleBrief } from './dto';

export interface IContactRoleService {
  getContactRoleByID(id: string): Observable<IIdAndBrief<IContactRoleBrief>>;
}

export const CONTACT_ROLE_SERVICE = new InjectionToken<IContactRoleService>(
  'ContactRoleService',
);
