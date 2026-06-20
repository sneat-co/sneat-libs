import { InjectionToken } from '@angular/core';
import { ISpaceContext } from '@sneat/space-models';
import { ContactRole } from './dto';

export interface INewContactPageParams {
  group?: string;
  role?: ContactRole;
  asset?: string;
  document?: string;
}

export interface IContactNavService {
  goNewContactPage(space: ISpaceContext, params?: INewContactPageParams): void;
}

export const CONTACT_NAV_SERVICE = new InjectionToken<IContactNavService>(
  'ContactNavService',
);
