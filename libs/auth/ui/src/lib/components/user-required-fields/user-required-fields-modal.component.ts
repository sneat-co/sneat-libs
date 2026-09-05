import { Component, inject, ChangeDetectionStrategy, input } from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonItemDivider,
  IonLabel,
  IonTitle,
  IonToolbar,
  ModalController,
} from '@ionic/angular';
import {
  IInitUserRecordRequest,
  ISneatUserState,
  SneatUserService,
  UserRecordService,
} from '@sneat/auth-core';
import { AgeGroupID, Gender } from '@sneat/core';
import { ClassName, ISelectItem, SelectFromListComponent } from '@sneat/ui';
import { ISpaceContext } from '@sneat/space-models';
import { SneatBaseComponent } from '@sneat/ui';
import { takeUntil } from 'rxjs';

@Component({
  selector: 'sneat-user-required-fields-form',
  templateUrl: './user-required-fields-modal.component.html',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    SelectFromListComponent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonItem,
    IonInput,
    IonItemDivider,
    IonLabel,
    IonFooter,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: ClassName,
      useValue: 'UserRequiredFieldsModalComponent',
    },
  ],
})
export class UserRequiredFieldsModalComponent extends SneatBaseComponent {
  private readonly modalController = inject(ModalController);
  private readonly userRecordService = inject(UserRecordService);
  private readonly sneatUserService = inject(SneatUserService);

  readonly space = input.required<ISpaceContext>();

  protected readonly genders: ISelectItem[] = [
    { id: 'male', emoji: '♂️', title: 'Male' },
    { id: 'female', emoji: '♀️', title: 'Female' },
    { id: 'other', emoji: '⚥', title: 'Other' },
    { id: 'undisclosed', iconName: 'body', title: 'Undisclosed' },
  ];

  protected readonly ageGroups: ISelectItem[] = [
    { id: 'adult', emoji: '🧓', title: 'Adult' },
    { id: 'child', emoji: '🧒', title: 'Child' },
  ];

  protected readonly firstName = new FormControl('', Validators.required);
  protected readonly lastName = new FormControl('', Validators.required);
  protected readonly gender = new FormControl('', Validators.required);
  protected readonly ageGroup = new FormControl('', Validators.required);

  protected readonly form = new FormGroup({
    firstName: this.firstName,
    lastName: this.lastName,
    gender: this.gender,
    ageGroup: this.ageGroup,
  });

  protected submitting = false;

  protected userState?: ISneatUserState;

  constructor() {
    super();
    this.sneatUserService.userState.pipe(takeUntil(this.destroyed$)).subscribe({
      next: (userState) => (this.userState = userState),
    });
  }

  protected save(): void {
    this.submitting = true;
    if (!this.form.valid) {
      setTimeout(() => {
        alert('Please fill in all fields.');
        this.submitting = false;
      });
      return;
    }

    const gender = this.gender.value as Gender;
    const ageGroup = this.ageGroup.value as AgeGroupID;

    const request: IInitUserRecordRequest = {
      names: {
        firstName: this.firstName.value || undefined,
        lastName: this.lastName.value || undefined,
      },
      gender,
      ageGroup,
    };
    this.userRecordService.initUserRecord(request).subscribe({
      next: () => this.modalController.dismiss(true).catch(console.error),
      error: (err) => {
        this.errorLogger.logError(err, 'Failed to init user record:');
        alert('Failed to init user record');
        this.submitting = false;
      },
    });
  }

  protected close(): void {
    this.modalController
      .dismiss(false)
      .catch(this.errorLogger.logErrorHandler('Failed to close modal'));
  }
}
