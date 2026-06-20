import { Injectable, Injector, inject } from '@angular/core';
import { Firestore as AngularFirestore } from '@angular/fire/firestore';
import { SneatApiService } from '@sneat/api';
import { ISpaceContext } from '@sneat/space-models';
import { ModuleSpaceItemService } from '@sneat/space-services';
import { Observable } from 'rxjs';
import type { IAssetBrief, IAssetContext, IAssetDbo } from '@sneat/extension-assetus-contract';

// In-repo asset watch seam for contactus.
//
// contactus only needs a live single-asset watch; importing the runtime
// AssetService from @sneat/extension-assetus would force its prebuilt fesm to
// load at runtime, whose bare `@sneat/*` peer imports do not resolve in this
// source-mapped workspace. So we replicate the exact behaviour locally off
// @sneat/space-services (a workspace source lib). The legacy AssetService was
// literally ModuleSpaceItemService('assetus', 'assets') with
// watchAssetByID = watchSpaceItemByIdWithSpaceRef — same Firestore path
// (spaces/{spaceID}/ext/assetus/assets/{id}), same emitted IAssetContext shape.
@Injectable()
export class AssetService extends ModuleSpaceItemService<
  IAssetBrief,
  IAssetDbo
> {
  constructor() {
    const afs = inject(AngularFirestore);
    const sneatApiService = inject(SneatApiService);
    const injector = inject(Injector);
    super(injector, 'assetus', 'assets', afs, sneatApiService);
  }

  watchAssetByID(
    space: ISpaceContext,
    id: string,
  ): Observable<IAssetContext> {
    return this.watchSpaceItemByIdWithSpaceRef<IAssetDbo>(space, id);
  }
}
