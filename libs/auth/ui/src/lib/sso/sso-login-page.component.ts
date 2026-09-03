import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
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
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { SsoApiService } from './sso-api.service';
import { ssoErrorMessage } from './sso-errors';
import {
  applicationBaseURL,
  emailDomain,
  ssoBrowserBindingStorageKey,
} from './sso.models';

@Component({
  selector: 'sneat-sso-login-page',
  templateUrl: './sso-login-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
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
    IonSpinner,
    IonText,
    IonTitle,
    IonToolbar,
  ],
})
export class SsoLoginPageComponent implements OnInit {
  private readonly sso = inject(SsoApiService);

  protected readonly workEmail = signal('');
  protected readonly fixedDomain = signal<string | undefined>(undefined);
  protected readonly unknownDomain = signal<string | undefined>(undefined);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | undefined>(undefined);
  protected readonly validEmail = computed(() => {
    const domain = emailDomain(this.workEmail());
    return !!domain && (!this.fixedDomain() || domain === this.fixedDomain());
  });
  protected readonly regularLoginURL = computed(() => {
    const domain = this.unknownDomain();
    const next = `/sso/setup${domain ? `?domain=${encodeURIComponent(domain)}` : ''}`;
    return `/login#${next}`;
  });

  ngOnInit(): void {
    // An unknown host is intentionally ignored; ordinary app hosts still use
    // email-domain discovery. A claimed tenant host returns its fixed domain.
    firstValueFrom(this.sso.discover(''))
      .then((result) => {
        if (result.configured && result.fixedDomain) {
          this.fixedDomain.set(result.domain);
        }
      })
      .catch(() => undefined);
  }

  protected async continue(): Promise<void> {
    if (!this.validEmail() || this.busy()) {
      return;
    }
    this.busy.set(true);
    this.error.set(undefined);
    this.unknownDomain.set(undefined);
    try {
      const discovery = await firstValueFrom(
        this.sso.discover(this.workEmail()),
      );
      if (!discovery.configured) {
        this.unknownDomain.set(discovery.domain);
        return;
      }
      const start = await firstValueFrom(
        this.sso.startLogin(this.workEmail(), applicationBaseURL()),
      );
      if (!start.browserBinding) {
        throw new Error('The SSO service did not bind this sign-in attempt.');
      }
      sessionStorage.setItem(ssoBrowserBindingStorageKey, start.browserBinding);
      location.assign(start.authorizationURL);
    } catch (error) {
      this.error.set(ssoErrorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }
}
