import {
  ChangeDetectionStrategy,
  Component,
  InjectionToken,
  OnDestroy,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { IonButton } from '@ionic/angular/ion-button';
import { IonCard } from '@ionic/angular/ion-card';
import { IonCardContent } from '@ionic/angular/ion-card-content';
import { IonCardHeader } from '@ionic/angular/ion-card-header';
import { IonCardTitle } from '@ionic/angular/ion-card-title';
import { IonItem } from '@ionic/angular/ion-item';
import { IonLabel } from '@ionic/angular/ion-label';
import { IonList } from '@ionic/angular/ion-list';
import { IonSelect } from '@ionic/angular/ion-select';
import { IonSelectOption } from '@ionic/angular/ion-select-option';

export interface ManagedSubscription {
  accountId: string;
  planId: string;
  label: string;
  period: 'month' | 'year';
  kind: 'personal' | 'organisation';
  spaceID?: string;
  spaceTitle: string;
  status: string;
  paidThroughUTC: string;
  scheduledEndUTC: string;
  firstPaidUTC: string;
  currency?: string;
  regularMinor: number;
  renewalMinor: number;
  discountPercent: number;
  priceConfirmed: boolean;
  launchDiscount: boolean;
  bindingRevision: number;
  canCancel: boolean;
  canTransfer: boolean;
  sessionId?: string;
}
export interface SubscriptionSettingsPort {
  observeIdentity(callback: (id: string | null) => void): () => void;
  load(
    mode: 'live' | 'test',
    after: string,
  ): Promise<{ items: ManagedSubscription[]; next?: string }>;
  read(mode: 'live' | 'test', id: string): Promise<ManagedSubscription>;
  cancel(mode: 'live' | 'test', id: string): Promise<ManagedSubscription>;
  transfer(
    mode: 'live' | 'test',
    item: ManagedSubscription,
    target: string,
    requestId: string,
  ): Promise<void>;
  spaces(): { id: string; title: string }[];
  resume(
    mode: 'live' | 'test',
    item: ManagedSubscription,
  ): { path: string; query: Record<string, string> } | undefined;
  message(error: unknown): string;
}
export const SUBSCRIPTION_SETTINGS =
  new InjectionToken<SubscriptionSettingsPort>('SubscriptionSettings');

@Component({
  selector: 'sneat-subscription-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    CurrencyPipe,
    DatePipe,
    IonButton,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardTitle,
    IonItem,
    IonLabel,
    IonList,
    IonSelect,
    IonSelectOption,
  ],
  template: `
    @if (!identity()) {
      <ion-card
        ><ion-card-content
          >Sign in to manage your subscriptions.</ion-card-content
        ></ion-card
      >
    } @else {
      @if (busy()) {
        <p role="status">Checking your subscriptions…</p>
      }
      @if (error()) {
        <ion-card
          ><ion-card-content
            ><p role="alert">{{ error() }}</p>
            <ion-button fill="outline" [disabled]="busy()" (click)="refresh()"
              >Retry</ion-button
            >
          </ion-card-content></ion-card
        >
      }
      @if (!accountId()) {
        @if (!busy() && !error() && !items().length) {
          <p>No subscriptions found.</p>
        }
        <ion-list aria-label="Your subscriptions">
          @for (item of items(); track item.accountId) {
            <ion-item
              button
              detail
              [routerLink]="[basePath(), item.accountId]"
              [queryParams]="query()"
            >
              <ion-label class="ion-text-wrap"
                ><h2>{{ item.label }} · {{ item.spaceTitle }}</h2>
                <p>{{ status(item) }}</p>
                @if (item.priceConfirmed) {
                  <p>
                    {{ item.renewalMinor / 100 | currency: item.currency }} /
                    {{ item.period }}
                  </p>
                }
                <p>Reference {{ item.accountId.slice(-8) }}</p>
              </ion-label>
            </ion-item>
          }
        </ion-list>
        @if (next()) {
          <ion-button fill="clear" [disabled]="busy()" (click)="loadMore()"
            >Show more subscriptions</ion-button
          >
        }
      } @else if (selected(); as item) {
        <ion-card>
          <ion-card-header
            ><ion-card-title>{{ item.label }}</ion-card-title></ion-card-header
          >
          <ion-card-content>
            <p>
              Receiving space: <strong>{{ item.spaceTitle }}</strong>
            </p>
            <p>{{ status(item) }}</p>
            @if (item.priceConfirmed) {
              <p>
                Regular price:
                {{ item.regularMinor / 100 | currency: item.currency }} /
                {{ item.period }}
              </p>
              @if (item.discountPercent) {
                <p>
                  {{
                    item.launchDiscount
                      ? 'Launch discount'
                      : 'Renewal discount'
                  }}: {{ item.discountPercent }}%
                </p>
              }
              <p>
                <strong
                  >{{
                    item.scheduledEndUTC.startsWith('0001-')
                      ? 'Renewal'
                      : 'Price per period'
                  }}: {{ item.renewalMinor / 100 | currency: item.currency }} /
                  {{ item.period }}</strong
                >
              </p>
            } @else {
              <p>Price requires a payment status check.</p>
            }
            @if (!item.paidThroughUTC.startsWith('0001-')) {
              <p>Paid through {{ item.paidThroughUTC | date: 'mediumDate' }}</p>
            }
            @if (!item.scheduledEndUTC.startsWith('0001-')) {
              <p>
                Renewal cancelled. Access ends
                {{ item.scheduledEndUTC | date: 'mediumDate' }}.
              </p>
            }
            @if (resume(item); as continuation) {
              <ion-button
                [routerLink]="continuation.path"
                [queryParams]="continuation.query"
                >{{
                  item.status === 'setup_required'
                    ? 'Finish subscription setup'
                    : 'Check payment status'
                }}</ion-button
              >
            }
            @if (!transferView() && item.canTransfer) {
              <ion-button
                fill="outline"
                [routerLink]="[basePath(), item.accountId, 'transfer']"
                [queryParams]="transferQuery()"
                [disabled]="busy()"
                >Transfer paid access</ion-button
              >
            }
            @if (!transferView() && item.canCancel && !confirmCancel()) {
              <ion-button
                fill="clear"
                color="danger"
                [disabled]="busy()"
                (click)="confirmCancel.set(true)"
                >Cancel renewal</ion-button
              >
            }
          </ion-card-content>
        </ion-card>
        @if (confirmCancel()) {
          <ion-card aria-label="Confirm cancellation"
            ><ion-card-content>
              <p>
                Cancel renewal for {{ item.label }} in {{ item.spaceTitle }}?
              </p>
              <p>
                Paid access remains until
                {{ item.paidThroughUTC | date: 'mediumDate' }}. Your other
                subscriptions stay active.
              </p>
              <ion-button color="danger" [disabled]="busy()" (click)="cancel()"
                >Confirm cancellation at period end</ion-button
              >
              <ion-button
                fill="clear"
                [disabled]="busy()"
                (click)="confirmCancel.set(false)"
                >Keep subscription</ion-button
              >
            </ion-card-content></ion-card
          >
        }
        @if (transferView()) {
          <ion-card aria-label="Transfer paid access"
            ><ion-card-header
              ><ion-card-title
                >Transfer paid access</ion-card-title
              ></ion-card-header
            >
            <ion-card-content>
              <p>
                Projects stay in {{ item.spaceTitle }}. That space loses this
                subscription's paid access after transfer; normal expiry
                restrictions apply.
              </p>
              <p>
                Billing dates, discount and the original introductory period
                stay unchanged. Separate prepaid capacity and SSO add-ons stay
                in their current space.
              </p>
              <p>
                Transfers with consumed current-period allowance require
                settlement first; transferring never grants a fresh allowance.
              </p>
              @if (!item.canTransfer) {
                <p role="alert">
                  This subscription cannot currently be transferred. Check its
                  payment status first.
                </p>
              }
              <ion-select
                label="Receiving business space"
                interface="popover"
                [value]="target()"
                [disabled]="busy() || !item.canTransfer"
                (ionChange)="target.set($event.detail.value)"
              >
                @for (space of eligibleSpaces(); track space.id) {
                  <ion-select-option [value]="space.id">{{
                    space.title
                  }}</ion-select-option>
                }
              </ion-select>
              @if (!eligibleSpaces().length) {
                <p>No other eligible business space is available.</p>
              }
              <ion-button
                [disabled]="
                  busy() || !target() || !item.canTransfer || !validRequest()
                "
                (click)="transfer()"
                >Confirm transfer of paid access</ion-button
              >
              <ion-button
                fill="clear"
                [routerLink]="[basePath(), item.accountId]"
                [queryParams]="query()"
                [disabled]="busy()"
                >Cancel</ion-button
              >
            </ion-card-content>
          </ion-card>
        }
      }
    }
  `,
})
export class SubscriptionSettingsComponent implements OnDestroy {
  private readonly port = inject(SUBSCRIPTION_SETTINGS, { optional: true });
  private readonly router = inject(Router);
  readonly accountId = input('');
  readonly mode = input<'live' | 'test'>('live');
  readonly transferView = input(false);
  readonly requestId = input('');
  readonly basePath = input('/subscriptions');
  protected readonly identity = signal<string | null>(null);
  protected readonly items = signal<ManagedSubscription[]>([]);
  protected readonly selected = signal<ManagedSubscription | null>(null);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly next = signal('');
  protected readonly target = signal('');
  protected readonly confirmCancel = signal(false);
  protected readonly query = computed(() =>
    this.mode() === 'test' ? { checkout: 'test' } : {},
  );
  protected readonly transferQuery = computed(() => ({
    ...this.query(),
    requestId: `${this.selected()?.bindingRevision ?? 0}-${crypto.randomUUID()}`,
  }));
  protected readonly validRequest = computed(() =>
    /^[A-Za-z0-9_-]{1,128}$/.test(this.requestId()),
  );
  protected readonly eligibleSpaces = computed(() =>
    (this.port?.spaces() ?? []).filter(
      (s) => s.id !== this.selected()?.spaceID,
    ),
  );
  private generation = 0;
  private key = '';
  private readonly stop = this.port?.observeIdentity((id) =>
    this.identity.set(id),
  );
  constructor() {
    effect(() => {
      const key = [
        this.identity(),
        this.mode(),
        this.accountId(),
        this.transferView(),
        this.requestId(),
      ].join('|');
      if (key === this.key) return;
      this.key = key;
      this.generation++;
      this.items.set([]);
      this.selected.set(null);
      this.next.set('');
      this.error.set('');
      this.busy.set(false);
      this.target.set('');
      this.confirmCancel.set(false);
      if (this.identity())
        untracked(() => {
          void this.read(false);
        });
    });
  }
  protected status(item: ManagedSubscription): string {
    return (
      (
        {
          active: 'Active',
          ended: 'Ended',
          refunded: 'Refunded',
          cancellation_scheduled: 'Cancellation scheduled',
          setup_required: 'Payment received · Finish setup',
          check_status: 'Payment status check required',
        } as Record<string, string>
      )[item.status] ?? 'Status unavailable'
    );
  }
  protected resume(item: ManagedSubscription) {
    return this.port?.resume(this.mode(), item);
  }
  private async read(more: boolean): Promise<void> {
    if (!this.port || !this.identity() || this.busy()) return;
    const generation = this.generation;
    this.busy.set(true);
    this.error.set('');
    try {
      if (this.accountId()) {
        const item = await this.port.read(this.mode(), this.accountId());
        if (generation === this.generation) this.selected.set(item);
      } else {
        const page = await this.port.load(this.mode(), more ? this.next() : '');
        if (generation === this.generation) {
          this.items.set([
            ...new Map(
              [...(more ? this.items() : []), ...page.items].map((i) => [
                i.accountId,
                i,
              ]),
            ).values(),
          ]);
          this.next.set(page.next ?? '');
        }
      }
    } catch (error) {
      if (generation === this.generation)
        this.error.set(this.port.message(error));
    } finally {
      if (generation === this.generation) this.busy.set(false);
    }
  }
  refresh(): void {
    if (!this.busy()) void this.read(false);
  }
  protected loadMore(): void {
    void this.read(true);
  }
  protected async cancel(): Promise<void> {
    const item = this.selected();
    if (!item || !this.port || this.busy() || !this.confirmCancel()) return;
    const generation = this.generation;
    this.busy.set(true);
    this.error.set('');
    try {
      const result = await this.port.cancel(this.mode(), item.accountId);
      if (generation === this.generation) {
        this.selected.set(result);
        this.confirmCancel.set(false);
      }
    } catch (error) {
      if (generation === this.generation)
        this.error.set(this.port.message(error));
    } finally {
      if (generation === this.generation) this.busy.set(false);
    }
  }
  protected async transfer(): Promise<void> {
    const item = this.selected();
    if (
      !item ||
      !this.port ||
      this.busy() ||
      !this.validRequest() ||
      !this.eligibleSpaces().some((s) => s.id === this.target()) ||
      !item.canTransfer
    )
      return;
    const generation = this.generation;
    this.busy.set(true);
    this.error.set('');
    try {
      await this.port.transfer(
        this.mode(),
        item,
        this.target(),
        this.requestId(),
      );
      if (generation === this.generation)
        await this.router.navigate([this.basePath(), item.accountId], {
          queryParams: this.query(),
          replaceUrl: true,
        });
    } catch (error) {
      if (generation === this.generation)
        this.error.set(this.port.message(error));
    } finally {
      if (generation === this.generation) this.busy.set(false);
    }
  }
  ngOnDestroy(): void {
    this.generation++;
    this.stop?.();
  }
}
