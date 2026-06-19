import { Injectable, inject, Injector } from '@angular/core';
import { Firestore as AngularFirestore } from '@angular/fire/firestore';
import { ICalendariusSpaceDbo } from '@sneat/mod-calendarius-core';
import { SpaceModuleService } from '@sneat/space-services';

@Injectable()
export class CalendariusSpaceService extends SpaceModuleService<ICalendariusSpaceDbo> {
  public constructor() {
    const afs = inject(AngularFirestore);
    super(inject(Injector), 'calendarius', afs);
  }
}
