import { Injectable, Injector, inject } from '@angular/core';
import { Firestore as AngularFirestore } from '@angular/fire/firestore';
import { SneatApiService } from '@sneat/api';
import { IIdAndDbo, ISpaceRef } from '@sneat/core';
import {
  defaultFamilyContactGroupDTOs,
  defaultFamilyContactGroups,
  IContactGroupBrief,
  IContactGroupDbo,
} from '@sneat/extension-contactus-contract';
import { ModuleSpaceItemService } from '@sneat/space-services';
import { Observable, of } from 'rxjs';


@Injectable()
export class ContactGroupService {
  private readonly spaceItemService: ModuleSpaceItemService<
    IContactGroupBrief,
    IContactGroupDbo
  >;

  constructor() {
    const afs = inject(AngularFirestore);
    const sneatApiService = inject(SneatApiService);
    const injector = inject(Injector);

    this.spaceItemService = new ModuleSpaceItemService(
      injector,
      'contactus',
      'contact_groups',
      afs,
      sneatApiService,
    );
  }

  getContactGroups(): Observable<readonly IIdAndDbo<IContactGroupDbo>[]> {
    return of(defaultFamilyContactGroupDTOs);
  }

  getContactGroupByID(
    id: string,
    space: ISpaceRef,
  ): Observable<IIdAndDbo<IContactGroupDbo>> {
    const cg = defaultFamilyContactGroups.find((cg) => cg.id === id);
    if (!cg) {
      return of({ id, space, dbo: { title: id } });
    }
    return of(cg);
  }

  watchMemberGroupsBySpace(
    space: ISpaceRef,
    status: 'active' | 'archived' = 'active',
  ): Observable<IIdAndDbo<IContactGroupDbo>[]> {
    // console.log('watchMemberGroupsByTeamID()', spaceID);
    return this.spaceItemService.watchModuleSpaceItemsWithSpaceRef(space, {
      filter: [{ field: 'status', operator: '==', value: status }],
    });
  }
}
