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
  IonTextarea,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { SneatUserService } from '@sneat/auth-core';
import { firstValueFrom } from 'rxjs';
import { SsoApiService } from './sso-api.service';
import { ssoErrorMessage } from './sso-errors';
import {
  applicationBaseURL,
  emailDomain,
  SsoConfig,
  SsoProtocol,
  SsoProviderPreset,
} from './sso.models';

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
    IonTextarea,
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
  protected readonly spaceHomeURL = `/space/${
    this.route.snapshot.paramMap.get('spaceType') ?? 'company'
  }/${this.spaceID}`;
  protected readonly step = signal(1);
  protected readonly protocol = signal<SsoProtocol>('oidc');
  protected readonly providerPreset = signal<SsoProviderPreset>('entra');
  protected readonly domain = signal(
    this.route.snapshot.queryParamMap.get('domain') ?? '',
  );
  protected readonly issuer = signal('');
  protected readonly clientID = signal('');
  protected readonly clientSecret = signal('');
  protected readonly loginHost = signal('');
  protected readonly samlMetadata = signal('');
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
  protected readonly isOIDC = computed(() => this.protocol() === 'oidc');
  protected readonly domainValid = computed(
    () =>
      emailDomain(`admin@${this.domain()}`) ===
      this.domain().trim().toLowerCase(),
  );
  protected readonly domainVerified = computed(
    () => !!this.config()?.domainVerification?.verifiedAt,
  );
  protected readonly connectionValid = computed(() => {
    if (this.isOIDC()) {
      return (
        !!this.issuer().trim() &&
        !!this.clientID().trim() &&
        (!!this.clientSecret() || !!this.config()?.hasClientSecret)
      );
    }
    return !!this.samlMetadata().trim() || !!this.config()?.hasSamlMetadata;
  });
  protected readonly samlMetadataURL = this.sso.samlMetadataURL();
  protected readonly oidcRedirectURL = `${applicationBaseURL()}/sso/callback`;

  ngOnInit(): void {
    void this.load();
  }

  protected chooseProvider(preset: SsoProviderPreset): void {
    if (this.busy()) {
      return;
    }
    this.providerPreset.set(preset);
    this.protocol.set(preset === 'generic_saml' ? 'saml' : 'oidc');
  }

  protected async prepareDomain(): Promise<void> {
    if (!this.isAdmin() || !this.domainValid() || this.busy()) {
      return;
    }
    this.beginOperation();
    try {
      const config = await firstValueFrom(
        this.sso.prepareDomain({
          spaceID: this.spaceID,
          emailDomain: this.domain().trim().toLowerCase(),
          protocol: this.protocol(),
          providerPreset: this.providerPreset(),
        }),
      );
      this.config.set(config);
      this.step.set(config.domainVerification?.verifiedAt ? 3 : 2);
    } catch (error) {
      this.error.set(ssoErrorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  protected async verifyDomain(): Promise<void> {
    if (this.busy()) {
      return;
    }
    this.beginOperation();
    try {
      const config = await firstValueFrom(this.sso.verifyDomain(this.spaceID));
      this.config.set(config);
      this.success.set('Domain ownership verified. Add the provider details.');
      this.step.set(3);
    } catch (error) {
      this.error.set(ssoErrorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  protected async save(): Promise<void> {
    if (
      !this.isAdmin() ||
      !this.domainVerified() ||
      !this.connectionValid() ||
      this.busy()
    ) {
      return;
    }
    this.beginOperation();
    try {
      const config = await firstValueFrom(
        this.sso.saveConfig({
          spaceID: this.spaceID,
          protocol: this.protocol(),
          providerPreset: this.providerPreset(),
          emailDomain: this.domain().trim().toLowerCase(),
          issuer: this.isOIDC() ? this.issuer().trim() : undefined,
          clientID: this.isOIDC() ? this.clientID().trim() : undefined,
          clientSecret: this.isOIDC() ? this.clientSecret() : undefined,
          loginHost: this.loginHost().trim() || undefined,
          samlIdpMetadataXML: this.isOIDC()
            ? undefined
            : this.samlMetadata().trim(),
        }),
      );
      this.config.set(config);
      this.clientSecret.set('');
      this.success.set(
        'Configuration saved securely. Complete a real provider sign-in to activate it.',
      );
      this.step.set(4);
    } catch (error) {
      this.error.set(ssoErrorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  protected async testAndActivate(): Promise<void> {
    if (this.busy() || !this.domainVerified()) {
      return;
    }
    this.beginOperation();
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

  protected editConnection(): void {
    this.clearMessages();
    this.step.set(3);
  }

  protected changeDomainOrProvider(): void {
    this.clearMessages();
    this.step.set(1);
  }

  protected async disable(): Promise<void> {
    if (this.busy() || this.config()?.status !== 'active') {
      return;
    }
    this.beginOperation();
    try {
      const config = await firstValueFrom(this.sso.disable(this.spaceID));
      this.config.set(config);
      this.success.set('SSO is disabled. Regular sign-in remains available.');
    } catch (error) {
      this.error.set(ssoErrorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  protected async deleteConfiguration(): Promise<void> {
    if (
      this.busy() ||
      !confirm(
        'Delete this SSO configuration and release its domain and login host?',
      )
    ) {
      return;
    }
    this.beginOperation();
    try {
      await firstValueFrom(this.sso.delete(this.spaceID));
      this.config.set(undefined);
      this.issuer.set('');
      this.clientID.set('');
      this.clientSecret.set('');
      this.samlMetadata.set('');
      this.loginHost.set('');
      this.step.set(1);
      this.success.set('SSO configuration deleted. The domain is available.');
    } catch (error) {
      this.error.set(ssoErrorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  private beginOperation(): void {
    this.busy.set(true);
    this.clearMessages();
  }

  private clearMessages(): void {
    this.error.set(undefined);
    this.success.set(undefined);
  }

  private async load(): Promise<void> {
    try {
      const config = await firstValueFrom(this.sso.getConfig(this.spaceID));
      this.config.set(config);
      this.domain.set(config.emailDomains[0] ?? this.domain());
      this.protocol.set(config.protocol);
      this.providerPreset.set(
        config.providerPreset ??
          (config.protocol === 'saml' ? 'generic_saml' : 'generic_oidc'),
      );
      this.issuer.set(config.issuer);
      this.clientID.set(config.clientID);
      this.loginHost.set(config.loginHosts?.[0] ?? '');
      if (
        config.status === 'active' ||
        config.status === 'disabled' ||
        config.hasClientSecret ||
        config.hasSamlMetadata
      ) {
        this.step.set(4);
      } else if (config.domainVerification?.verifiedAt) {
        this.step.set(3);
      } else {
        this.step.set(2);
      }
    } catch (error) {
      if (!(error instanceof HttpErrorResponse) || error.status !== 404) {
        this.error.set(ssoErrorMessage(error));
      }
    } finally {
      this.loading.set(false);
    }
  }
}
