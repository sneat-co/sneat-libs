import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  Input,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
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
} from '@ionic/angular';
import {
  AnalyticsService,
  GroupKind,
  IAnalyticsService,
  IIdAndBrief,
  isGroupKind,
  isSpaceType,
  SpaceType,
} from '@sneat/core';
import { IUserSpaceBrief } from '@sneat/auth-models';
import { ErrorLogger, IErrorLogger } from '@sneat/core';
import { ICreateSpaceRequest, ISpaceContext } from '@sneat/space-models';
import { SpaceNavService, SpaceService } from '@sneat/space-services';
import { AuthStatuses, SneatUserService } from '@sneat/auth-core';
import { SpacesListComponent } from '../spaces-list';

const pendingSpaceCreationStorageKeyPrefix = 'sneat.pending-space-creation.v1:';
const activePendingSpaceCreationClaims = signal<ReadonlyMap<string, symbol>>(
  new Map(),
);

interface PendingSpaceCreation {
  readonly request: ICreateSpaceRequest;
  readonly returnTo: string;
  readonly status: 'draft' | 'submitting';
}

function pendingSpaceCreationStorageKey(
  returnTo: string,
  type: SpaceType,
  groupKind: GroupKind | undefined,
): string {
  return `${pendingSpaceCreationStorageKeyPrefix}${encodeURIComponent(
    `spaces-card:${returnTo}:${type}:${groupKind ?? ''}`,
  )}`;
}

function readPendingSpaceCreation(
  returnTo: string,
  expectedType: SpaceType,
  expectedGroupKind: GroupKind | undefined,
): PendingSpaceCreation | undefined {
  const storageKey = pendingSpaceCreationStorageKey(
    returnTo,
    expectedType,
    expectedGroupKind,
  );
  try {
    const value = sessionStorage.getItem(storageKey);
    if (!value) {
      return undefined;
    }
    const parsed = JSON.parse(value) as {
      request?: { type?: unknown; groupKind?: unknown; title?: unknown };
      returnTo?: unknown;
      status?: unknown;
    };
    const type = parsed.request?.type;
    const title = parsed.request?.title;
    const groupKind = parsed.request?.groupKind;
    if (
      !isSpaceType(type) ||
      type !== expectedType ||
      typeof title !== 'string' ||
      !title.trim() ||
      (groupKind !== undefined && !isGroupKind(groupKind)) ||
      (groupKind !== undefined && type !== 'group') ||
      parsed.returnTo !== returnTo ||
      groupKind !== expectedGroupKind ||
      (parsed.status !== 'draft' && parsed.status !== 'submitting')
    ) {
      return undefined;
    }
    return {
      request: { type, title, ...(groupKind ? { groupKind } : {}) },
      returnTo,
      status: parsed.status,
    };
  } catch {
    return undefined;
  }
}

function writePendingSpaceCreation(pending: PendingSpaceCreation): boolean {
  try {
    sessionStorage.setItem(
      pendingSpaceCreationStorageKey(
        pending.returnTo,
        pending.request.type,
        pending.request.groupKind,
      ),
      JSON.stringify(pending),
    );
    return true;
  } catch {
    return false;
  }
}

function samePendingSpaceRequest(
  left: PendingSpaceCreation,
  right: PendingSpaceCreation,
): boolean {
  return (
    left.returnTo === right.returnTo &&
    left.request.type === right.request.type &&
    left.request.title === right.request.title &&
    left.request.groupKind === right.request.groupKind
  );
}

function claimPendingSpaceCreation(
  pending: PendingSpaceCreation,
  owner: symbol,
): PendingSpaceCreation | undefined {
  const storageKey = pendingSpaceCreationStorageKey(
    pending.returnTo,
    pending.request.type,
    pending.request.groupKind,
  );
  if (activePendingSpaceCreationClaims().has(storageKey)) {
    return undefined;
  }
  const stored = readPendingSpaceCreation(
    pending.returnTo,
    pending.request.type,
    pending.request.groupKind,
  );
  if (
    !stored ||
    stored.status !== 'draft' ||
    !samePendingSpaceRequest(stored, pending)
  ) {
    return undefined;
  }
  const claimed: PendingSpaceCreation = { ...stored, status: 'submitting' };
  if (!writePendingSpaceCreation(claimed)) {
    return undefined;
  }
  activePendingSpaceCreationClaims.update((claims) => {
    const updated = new Map(claims);
    updated.set(storageKey, owner);
    return updated;
  });
  return claimed;
}

function hasActivePendingSpaceCreationClaim(
  pending: PendingSpaceCreation,
): boolean {
  return activePendingSpaceCreationClaims().has(
    pendingSpaceCreationStorageKey(
      pending.returnTo,
      pending.request.type,
      pending.request.groupKind,
    ),
  );
}

function releasePendingSpaceCreationClaim(
  pending: PendingSpaceCreation,
  owner: symbol,
): void {
  const storageKey = pendingSpaceCreationStorageKey(
    pending.returnTo,
    pending.request.type,
    pending.request.groupKind,
  );
  if (activePendingSpaceCreationClaims().get(storageKey) === owner) {
    activePendingSpaceCreationClaims.update((claims) => {
      const updated = new Map(claims);
      updated.delete(storageKey);
      return updated;
    });
  }
}

function removePendingSpaceCreation(
  pending: PendingSpaceCreation,
  requiredStatus?: PendingSpaceCreation['status'],
): void {
  try {
    const stored = readPendingSpaceCreation(
      pending.returnTo,
      pending.request.type,
      pending.request.groupKind,
    );
    if (
      stored &&
      (!requiredStatus || stored.status === requiredStatus) &&
      samePendingSpaceRequest(stored, pending)
    ) {
      sessionStorage.removeItem(
        pendingSpaceCreationStorageKey(
          pending.returnTo,
          pending.request.type,
          pending.request.groupKind,
        ),
      );
    }
  } catch {
    // The created Space is authoritative even when storage cleanup is denied.
  }
}

function isKnownCreateRejection(error: unknown): boolean {
  return (
    error instanceof HttpErrorResponse &&
    [400, 401, 403, 404, 422].includes(error.status)
  );
}

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
export class SpacesCardComponent implements OnInit {
  /** Card heading — a product names its spaces ("Clubs", "Schools"). */
  @Input() title = 'Spaces';

  /**
   * When set, only spaces of this type are listed. A Sneat account holds
   * spaces from every product (family, work, clubs...), and a product home
   * that lists them all reads as a generic space browser rather than the
   * product — sneat.club wants exactly the `club` spaces.
   */
  @Input() spaceType?: SpaceType;

  /** Narrows group spaces and tags new groups with a product-specific purpose. */
  @Input() groupKind?: GroupKind;

  /**
   * Whether the card offers its quick-add form. A product whose spaces are
   * created by a registration flow (decision 0006) passes false and offers
   * its own "Register ..." call to action instead.
   */
  @Input() canAdd = true;

  private readonly errorLogger = inject<IErrorLogger>(ErrorLogger);
  private readonly navService = inject(SpaceNavService);
  private readonly router = inject(Router);
  private readonly userService = inject(SneatUserService);
  private readonly spaceService = inject(SpaceService);
  private readonly analyticsService =
    inject<IAnalyticsService>(AnalyticsService);
  private readonly toastController = inject(ToastController);

  private readonly addSpaceInput = viewChild<IonInput>('addSpaceInput');

  private readonly userState = toSignal(this.userService.userState);
  protected readonly pendingCreation = signal<PendingSpaceCreation | undefined>(
    undefined,
  );
  private creationStarted = false;
  private readonly creationClaimOwner = Symbol('space-creation-claim-owner');
  private loginNavigationStarted = false;
  private submittedHere = false;

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
      .filter(
        ({ brief }) =>
          (!this.spaceType || brief.type === this.spaceType) &&
          (!this.groupKind || brief.groupKind === this.groupKind),
      )
      .sort((a, b) => (a.brief.title > b.brief.title ? 1 : -1));
  });

  // Adapts the user's spaces to the shape SpacesListComponent renders, so the
  // card reuses that component (icon + title decode + navigation) instead of
  // duplicating the row markup.
  protected readonly spaceContexts = computed<ISpaceContext[] | undefined>(() =>
    this.spaces()?.map(({ id, brief }) => ({
      id,
      type: brief.type,
      brief: {
        title: brief.title,
        type: brief.type,
        groupKind: brief.groupKind,
        roles: brief.roles,
      },
    })),
  );

  protected get currentUserID(): string {
    return this.userService.currentUserID ?? '';
  }

  protected readonly loadingState = computed(() =>
    this.userState()?.status === 'authenticated' ? 'Loading' : 'Authenticating',
  );
  protected readonly signedOut = computed(
    () => this.userState()?.status === AuthStatuses.notAuthenticated,
  );

  protected readonly showAdd = signal(false);
  protected readonly spaceName = signal('');
  protected readonly adding = signal(false);
  protected readonly newSpaceNamePlaceholder = 'New space name';
  protected readonly addSpaceHelp =
    'Enter a space name and click "Create" to add it.';
  protected readonly pendingCreationNotice = computed(() => {
    const pending = this.pendingCreation();
    if (!pending) {
      return '';
    }
    return pending.status === 'submitting'
      ? 'A previous creation request may still be finishing. Check your spaces before retrying.'
      : 'Your space name is ready. Select Create to finish.';
  });
  protected readonly canDiscardPendingCreation = computed(() => {
    const pending = this.pendingCreation();
    return !!pending && !hasActivePendingSpaceCreationClaim(pending);
  });

  public constructor() {
    // Auto-open the "add space" form once we know the user has no spaces —
    // unless adding is disabled (a registration-flow product supplies its own
    // call to action).
    effect(() => {
      const spaces = this.spaces();
      if (spaces && spaces.length === 0 && this.canAdd) {
        this.startAddingSpace();
      }
    });
    effect(() => this.continuePendingCreation(this.pendingCreation()));
  }

  public ngOnInit(): void {
    this.pendingCreation.set(
      readPendingSpaceCreation(
        this.router.url,
        this.spaceType ?? 'team',
        this.groupKind,
      ),
    );
  }

  private navigateToSpace(space: ISpaceContext): void {
    this.navService
      .navigateToSpace(space, 'forward')
      .catch(this.errorLogger.logError);
  }

  protected addSpace(): void {
    if (this.adding() || this.creationStarted) {
      return;
    }
    this.analyticsService.logEvent('addSpace');
    const title = this.spaceName().trim();
    if (!title) {
      this.presentToast('Space name is required', 'tertiary');
      return;
    }
    if (this.spaces()?.find((t) => t.brief.title === title)) {
      this.presentToast(
        'You already have a space with the same name',
        'danger',
      );
      return;
    }
    const request: ICreateSpaceRequest = {
      type: this.spaceType ?? 'team',
      groupKind: this.groupKind,
      title,
    };
    const existing = readPendingSpaceCreation(
      this.router.url,
      request.type,
      request.groupKind,
    );
    if (existing?.status === 'submitting') {
      this.presentToast(
        'A space creation request may still be finishing. Check your spaces before retrying.',
        'warning',
      );
      return;
    }
    const pending: PendingSpaceCreation = {
      request,
      returnTo: this.router.url,
      status: 'draft',
    };
    if (!writePendingSpaceCreation(pending)) {
      this.presentToast(
        'We could not save your space name before sign-in. Please try again.',
        'danger',
      );
      return;
    }
    this.submittedHere = true;
    this.adding.set(true);
    this.pendingCreation.set(pending);
    this.continuePendingCreation(pending);
  }

  private continuePendingCreation(
    pending: PendingSpaceCreation | undefined,
  ): void {
    if (!pending) {
      return;
    }
    this.spaceName.set(pending.request.title ?? '');
    this.showAdd.set(true);
    if (!this.submittedHere) {
      return;
    }

    const userState = this.userState();
    if (!userState || userState.status === AuthStatuses.authenticating) {
      return;
    }
    if (
      userState.status !== AuthStatuses.authenticated ||
      userState.user?.isAnonymous
    ) {
      if (this.submittedHere) {
        this.navigateToLogin(pending.returnTo);
      }
      return;
    }
    if (!userState.record || this.creationStarted) {
      return;
    }

    const claimed = claimPendingSpaceCreation(pending, this.creationClaimOwner);
    if (!claimed) {
      this.adding.set(false);
      this.presentToast(
        'We could not reserve this space request. Please check the form and try again.',
        'danger',
      );
      return;
    }
    this.creationStarted = true;
    this.pendingCreation.set(claimed);
    this.createSpace(claimed);
  }

  private navigateToLogin(returnTo: string): void {
    if (this.loginNavigationStarted) {
      return;
    }
    this.loginNavigationStarted = true;
    this.submittedHere = false;
    this.router
      .navigate(['login'], {
        fragment: returnTo,
        queryParams: {
          reason: 'Sign in to create this space',
          reasonDetail: 'Your space name will be waiting when you return.',
        },
      })
      .then((navigated) => {
        if (navigated) {
          this.loginNavigationStarted = false;
          this.adding.set(false);
        } else {
          this.restoreAfterLoginNavigationFailure();
        }
      })
      .catch((err) => {
        this.errorLogger.logError(err, 'Failed to open sign-in for new space');
        this.restoreAfterLoginNavigationFailure();
      });
  }

  private restoreAfterLoginNavigationFailure(): void {
    this.loginNavigationStarted = false;
    this.adding.set(false);
    this.presentToast('We could not open sign-in. Please try again.', 'danger');
  }

  private createSpace(pending: PendingSpaceCreation): void {
    this.spaceService.createSpace(pending.request).subscribe({
      next: (space) => {
        releasePendingSpaceCreationClaim(pending, this.creationClaimOwner);
        this.creationStarted = false;
        this.submittedHere = false;
        this.analyticsService.logEvent('spaceCreated', { space: space.id });
        removePendingSpaceCreation(pending, 'submitting');
        this.adding.set(false);
        this.spaceName.set('');
        this.pendingCreation.set(undefined);
        // The user record updates via Firestore, which recomputes `spaces`.
        this.navigateToSpace(space);
      },
      error: (err) => {
        releasePendingSpaceCreationClaim(pending, this.creationClaimOwner);
        this.errorLogger.logError(err, 'Failed to create new space record');
        this.creationStarted = false;
        this.submittedHere = false;
        const persisted: PendingSpaceCreation = {
          ...pending,
          status: isKnownCreateRejection(err) ? 'draft' : 'submitting',
        };
        if (!writePendingSpaceCreation(persisted)) {
          this.presentToast(
            'We could not save this space for retry. Keep this page open and try again.',
            'danger',
          );
        }
        this.pendingCreation.set(persisted);
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
          this.errorLogger.logError(
            err,
            'Failed to set focus to addSpaceInput',
          ),
        );
    }, 200);
  }

  protected discardPendingCreation(): void {
    if (this.creationStarted) {
      return;
    }
    const pending = this.pendingCreation();
    if (pending && hasActivePendingSpaceCreationClaim(pending)) {
      return;
    }
    if (pending) {
      removePendingSpaceCreation(pending);
    }
    this.pendingCreation.set(undefined);
    this.spaceName.set('');
    this.adding.set(false);
  }

  protected cancelAdd(): void {
    this.showAdd.set(false);
  }
}
