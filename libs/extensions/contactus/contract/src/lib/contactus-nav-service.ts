import { InjectionToken } from '@angular/core';
import { ISpaceContext } from '@sneat/space-models';
import { IContactContext } from './contexts';

export interface IContactusNavService {
  navigateToMember(memberContext: IContactContext): void;

  navigateToAddMember(space: ISpaceContext): Promise<boolean>;
}

export const CONTACTUS_NAV_SERVICE = new InjectionToken<IContactusNavService>(
  'ContactusNavService',
);
