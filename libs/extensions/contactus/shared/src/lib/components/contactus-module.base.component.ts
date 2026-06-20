import { IContactusSpaceDbo } from '@sneat/extension-contactus-contract';
import { SpaceModuleBaseComponent } from '@sneat/space-components';

export abstract class ContactusModuleBaseComponent extends SpaceModuleBaseComponent<
  IContactusSpaceDbo,
  IContactusSpaceDbo
> {}
