import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  RouterLink,
} from '@angular/router';
import {
  IonIcon,
  IonItem,
  IonItemDivider,
  IonLabel,
  IonList,
  MenuController,
} from '@ionic/angular';
import { AuthMenuItemComponent } from '@sneat/auth-ui';
import { SpaceServiceModule } from '@sneat/space-services';
import { filter } from 'rxjs';
import { SpaceBaseComponent } from '../space-base-component.directive';
import { SpaceComponentBaseParams } from '../space-component-base-params.service';
import { ClassName } from '@sneat/ui';
import { SpaceExtensionLinksComponent } from '../space-extension-links';
import { SpaceSelectorComponent } from '../space-selector';

@Component({
  selector: 'sneat-space-menu',
  templateUrl: './space-menu.component.html',
  styles: '.currentPage ion-label {font-weight: bold}',
  imports: [
    AuthMenuItemComponent,
    SpaceServiceModule,
    RouterLink,
    IonList,
    IonItem,
    IonItemDivider,
    IonIcon,
    IonLabel,
    SpaceExtensionLinksComponent,
    SpaceSelectorComponent,
  ],
  providers: [
    {
      provide: ClassName,
      useValue: 'SpaceMenuComponent',
    },
    SpaceComponentBaseParams,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpaceMenuComponent extends SpaceBaseComponent {
  protected readonly $disabled = computed(
    () => !this.$spaceID() || this.$spaceNotFound(),
  );

  protected readonly $currentPage = signal<string>('');

  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly menuCtrl = inject(MenuController);

  constructor() {
    const router = inject(Router);

    super();
    router.events
      .pipe(
        this.takeUntilDestroyed(),
        filter((event) => event instanceof NavigationEnd),
      )
      .subscribe((event: NavigationEnd) => {
        let route = this.activatedRoute.firstChild;
        while (route?.firstChild) {
          route = route.firstChild;
        }
        const url = event.urlAfterRedirects.split('/');
        this.$currentPage.set(url.length > 4 ? url[4] : '');
      });
  }

  // TODO: Should we use goSpacePage('') instead?
  protected goOverview(): boolean {
    const space = this.$space();
    if (!space) {
      this.errorLogger.logError('no space context');
      return false;
    }
    this.spaceParams.spaceNavService.navigateToSpace(space).then((v) => {
      if (v) {
        this.closeMenu();
      }
    });
    return false;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected goSpacePage(event: Event, _p: string): boolean {
    // At the moment we use routerLink for navigation
    event.stopPropagation();
    // event.preventDefault();
    this.closeMenu();
    return false;
  }

  protected closeMenu(): void {
    this.menuCtrl.close().catch(this.errorLogger.logError);
  }

}
