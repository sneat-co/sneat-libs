import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { IIdAndBrief, IIdAndOptionalDbo } from '@sneat/core';
import { IContactBrief, IContactusSpaceDbo } from './dto';

export interface IContactusSpaceService {
  watchContactBriefs(
    spaceID: string,
  ): Observable<IIdAndBrief<IContactBrief>[]>;

  watchSpaceModuleRecord(
    spaceID: string,
  ): Observable<IIdAndOptionalDbo<IContactusSpaceDbo>>;
}

export const CONTACTUS_SPACE_SERVICE =
  new InjectionToken<IContactusSpaceService>('ContactusSpaceService');
