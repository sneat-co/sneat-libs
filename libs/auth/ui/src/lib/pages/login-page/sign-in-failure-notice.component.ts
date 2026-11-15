import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
} from '@angular/core';
import { IonButton, IonItem, IonLabel, IonNote, IonText } from '@ionic/angular';
import { ISignInFailure } from '@sneat/auth-core';
import { AUTH_UI_LABELS } from '../../i18n/auth-ui-labels';

/**
 * Explains why the user is still on the sign-in form: a short summary, what
 * to try, and the technical details support needs. Non-blocking — the sign-in
 * methods stay usable below it.
 */
@Component({
  selector: 'sneat-sign-in-failure-notice',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonButton, IonItem, IonLabel, IonNote, IonText],
  template: `
    @if (failure(); as f) {
      <div role="alert">
        <ion-item lines="none">
          <ion-label class="ion-text-wrap">
            <h2>
              <ion-text color="danger">{{ f.summary }}</ion-text>
            </h2>
            @for (hint of f.hints; track hint) {
              <p class="sign-in-failure-hint">{{ hint }}</p>
            }
            <ion-note class="sign-in-failure-details">
              {{ L().failureDetails }}
              @if (f.code) {
                <code>{{ f.code }}</code>
              }
              @if (f.message) {
                — {{ f.message }}
              }
              @if (f.host) {
                {{ L().failureOnHost(f.host) }}
              }
            </ion-note>
          </ion-label>
        </ion-item>
        <div class="ion-padding-horizontal">
          @if (canRetry()) {
            <ion-button size="small" fill="outline" (click)="retry.emit()">
              {{ L().tryAgain }}
            </ion-button>
          }
          <ion-button
            size="small"
            fill="clear"
            color="medium"
            (click)="dismiss.emit()"
          >
            {{ L().dismiss }}
          </ion-button>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .sign-in-failure-details {
        display: block;
        font-size: smaller;
        margin-top: 4px;
        user-select: text;
      }
    `,
  ],
})
export class SignInFailureNoticeComponent {
  protected readonly L = inject(AUTH_UI_LABELS);
  readonly failure = input<ISignInFailure | undefined>();
  readonly canRetry = input(false);
  readonly retry = output<void>();
  readonly dismiss = output<void>();
}
