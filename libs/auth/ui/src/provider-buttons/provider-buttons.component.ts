import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import {
  IonCol,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonRow,
  IonSpinner,
} from '@ionic/angular';
import {
  logoApple,
  logoFacebook,
  logoGithub,
  logoGoogle,
  logoWindows,
} from 'ionicons/icons';

/** Fixed display order, independent of the caller's visibility allowlist order. */
export const OAUTH_PROVIDER_IDS = [
  'google.com',
  'apple.com',
  'microsoft.com',
  'facebook.com',
  'github.com',
] as const;
export type OAuthProviderId = (typeof OAUTH_PROVIDER_IDS)[number];
/** Plain text only; absent, blank or over-160-character labels use English defaults. */
export type OAuthProviderLabels = Readonly<
  Partial<Record<OAuthProviderId, string>>
>;
const providers = [
  {
    id: 'google.com',
    label: 'Login with Google',
    icon: logoGoogle,
    color: 'danger',
    spinnerColor: undefined,
  },
  {
    id: 'apple.com',
    label: 'Login with Apple',
    icon: logoApple,
    color: 'dark',
    spinnerColor: undefined,
  },
  {
    id: 'microsoft.com',
    label: 'Login with Microsoft',
    icon: logoWindows,
    color: 'secondary',
    spinnerColor: 'secondary',
  },
  {
    id: 'facebook.com',
    label: 'Login with Facebook',
    icon: logoFacebook,
    color: 'primary',
    spinnerColor: 'primary',
  },
  {
    id: 'github.com',
    label: 'Login with GitHub',
    icon: logoGithub,
    color: 'tertiary',
    spinnerColor: 'tertiary',
  },
] as const;

/** Presentation only: the host owns authentication, readiness, navigation and errors. */
@Component({
  selector: 'sneat-auth-provider-buttons',
  imports: [IonCol, IonIcon, IonItem, IonLabel, IonList, IonRow, IonSpinner],
  templateUrl: './provider-buttons.component.html',
  styles: ':host { display: block; }',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthProviderButtonsComponent {
  readonly providers = input<readonly OAuthProviderId[] | undefined>();
  readonly busy = input<OAuthProviderId | undefined>();
  readonly disabled = input(false);
  readonly labels = input<OAuthProviderLabels>({});
  readonly providerSelected = output<OAuthProviderId>();
  readonly rows = computed(() =>
    [providers.slice(0, 2), providers.slice(2, 4), providers.slice(4)]
      .map((row) =>
        row.filter(
          (provider) => this.providers()?.includes(provider.id) ?? true,
        ),
      )
      .filter((row) => row.length),
  );
  protected label(provider: (typeof providers)[number]): string {
    const label = this.labels()[provider.id];
    return typeof label === 'string' &&
      label.trim().length &&
      label.length <= 160
      ? label.trim()
      : provider.label;
  }
  protected select(provider: OAuthProviderId): void {
    if (
      !this.disabled() &&
      !this.busy() &&
      (this.providers()?.includes(provider) ?? true)
    )
      this.providerSelected.emit(provider);
  }
}
