import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { SneatUserService } from '@sneat/auth-core';
import { IUserSpaceBrief } from '@sneat/auth-models';
import { SpaceService } from '@sneat/space-services';
import { firstValueFrom } from 'rxjs';
import { ssoErrorMessage } from './sso-errors';

@Component({
  selector: 'sneat-sso-onboarding-page',
  templateUrl: './sso-onboarding-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [SpaceService],
  imports: [
    FormsModule,
    IonBackButton,
    IonButton,
    IonButtons,
    IonCard,
    IonCardContent,
    IonContent,
    IonHeader,
    IonInput,
    IonItem,
    IonLabel,
    IonList,
    IonSpinner,
    IonText,
    IonTitle,
    IonToolbar,
  ],
})
export class SsoOnboardingPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly spacesService = inject(SpaceService);
  private readonly userState = toSignal(inject(SneatUserService).userState);

  protected readonly domain =
    this.route.snapshot.queryParamMap.get('domain') ?? '';
  protected readonly companyName = signal('');
  protected readonly busy = signal(false);
  protected readonly error = signal<string | undefined>(undefined);
  protected readonly manageableSpaces = computed(() => {
    const spaces = this.userState()?.record?.spaces ?? {};
    return Object.entries(spaces).filter(([, space]) =>
      space.roles.some((role) => role === 'owner' || role === 'admin'),
    );
  });

  protected async createSpace(): Promise<void> {
    if (!this.companyName().trim() || this.busy()) {
      return;
    }
    this.busy.set(true);
    this.error.set(undefined);
    try {
      const created = await firstValueFrom(
        this.spacesService.createSpace({
          type: 'company',
          title: this.companyName().trim(),
        }),
      );
      await this.goToSettings(created.id, true);
    } catch (error) {
      this.error.set(ssoErrorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  protected spaceTitle(space: IUserSpaceBrief): string {
    return space.title || 'Untitled space';
  }

  protected selectSpace(spaceID: string): void {
    void this.goToSettings(spaceID, false);
  }

  private goToSettings(spaceID: string, replaceUrl: boolean): Promise<boolean> {
    return this.router.navigate(['/spaces', spaceID, 'settings', 'sso'], {
      queryParams: this.domain ? { domain: this.domain } : undefined,
      replaceUrl,
    });
  }
}
