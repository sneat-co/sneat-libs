import { Component, Input } from '@angular/core';
import { IContactContext } from '@sneat/extension-contactus-contract';

@Component({
  selector: 'sneat-contact-related-as',
  templateUrl: './contact-related-as.component.html',
  imports: [],
})
export class ContactRelatedAsComponent {
  @Input({ required: true }) public contact?: IContactContext;
}
