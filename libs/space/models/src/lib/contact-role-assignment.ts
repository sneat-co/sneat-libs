import { InjectionToken } from '@angular/core';
import { ISpaceModuleItemRef } from '@sneat/dto';
import { IRelatedItemChange } from './models';
import { ISpaceContext } from './space-context';

export interface IContactRoleAssignment {
  /** Explicit Space and canonical bare contact ID; product adapters normalize graph aliases. */
  readonly contact: ISpaceModuleItemRef;
  readonly title: string;
  readonly roleIDs: readonly string[];
}

export interface IContactAssignmentRoleOption {
  readonly id: string;
  readonly label: string;
}

/** Selection is presentation only; the product authorizes the subsequent save. */
export interface IContactRoleAssignmentPicker {
  selectContact(request: {
    readonly space: ISpaceContext;
    readonly exclude: readonly ISpaceModuleItemRef[];
  }): Promise<Omit<IContactRoleAssignment, 'roleIDs'> | undefined>;
}

export const CONTACT_ROLE_ASSIGNMENT_PICKER =
  new InjectionToken<IContactRoleAssignmentPicker>(
    'CONTACT_ROLE_ASSIGNMENT_PICKER',
  );

/** The owning product binds this to its authorized endpoint, never a client write. */
export interface IContactRoleAssignmentSavePort {
  /** Map known product denial codes to safe text; raw exception messages are never displayed. */
  errorMessage?(error: unknown): string | undefined;
  save(request: {
    readonly target: ISpaceModuleItemRef;
    readonly changes: readonly IRelatedItemChange[];
  }): Promise<readonly IContactRoleAssignment[]>;
}
