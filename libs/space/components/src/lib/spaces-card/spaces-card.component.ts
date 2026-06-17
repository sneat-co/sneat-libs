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
import { SpacesListComponent } from '../spaces-list';

// Signal-based + OnPush so the card repaints reactively when the user record
// loads, instead of mutating fields inside an rxjs subscription and relying on
// Zone change detection. The previous version stayed stuck on "Authenticating..."
// when the Firestore onSnapshot update landed outside the Angular zone (the
// record loaded but the view never repainted). toSignal()/computed() repaint
// correctly under zone.js too — this is not a zoneless change.
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
    IonSpinner,
    IonSkeletonText,
    IonCardContent,
    SpacesListComponent,
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

  private readonly addSpaceInput = viewChild<IonInput>('addTeamInput');

  private readonly userState = toSignal(this.userService.userState);

  // undefined => user record not loaded yet (render the loading row).
  protected readonly spaces = computed<
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

  // Adapts the user's spaces to the shape SpacesListComponent renders, so the
  // card reuses that component (icon + title decode + navigation) instead of
  // duplicating the row markup.
  protected readonly spaceContexts = computed<ISpaceContext[] | undefined>(
    () =>
      this.spaces()?.map(({ id, brief }) => ({
        id,
        type: brief.type,
        brief: { title: brief.title, type: brief.type, roles: brief.roles },
      })),
  );

  protected get currentUserID(): string {
    return this.userService.currentUserID ?? '';
  }

  protected readonly loadingState = computed(() =>
    this.userState()?.status === 'authenticated' ? 'Loading' : 'Authenticating',
  );

  protected readonly showAdd = signal(false);
  protected readonly spaceName = signal('');
  protected readonly adding = signal(false);

  public constructor() {
    // Auto-open the "add space" form once we know the user has no spaces.
    effect(() => {
      const spaces = this.spaces();
      if (spaces && spaces.length === 0) {
        this.startAddingSpace();
      }
    });
  }

  private navigateToSpace(space: ISpaceContext): void {
    this.navService
      .navigateToSpace(space, 'forward')
      .catch(this.errorLogger.logError);
  }

  protected addSpace(): void {
    this.analyticsService.logEvent('addSpace');
    const title = this.spaceName().trim();
    if (!title) {
      this.presentToast('Space name is required', 'tertiary');
      return;
    }
    if (this.spaces()?.find((t) => t.brief.title === title)) {
      this.presentToast('You already have a team with the same name', 'danger');
      return;
    }
    const request: ICreateSpaceRequest = {
      type: 'team',
      title,
    };
    this.adding.set(true);
    this.spaceService.createSpace(request).subscribe({
      next: (space) => {
        this.analyticsService.logEvent('spaceCreated', { space: space.id });
        this.adding.set(false);
        this.spaceName.set('');
        // The user record updates via Firestore, which recomputes `spaces`.
        this.navigateToSpace(space);
      },
      error: (err) => {
        this.errorLogger.logError(err, 'Failed to create new team record');
        this.adding.set(false);
      },
    });
  }

  private presentToast(message: string, color: string): void {
    this.toastController
      .create({
        position: 'middle',
        message,
        color,
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
      .catch((err) => this.errorLogger.logError(err, 'Failed to create toast'));
  }

  public startAddingSpace(): void {
    this.showAdd.set(true);
    setTimeout(() => {
      const input = this.addSpaceInput();
      if (!input) {
        return;
      }
      input
        .setFocus()
        .catch((err) =>
          this.errorLogger.logError(err, 'Failed to set focus to addTeamInput'),
        );
    }, 200);
  }

  protected cancelAdd(): void {
    this.showAdd.set(false);
  }
}
