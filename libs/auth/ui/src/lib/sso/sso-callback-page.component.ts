import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { SneatAuthStateService } from '@sneat/auth-core';
import { firstValueFrom } from 'rxjs';
import { SsoApiService } from './sso-api.service';
import { ssoErrorMessage } from './sso-errors';
import { ssoBrowserBindingStorageKey } from './sso.models';

@Component({
  selector: 'sneat-sso-callback-page',
  templateUrl: './sso-callback-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    IonButton,
    IonCard,
    IonCardContent,
    IonContent,
    IonHeader,
    IonSpinner,
    IonText,
    IonTitle,
    IonToolbar,
  ],
})
export class SsoCallbackPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly sso = inject(SsoApiService);
  private readonly auth = inject(SneatAuthStateService);

  protected readonly error = signal<string | undefined>(undefined);

  ngOnInit(): void {
    void this.finishSignIn();
  }

  private async finishSignIn(): Promise<void> {
    const code = this.route.snapshot.queryParamMap.get('code');
    if (!code) {
      this.error.set('The SSO callback is missing its one-time sign-in code.');
      return;
    }
    const browserBinding = sessionStorage.getItem(ssoBrowserBindingStorageKey);
    if (!browserBinding) {
      this.error.set(
        'This SSO sign-in was started in another browser or has expired.',
      );
      return;
    }
    sessionStorage.removeItem(ssoBrowserBindingStorageKey);
    try {
      const exchange = await firstValueFrom(
        this.sso.exchange(code, browserBinding),
      );
      const credential = await this.auth.signInWithToken(
        exchange.firebaseCustomToken,
      );
      if (credential.user.uid !== exchange.userID) {
        await this.auth.signOut();
        throw new Error(
          'The signed-in Firebase user did not match the linked Sneat user.',
        );
      }
      await this.router.navigateByUrl('/', { replaceUrl: true });
    } catch (error) {
      this.error.set(ssoErrorMessage(error));
    }
  }
}
