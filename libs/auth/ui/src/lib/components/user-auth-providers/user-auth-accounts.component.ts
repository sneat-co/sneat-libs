import {
  ChangeDetectionStrategy,
  Component,
  input,
  signal,
} from '@angular/core';
import {
  IonCard,
  IonCardContent,
  IonIcon,
  IonItem,
  IonItemDivider,
  IonLabel,
  IonList,
} from '@ionic/angular';
import { AuthProviderID } from '@sneat/auth-core';
import { ClassName, SneatBaseComponent } from '@sneat/ui';
import { TelegramAuthAccountComponent } from './telegram-auth-account.component';
import { UserAuthAProviderStatusComponent } from './user-auth-provider-status';

@Component({
  selector: 'sneat-user-auth-accounts',
  templateUrl: './user-auth-accounts.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TelegramAuthAccountComponent,
    UserAuthAProviderStatusComponent,
    IonCard,
    IonList,
    IonItemDivider,
    IonLabel,
    IonItem,
    IonIcon,
    IonCardContent,
  ],
  providers: [
    {
      provide: ClassName,
      useValue: 'UserAuthAccountsComponent',
    },
  ],
})
export class UserAuthAccountsComponent extends SneatBaseComponent {
  /**
   * The messaging-apps section (WhatsApp, Viber) and its Sneat.app
   * copy. Apps that only need sign-in methods turn it off.
   */
  readonly showMessagingApps = input(true);

  protected readonly signingInWith = signal<AuthProviderID | undefined>(
    undefined,
  );
}
