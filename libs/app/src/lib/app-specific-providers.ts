import { Provider } from '@angular/core';
import {
  CONTACT_ROLES_BY_TYPE,
  ContactRolesByType,
} from './contact-extensions';
export { provideAppInfo } from '@sneat/app-public';

export function provideRolesByType(
  contactRolesByType: ContactRolesByType | undefined,
): Provider {
  return {
    provide: CONTACT_ROLES_BY_TYPE, // at the moment this is supplied by Logistus app only
    useValue: contactRolesByType,
  };
}
