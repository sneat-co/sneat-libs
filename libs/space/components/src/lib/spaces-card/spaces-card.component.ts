import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardTitle,
  IonIcon,
  IonInput,
  IonItem,
  IonItemOption,
  IonItemOptions,
  IonItemSliding,
  IonLabel,
  IonList,
  IonSkeletonText,
  IonSpinner,
  ToastController,
} from '@ionic/angular/standalone';
import { AnalyticsService, IAnalyticsService } from '@sneat/core';
import { IUserSpaceBrief } from '@sneat/auth-models';
import { IIdAndBrief } from '@sneat/core';
import { ErrorLogger, IErrorLogger } from '@sneat/core';
import { ICreateSpaceRequest, ISpaceContext } from '@sneat/space-models';
import { SpaceNavService, SpaceService } from '@sneat/space-services';
import { SneatUserService } from '@sneat/auth-core';

@Component({
  selector: 'sneat-spaces-card',
  templateUrl: './spaces-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    IonInput,
    IonCard,
    IonItem,
    IonLabel,
    IonCardTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonList,
    IonItemSliding,
    IonItemOptions,
    IonItemOption,
    IonSpinner,
    IonSkeletonText,
    IonCardContent,
  ],
})
export class SpacesCardComponent {
  private readonly errorLogger = inject<IErrorLogger>(ErrorLogger);
  private readonly navService = inject(SpaceNavService);
  private readonly userService = inject(SneatUserService);
  private readonly spaceService = inject(SpaceService);
  private readonly analyticsService =
    inject<IAnalyticsService>(AnalyticsService);
  private readonly toastController = inject(ToastController);

  protected readonly addSpaceInput = viewChild<IonInput>('addTeamInput');

  private readonly userState = toSignal(this.userService.userState);

  // undefined => loading (not yet known)
  public readonly spaces = computed<
    IIdAndBrief<IUserSpaceBrief>[] | undefined
  >(() => {
    const record = this.userState()?.record;
    if (!record) {
      return undefined;
    }
    return Object.entries(record.spaces ?? {})
      .map(([id, brief]) => ({ id, brief }))
      .sort((a, b) => (a.brief.title > b.brief.title ? 1 : -1));
  });

  public readonly loadingState = computed<'Authenticating' | 'Loading'>(() =>
    this.userState()?.status === 'authenticated' ? 'Loading' : 'Authenticating',
  );

  public readonly showAdd = signal(false);
  public readonly spaceName = signal('');
  public readonly adding = signal(false);

  public constructor() {
    // Auto-open the add form when the user has no spaces.
    effect(() => {
      const spaces = this.spaces();
      if (spaces && spaces.length === 0 && !this.showAdd()) {
        this.startAddingSpace();
      }
    });
  }

  public goSpace(space: ISpaceContext) {
    this.navService
      .navigateToSpace(space, 'forward')
      .catch(this.errorLogger.logError);
  }

  public cancelAdd(): void {
    this.showAdd.set(false);
  }

  public addSpace() {
    this.analyticsService.logEvent('addSpace');
    const title = this.spaceName().trim();
    if (!title) {
      this.toastController
        .create({
          position: 'middle',
          message: 'Space name is required',
          color: 'tertiary',
          duration: 5000,
          keyboardClose: true,
          buttons: [{ role: 'cancel', text: 'OK' }],
        })
        .then((toast) =>
          toast
            .present()
            .catch((err) =>
              this.errorLogger.logError(err, 'Failed to present toast'),
            ),
        )
        .catch((err) =>
          this.errorLogger.logError(err, 'Faile to create toast'),
        );
      return;
    }
    if (this.spaces()?.find((t) => t.brief.title === title)) {
      this.toastController
        .create({
          message: 'You already have a team with the same name',
          color: 'danger',
          buttons: ['close'],
          position: 'middle',
          animated: true,
          duration: 3000,
        })
        .then((toast) => {
          toast
            .present()
            .catch((err) =>
              this.errorLogger.logError(err, 'Failed to present toast'),
            );
        })
        .catch((err) =>
          this.errorLogger.logError(err, 'Failed to create toast'),
        );
      return;
    }
    const request: ICreateSpaceRequest = {
      type: 'team',
      // memberType: TeamMemberType.creator,
      title,
    };
    this.adding.set(true);
    this.spaceService.createSpace(request).subscribe({
      next: (space) => {
        this.analyticsService.logEvent('spaceCreated', { space: space.id });
        this.adding.set(false);
        this.spaceName.set('');
        // The Firestore user record update recomputes `spaces`; just navigate.
        this.goSpace(space);
      },
      error: (err) => {
        this.errorLogger.logError(err, 'Failed to create new team record');
        this.adding.set(false);
      },
    });
  }

  public startAddingSpace(): void {
    this.showAdd.set(true);
    setTimeout(() => {
      const addSpaceInput = this.addSpaceInput();
      if (!addSpaceInput) {
        this.errorLogger.logError('addTeamInput is not set');
        return;
      }
      addSpaceInput
        .setFocus()
        .catch((err) =>
          this.errorLogger.logError(
            err,
            'Failed to set focus to "addTeamInput"',
          ),
        );
    }, 200);
  }

  public leaveSpace(space: IIdAndBrief<IUserSpaceBrief>, event?: Event): void {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    if (!confirm(`Are you sure you want to leave team ${space.brief.title}?`)) {
      return;
    }
    const userID = this.userService.currentUserID;
    if (!userID) {
      this.errorLogger.logError('Failed to get current user ID');
      return;
    }
    this.spaceService.leaveSpace({ spaceID: space.id }).subscribe({
      next: () => console.log('left space'),
      error: (err: unknown) =>
        this.errorLogger.logError(
          err,
          `Failed to leave a space: ${space.brief.title}`,
        ),
    });
  }
}
