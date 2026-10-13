import {
  ChangeDetectionStrategy,
  Component,
  InjectionToken,
  OnDestroy,
  inject,
  input,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { IonButton } from '@ionic/angular/ion-button';
import { IonCard } from '@ionic/angular/ion-card';
import { IonCardContent } from '@ionic/angular/ion-card-content';
import { IonCardHeader } from '@ionic/angular/ion-card-header';
import { IonCardTitle } from '@ionic/angular/ion-card-title';
import { IonItem } from '@ionic/angular/ion-item';
import { IonLabel } from '@ionic/angular/ion-label';
import { IonList } from '@ionic/angular/ion-list';
import { IonNote } from '@ionic/angular/ion-note';

export type SubscriptionRecoveryMode = 'live' | 'test';
export interface SubscriptionRecoveryItem {
  id: string;
  label: string;
  description?: string;
  action: string;
  path: string;
  query: Record<string, string>;
}
export interface SubscriptionRecoveryPort {
  observeIdentity(callback: (id: string | null) => void): () => void;
  load(
    mode: SubscriptionRecoveryMode,
    after: string,
  ): Promise<{ items: SubscriptionRecoveryItem[]; next?: string }>;
}
/** The host supplies authenticated read-only billing infrastructure. */
export const SUBSCRIPTION_RECOVERY =
  new InjectionToken<SubscriptionRecoveryPort>('SubscriptionRecovery');

@Component({
  selector: 'sneat-subscription-recovery',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    IonButton,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardTitle,
    IonItem,
    IonLabel,
    IonList,
    IonNote,
  ],
  template: `
    @if (
      port && signedIn() && (busy() || error() || items().length || next())
    ) {
      <ion-card aria-label="Unfinished subscriptions">
        <ion-card-header
          ><ion-card-title
            >{{ title() }}
            @if (mode() === 'test') {
              · Test mode
            }
          </ion-card-title></ion-card-header
        >
        <ion-card-content>
          @if (items().length) {
            <ion-list>
              @for (item of items(); track item.id) {
                <ion-item
                  [routerLink]="item.path"
                  [queryParams]="item.query"
                  button
                  detail
                >
                  <ion-label class="ion-text-wrap"
                    ><h2>{{ item.label }}</h2>
                    @if (item.description) {
                      <p>{{ item.description }}</p>
                    }
                    <p>{{ item.action }}</p></ion-label
                  >
                </ion-item>
              }
            </ion-list>
          }
          @if (busy()) {
            <p role="status">Checking your purchases…</p>
          }
          @if (error()) {
            <p role="alert">{{ error() }}</p>
            <ion-button fill="outline" (click)="load(false)">Retry</ion-button>
          }
          @if (next() && !busy() && !error()) {
            <ion-button fill="clear" (click)="load(true)"
              >Show more purchases</ion-button
            >
          }
          <ion-note
            >Opening a purchase checks its current status. It does not charge
            you again.</ion-note
          >
        </ion-card-content>
      </ion-card>
    }
  `,
})
export class SubscriptionRecoveryComponent implements OnDestroy {
  protected readonly port = inject(SUBSCRIPTION_RECOVERY, { optional: true });
  private readonly route = inject(ActivatedRoute);
  readonly title = input('Finish subscription setup');
  protected readonly items = signal<SubscriptionRecoveryItem[]>([]);
  protected readonly mode = signal<SubscriptionRecoveryMode>('live');
  protected readonly signedIn = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly next = signal('');
  private generation = 0;
  private observerGeneration = 0;
  private identity: string | null = null;
  private stopIdentity?: () => void;
  private readonly routeSubscription = this.route.queryParamMap.subscribe(
    (params) => {
      this.generation++;
      const observerGeneration = ++this.observerGeneration;
      this.stopIdentity?.();
      this.items.set([]);
      this.next.set('');
      this.error.set('');
      this.busy.set(false);
      this.signedIn.set(false);
      const values = params.getAll('checkout');
      if (values.length > 1 || (values.length === 1 && values[0] !== 'test'))
        return;
      this.mode.set(values[0] === 'test' ? 'test' : 'live');
      this.stopIdentity = this.port?.observeIdentity((id) => {
        if (observerGeneration !== this.observerGeneration) return;
        this.generation++;
        this.identity = id;
        this.signedIn.set(Boolean(id));
        this.items.set([]);
        this.next.set('');
        this.busy.set(false);
        this.error.set('');
        if (id) void this.load(false);
      });
    },
  );

  protected async load(more: boolean): Promise<void> {
    if (!this.port || !this.identity || this.busy()) return;
    const generation = this.generation;
    const after = more ? this.next() : '';
    this.busy.set(true);
    this.error.set('');
    try {
      const page = await this.port.load(this.mode(), after);
      if (generation !== this.generation) return;
      const items = more ? [...this.items(), ...page.items] : page.items;
      this.items.set([
        ...new Map(items.map((item) => [item.id, item])).values(),
      ]);
      this.next.set(page.next ?? '');
    } catch {
      if (generation === this.generation)
        this.error.set('Your purchases could not be checked. Please retry.');
    } finally {
      if (generation === this.generation) this.busy.set(false);
    }
  }
  refresh(): void {
    if (this.busy()) return;
    this.generation++;
    this.next.set('');
    void this.load(false);
  }
  ngOnDestroy(): void {
    this.generation++;
    this.observerGeneration++;
    this.stopIdentity?.();
    this.routeSubscription.unsubscribe();
  }
}
