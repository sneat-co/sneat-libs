import { Directive, EventEmitter, input, Output } from '@angular/core';
import { ContactDboWithSpaceRef } from '@sneat/extension-contactus-contract';
import { WithSpaceInput } from '@sneat/space-services';

@Directive()
export abstract class ContactFormBaseComponent extends WithSpaceInput {
  // Should $hideRole be in NewContactFormBaseComponent?
  public readonly $hideRole = input<boolean>();
}

@Directive()
export abstract class EditContactFormBaseComponent extends ContactFormBaseComponent {
  public readonly $contact = input.required<ContactDboWithSpaceRef>();

  @Output() readonly contactChange = new EventEmitter<ContactDboWithSpaceRef>();
}
