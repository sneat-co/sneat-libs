import {
  ChangeDetectionStrategy,
  Component,
  computed,
  EventEmitter,
  input,
  Output,
  signal,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonButtons,
  IonCheckbox,
  IonIcon,
  IonItem,
  IonItemDivider,
  IonLabel,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
} from '@ionic/angular/standalone';
import { ContactTitlePipe } from '@sneat/extension-contactus-shared';
import {
  CONTACTUS_SPACE_SERVICE,
  IContactusSpaceDbo,
  IContactWithBriefAndSpace,
} from '@sneat/extension-contactus-contract';
import { ContactusModuleBaseComponent } from '@sneat/extension-contactus-shared';
import { SpaceModuleService } from '@sneat/space-services';
import { zipMapBriefsWithIDs } from '@sneat/space-models';
import { ClassName } from '@sneat/ui';

@Component({
  imports: [
    FormsModule,
    ContactTitlePipe,
    IonItemDivider,
    IonLabel,
    IonButtons,
    IonButton,
    IonIcon,
    IonItem,
    IonCheckbox,
    IonSelect,
    IonSelectOption,
    IonSegment,
    IonSegmentButton,
  ],
  providers: [{ provide: ClassName, useValue: 'ContactsFilterComponent' }],
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'sneat-contacts-filter',
  templateUrl: 'contacts-filter.component.html',
})
export class ContactsFilterComponent extends ContactusModuleBaseComponent {
  public readonly $contactIDs = input.required<readonly string[]>();

  protected readonly $hasContactIDs = computed(
    () => !!this.$contactIDs().length,
  );

  contactIDs: readonly string[] = [];
  @Output() readonly contactIDsChange = new EventEmitter<readonly string[]>();

  protected readonly $tab = signal<'members' | 'contacts'>('members');

  protected onTabChanged(event: CustomEvent): void {
    this.$tab.set(event.detail.value);
  }

  contactID = ''; // TODO: Needs documentation on what & why

  // protected readonly $selectedContacts = computed<
  // 	readonly IContactWithBriefAndSpace[]
  // >(() => {
  // 	const space = this.$space();
  // 	const contacts = this.$members() || [];
  // 	const selectedContacts = this.contactIDs.map((id) => {
  // 		let contact = contacts.find((m) => m.id == id);
  // 		if (!contact) {
  // 			contact = {
  // 				id,
  // 				brief: { type: 'not_found' as ContactType },
  // 				space: space,
  // 			};
  // 		}
  // 		return contact;
  // 	});
  // 	return selectedContacts.map(addSpace(space));
  // });

  protected readonly $members = signal<
    readonly IContactWithBriefAndSpace[] | undefined
  >(undefined);

  constructor() {
    const contactusSpaceService = inject(CONTACTUS_SPACE_SERVICE);

    super(
      contactusSpaceService as unknown as SpaceModuleService<IContactusSpaceDbo>,
    );
  }

  protected override onSpaceModuleDboChanged(
    dbo: IContactusSpaceDbo | null,
  ): void {
    const contactBriefs = zipMapBriefsWithIDs(dbo?.contacts)?.map((m) =>
      Object.assign(m, { space: this.space || { id: `` } }),
    );
    this.$members.set(
      contactBriefs.filter((c) => c.brief.roles?.includes('member')),
    );
  }

  protected clearSelectedContacts(): void {
    this.contactIDsChange.emit([]);
  }

  protected onContactCheckChanged(event: Event): void {
    event.stopPropagation();
    const cs = event as CustomEvent;
    const { checked, value } = cs.detail;
    let contactIDs = this.$contactIDs();
    if (checked === undefined) {
      // a dropdown
      contactIDs = this.contactID ? [this.contactID] : [];
    } else if (checked === true) {
      contactIDs = [...contactIDs, value];
    } else if (checked === false) {
      contactIDs = contactIDs.filter((id) => id !== value);
    }
    this.contactIDsChange.emit(contactIDs);
  }
}
