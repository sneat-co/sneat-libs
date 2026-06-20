import { Injectable } from '@angular/core';
import { IIdAndBrief } from '@sneat/core';
import {
  defaultFamilyContactGroups,
  IContactRoleBrief,
} from '@sneat/extension-contactus-contract';
import { Observable, of } from 'rxjs';

@Injectable()
export class ContactRoleService {
  getContactRoleByID(id: string): Observable<IIdAndBrief<IContactRoleBrief>> {
    for (const cg of defaultFamilyContactGroups) {
      for (let j = 0; j < (cg?.dbo?.roles?.length || 0); j++) {
        const role = cg.dbo?.roles && cg.dbo.roles[j];
        if (role?.id === id) {
          return of({ id, brief: role.brief });
        }
      }
    }
    return of({ id, brief: { title: id } });
  }
}
