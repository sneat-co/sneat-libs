import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  IonBackButton,
  IonBadge,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { SneatUserService } from '@sneat/auth-core';
import { firstValueFrom } from 'rxjs';
import { SsoApiService } from './sso-api.service';
import { ssoErrorMessage } from './sso-errors';
import { applicationBaseURL, emailDomain, SsoConfig } from './sso.models';

@Component({
  selector: 'sneat-sso-settings-page',
  templateUrl: './sso-settings-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    IonBackButton,
    IonBadge,
    IonButton,
    IonButtons,
    IonCard,
    IonCardContent,
    IonContent,
    IonHeader,
    IonInput,
    IonItem,
    IonLabel,
    IonSpinner,
    IonText,
    IonTitle,
    IonToolbar,
  ],
})
export class SsoSettingsPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly sso = inject(SsoApiService);
  private readonly userState = toSignal(inject(SneatUserService).userState);

  protected readonly spaceID =
    this.route.snapshot.paramMap.get('spaceID') ?? '';
  protected readonly domain = signal(
    this.route.snapshot.queryParamMap.get('domain') ?? '',
  );
  protected readonly issuer = signal('');
  protected readonly clientID = signal('');
  protected readonly clientSecret = signal('');
  protected readonly loginHost = signal('');
  protected readonly config = signal<SsoConfig | undefined>(undefined);
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | undefined>(undefined);
  protected readonly success = signal<string | undefined>(
    this.route.snapshot.queryParamMap.has('activated')
      ? 'SSO was tested successfully and is now active.'
      : undefined,
  );
  protected readonly isAdmin = computed(() => {
    const roles = this.userState()?.record?.spaces?.[this.spaceID]?.roles ?? [];
    return roles.some((role) => role === 'owner' || role === 'admin');
  });
  protected readonly userRecordLoaded = computed(
    () => this.userState()?.record !== undefined,
  );
  protected readonly formValid = computed(
    () =>
      emailDomain(`admin@${this.domain()}`) ===
        this.domain().trim().toLowerCase() &&
      !!this.issuer().trim() &&
      !!this.clientID().trim() &&
      (!!this.clientSecret() || !!this.config()?.hasClientSecret),
  );

  ngOnInit(): void {
    void this.load();
  }

  protected async save(): Promise<boolean> {
    if (!this.isAdmin() || !this.formValid() || this.busy()) {
      return false;
    }
    this.busy.set(true);
    this.error.set(undefined);
    this.success.set(undefined);
    try {
      const config = await firstValueFrom(
        this.sso.saveConfig({
          spaceID: this.spaceID,
          emailDomain: this.domain().trim().toLowerCase(),
          issuer: this.issuer().trim(),
          clientID: this.clientID().trim(),
          clientSecret: this.clientSecret(),
          loginHost: this.loginHost().trim() || undefined,
        }),
      );
      this.config.set(config);
      this.clientSecret.set('');
      this.success.set(
        'Configuration saved. It is not active until the OIDC sign-in test succeeds.',
      );
      return true;
    } catch (error) {
      this.error.set(ssoErrorMessage(error));
      return false;
    } finally {
      this.busy.set(false);
    }
  }

  protected async testAndActivate(): Promise<void> {
    if (this.busy()) {
      return;
    }
    if (!(await this.save())) {
      return;
    }
    this.busy.set(true);
    this.error.set(undefined);
    try {
      const result = await firstValueFrom(
        this.sso.startActivation(this.spaceID, applicationBaseURL()),
      );
      location.assign(result.authorizationURL);
    } catch (error) {
      this.error.set(ssoErrorMessage(error));
      this.busy.set(false);
    }
  }

  private async load(): Promise<void> {
    try {
      const config = await firstValueFrom(this.sso.getConfig(this.spaceID));
      this.config.set(config);
      this.domain.set(config.emailDomains[0] ?? this.domain());
      this.issuer.set(config.issuer);
      this.clientID.set(config.clientID);
      this.loginHost.set(config.loginHosts?.[0] ?? '');
    } catch (error) {
      if (!(error instanceof HttpErrorResponse) || error.status !== 404) {
        this.error.set(ssoErrorMessage(error));
      }
    } finally {
      this.loading.set(false);
    }
  }
}
