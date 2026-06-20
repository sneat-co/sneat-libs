import { Provider } from '@angular/core';
import {
  CONTACT_GROUP_SERVICE,
  CONTACT_NAV_SERVICE,
  CONTACT_ROLE_SERVICE,
  CONTACT_SERVICE,
  CONTACTUS_NAV_SERVICE,
  CONTACTUS_SPACE_SERVICE,
  INVITE_SERVICE,
} from '@sneat/extension-contactus-contract';
import {
  ContactGroupService,
  ContactNavService,
  ContactRoleService,
  ContactService,
  ContactusNavService,
  ContactusSpaceContextService,
  ContactusSpaceService,
  InviteService,
  MemberGroupService,
  MemberService,
} from './services';

/**
 * Provides the concrete contactus services and binds them to the
 * contract injection tokens. Consumed at app bootstrap; other
 * extensions must NOT import this.
 */
export function provideContactusInternal(): Provider[] {
  return [
    ContactService,
    ContactNavService,
    ContactGroupService,
    ContactRoleService,
    ContactusSpaceService,
    ContactusSpaceContextService,
    ContactusNavService,
    MemberService,
    MemberGroupService,
    InviteService,
    { provide: CONTACT_SERVICE, useExisting: ContactService },
    { provide: CONTACTUS_SPACE_SERVICE, useExisting: ContactusSpaceService },
    { provide: CONTACT_NAV_SERVICE, useExisting: ContactNavService },
    { provide: CONTACTUS_NAV_SERVICE, useExisting: ContactusNavService },
    { provide: CONTACT_GROUP_SERVICE, useExisting: ContactGroupService },
    { provide: CONTACT_ROLE_SERVICE, useExisting: ContactRoleService },
    { provide: INVITE_SERVICE, useExisting: InviteService },
  ];
}
