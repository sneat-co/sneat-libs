import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  IonButton,
  IonButtons,
  IonIcon,
  IonItem,
  IonLabel,
  IonText,
} from '@ionic/angular';
import {
  TelegramAuthApi,
  telegramAuthApiFactory,
} from '../../pages/login-page/telegram-login-config';
import { AuthStatuses, SneatAuthStateService } from '@sneat/auth-core';
import { Subscription } from 'rxjs';
import { LoginWithTelegramComponent } from '../../pages/login-page/login-with-telegram.component';

interface TelegramLink {
  connected: boolean;
  username?: string;
}

/** Shared Quick logins row. The authenticated API owns the Telegram identity. */
@Component({
  selector: 'sneat-telegram-auth-account',
  providers: [{ provide: TelegramAuthApi, useFactory: telegramAuthApiFactory }],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonButton,
    IonButtons,
    IonIcon,
    IonItem,
    IonLabel,
    IonText,
    LoginWithTelegramComponent,
  ],
  template: `
    <ion-item>
      <ion-icon slot="start" name="paper-plane" color="primary" />
      <ion-label>
        <h3>Telegram</h3>
        <p role="status" aria-live="polite">
          @if (loading()) {
            Checking Telegram connection…
          } @else if (link()?.connected) {
            <ion-text color="success"
              >Connected{{
                link()?.username ? ' as @' + link()?.username : ''
              }}</ion-text
            >
          } @else if (ready() && !error()) {
            Not connected yet.
          } @else if (!ready()) {
            Sign in to manage Telegram.
          }
        </p>
        <p role="alert" [hidden]="!error()">
          <ion-text color="danger">{{ error() }}</ion-text>
        </p>
      </ion-label>
      <ion-buttons slot="end">
        <span>
          @if (error() && ready()) {
            <ion-button
              (click)="refresh()"
              [disabled]="loading() || disconnecting()"
              >Retry</ion-button
            >
          }
          @if (link()?.connected) {
            <ion-button
              color="warning"
              (click)="disconnect()"
              [disabled]="!ready() || loading() || disconnecting()"
            >
              {{ disconnecting() ? 'Disconnecting…' : 'Disconnect' }}
            </ion-button>
          } @else if (ready() && !loading() && !error()) {
            @for (uid of [userID()]; track uid) {
              <sneat-login-with-telegram
                [isUserAuthenticated]="true"
                (authenticated)="linked(uid)"
                (authenticationFailed)="linkFailed(uid)"
              />
            }
          }
        </span>
      </ion-buttons>
    </ion-item>
  `,
})
export class TelegramAuthAccountComponent {
  private readonly api = inject(TelegramAuthApi);
  private readonly auth = inject(SneatAuthStateService);
  private readonly destroyRef = inject(DestroyRef);
  private uid?: string;
  protected readonly userID = signal<string | undefined>(undefined);
  private generation = 0;
  private request?: Subscription;
  protected readonly ready = signal(false);
  protected readonly link = signal<TelegramLink | undefined>(undefined);
  protected readonly loading = signal(false);
  protected readonly disconnecting = signal(false);
  protected readonly error = signal('');

  constructor() {
    this.auth.authState
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => {
        const uid = state.user?.uid;
        const ready =
          state.status === AuthStatuses.authenticated &&
          !!uid &&
          !state.err &&
          (state.loadingPhase === undefined ||
            (state.loadingPhase === 'ready' && !!state.token));
        const wasReady = this.ready();
        if (uid !== this.uid || !ready) {
          this.generation++;
          this.request?.unsubscribe();
          this.loading.set(false);
          this.disconnecting.set(false);
          this.link.set(undefined);
          this.error.set('');
        }
        this.uid = uid;
        this.userID.set(uid);
        this.ready.set(ready);
        if (ready && (!wasReady || !this.link())) this.refresh();
      });
  }

  protected refresh(): void {
    if (!this.ready() || this.disconnecting()) return;
    const generation = ++this.generation;
    this.request?.unsubscribe();
    this.loading.set(true);
    this.error.set('');
    this.request = this.api
      .get<TelegramLink>('auth/telegram-link')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (link) => {
          if (generation !== this.generation) return;
          this.link.set(link);
          this.loading.set(false);
        },
        error: () => {
          if (generation !== this.generation) return;
          this.loading.set(false);
          this.error.set('Could not check Telegram connection. Please retry.');
        },
      });
  }

  protected linked(uid: string | undefined): void {
    if (uid === this.uid) this.refresh();
  }

  protected linkFailed(uid: string | undefined): void {
    if (uid !== this.uid) return;
    this.error.set('Could not connect Telegram. Please retry.');
  }

  protected disconnect(): void {
    if (
      !this.ready() ||
      !this.link()?.connected ||
      this.loading() ||
      this.disconnecting()
    )
      return;
    if (!confirm('Disconnect Telegram login from your account?')) return;
    const generation = ++this.generation;
    this.request?.unsubscribe();
    this.disconnecting.set(true);
    this.error.set('');
    this.request = this.api
      .delete('auth/disconnect?provider=telegram')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          if (generation !== this.generation) return;
          this.disconnecting.set(false);
          this.refresh();
        },
        error: () => {
          if (generation !== this.generation) return;
          this.disconnecting.set(false);
          this.error.set('Could not disconnect Telegram. Please retry.');
        },
      });
  }
}
