import { Directive, EventEmitter, input, Output } from '@angular/core';
import { NewContactBaseDboAndSpaceRef } from '@sneat/extension-contactus-contract';
import { WithSpaceInput } from '@sneat/space-services';

@Directive()
export class WithNewContactInput extends WithSpaceInput {
  public readonly $contact = input.required<NewContactBaseDboAndSpaceRef>();
  @Output() readonly contactChange =
    new EventEmitter<NewContactBaseDboAndSpaceRef>();
}
