import { TitleCasePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  inject,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonBadge,
  IonButton,
  IonButtons,
  IonIcon,
  IonItem,
  IonLabel,
  IonSpinner,
} from '@ionic/angular/standalone';
import { UserRequiredFieldsService } from '@sneat/auth-ui';
import { SpaceType } from '@sneat/core';
import { ICreateSpaceRequest, ISpaceContext } from '@sneat/space-models';
import { SpaceNavService, SpaceService } from '@sneat/space-services';
import { SneatUserService } from '@sneat/auth-core';
import { ClassName, SneatBaseComponent } from '@sneat/ui';
import { first } from 'rxjs';

@Component({
  selector: 'sneat-spaces-list',
  templateUrl: 'spaces-list.component.html',
  imports: [
    RouterLink,
    TitleCasePipe,
    IonItem,
    IonIcon,
    IonLabel,
    IonBadge,
    IonSpinner,
    IonButtons,
    IonButton,
  ],
  providers: [
    {
      provide: ClassName,
      useValue: 'SpacesListComponent',
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpacesListComponent extends SneatBaseComponent {
  public readonly userService = inject(SneatUserService);
  private readonly spaceNavService = inject(SpaceNavService);
  private readonly spaceService = inject(SpaceService);
  private readonly userRequiredFieldsService = inject(
    UserRequiredFieldsService,
  );

  // Inputs
  @Input({ required: true }) userID?: string;
  @Input({ required: true }) spaces?: ISpaceContext[];
  @Input() pathPrefix = '/space';
  // Opt-in: render a per-row "leave" button. Off by default so existing
  // consumers (spaces menu, for-space-type-card) are unchanged.
  @Input() allowLeave = false;

  // Outputs
  @Output() readonly beforeNavigateToSpace = new EventEmitter<ISpaceContext>();
  @Output() readonly leftSpace = new EventEmitter<ISpaceContext>();

  protected goSpace(event: Event, space: ISpaceContext): boolean {
    event.stopPropagation();
    event.preventDefault();
    if (space.id) {
      this.navigateToSpace(space);
    } else if (space.type) {
      this.createNewSpace(space.type);
    }
    return false;
  }

  private navigateToSpace(space: ISpaceContext): void {
    this.beforeNavigateToSpace.emit(space);
    this.spaceNavService
      .navigateToSpace(space)
      .catch(
        this.errorLogger.logErrorHandler(
          'Failed to navigate to teams overview page from teams menu',
        ),
      );
  }

  protected createNewSpace(type: SpaceType): boolean {
    const request: ICreateSpaceRequest = {
      type,
    };

    this.userService.userState
      .pipe(first(), this.takeUntilDestroyed())
      .subscribe({
        next: (userState) => {
          if (userState.record) {
            this.createSpace(request);
          } else {
            this.userRequiredFieldsService
              .open()
              .then((modalResult) => {
                if (modalResult) {
                  this.createSpace(request);
                }
              })
              .catch(
                this.errorLogger.logErrorHandler(
                  'Failed to open user required fields modal',
                ),
              );
          }
        },
      });
    // this.closeMenu();
    return false;
  }

  private createSpace(request: ICreateSpaceRequest): void {
    this.spaceService
      .createSpace(request)
      .pipe(this.takeUntilDestroyed())
      .subscribe({
        next: (value) => {
          this.navigateToSpace(value);
        },
        error: this.errorLogger.logErrorHandler(
          'failed to create a new family team',
        ),
      });
  }

  // Only reachable when [allowLeave]="true". Stops the row's navigate handler,
  // confirms, then leaves the space; the user record update removes the row.
  protected leaveSpace(space: ISpaceContext, event?: Event): void {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    if (!space.id) {
      return;
    }
    const title = space.brief?.title || space.id;
    if (!confirm(`Are you sure you want to leave "${title}"?`)) {
      return;
    }
    this.spaceService
      .leaveSpace({ spaceID: space.id })
      .pipe(this.takeUntilDestroyed())
      .subscribe({
        next: () => this.leftSpace.emit(space),
        error: this.errorLogger.logErrorHandler(
          `Failed to leave space: ${title}`,
        ),
      });
  }
}
