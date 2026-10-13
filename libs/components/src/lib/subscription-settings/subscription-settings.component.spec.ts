import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import {
  ManagedSubscription,
  SubscriptionSettingsComponent,
  SUBSCRIPTION_SETTINGS,
  SubscriptionSettingsPort,
} from './subscription-settings.component';

const item: ManagedSubscription = {
  accountId: 'purchase-one',
  planId: 'datatug-business-usage-monthly',
  label: 'DataTug Business',
  period: 'month',
  kind: 'organisation',
  spaceID: 'source',
  spaceTitle: 'Acme',
  status: 'active',
  paidThroughUTC: '2026-11-13T10:00:00Z',
  scheduledEndUTC: '0001-01-01T00:00:00Z',
  firstPaidUTC: '2026-10-13T10:00:00Z',
  currency: 'EUR',
  regularMinor: 9900,
  renewalMinor: 6930,
  discountPercent: 30,
  priceConfirmed: true,
  launchDiscount: true,
  bindingRevision: 1,
  canCancel: true,
  canTransfer: true,
};
async function setup(accountId = '', transfer = false) {
  let identity!: (value: string | null) => void;
  const port = {
    observeIdentity: vi.fn((callback: (value: string | null) => void) => {
      identity = callback;
      return vi.fn();
    }),
    load: vi.fn().mockResolvedValue({ items: [item] }),
    read: vi.fn().mockResolvedValue(item),
    cancel: vi.fn().mockResolvedValue({
      ...item,
      status: 'cancellation_scheduled',
      canCancel: false,
      scheduledEndUTC: item.paidThroughUTC,
    }),
    transfer: vi.fn().mockResolvedValue(undefined),
    spaces: () => [
      { id: 'source', title: 'Acme' },
      { id: 'target', title: 'Northwind' },
    ],
    message: () => 'Current usage requires settlement. No access was moved.',
    resume: () => undefined,
  } satisfies SubscriptionSettingsPort;
  await TestBed.configureTestingModule({
    imports: [SubscriptionSettingsComponent],
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([]),
      { provide: SUBSCRIPTION_SETTINGS, useValue: port },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(SubscriptionSettingsComponent);
  fixture.componentRef.setInput('accountId', accountId);
  fixture.componentRef.setInput('mode', 'test');
  fixture.componentRef.setInput('transferView', transfer);
  fixture.componentRef.setInput('requestId', 'stable-request');
  const navigate = vi
    .spyOn(TestBed.inject(Router), 'navigate')
    .mockResolvedValue(true);
  await fixture.whenStable();
  const button = (name: string) =>
    [...fixture.nativeElement.querySelectorAll('ion-button')].find(
      (element: unknown) =>
        (element as HTMLElement).textContent?.trim() === name,
    ) as HTMLElement;
  return { fixture, port, identity, navigate, button };
}
it('loads only for a ready identity, pages without duplicates and discards previous-account data', async () => {
  const { fixture, port, identity } = await setup();
  expect(port.load).not.toHaveBeenCalled();
  identity('buyer');
  await fixture.whenStable();
  expect(port.load).toHaveBeenCalledWith('test', '');
  expect(fixture.nativeElement.textContent).toContain(
    'DataTug Business · Acme',
  );
  identity(null);
  await fixture.whenStable();
  expect(fixture.nativeElement.textContent).not.toContain('Acme');
  expect(fixture.nativeElement.textContent).toContain('Sign in');
});
it('cancels only after explicit confirmation and never double-submits', async () => {
  const { fixture, port, identity, button } = await setup('purchase-one');
  identity('buyer');
  await fixture.whenStable();
  expect(port.cancel).not.toHaveBeenCalled();
  button('Cancel renewal').click();
  await fixture.whenStable();
  expect(fixture.nativeElement.textContent).toContain(
    'Your other subscriptions stay active',
  );
  button('Keep subscription').click();
  await fixture.whenStable();
  expect(port.cancel).not.toHaveBeenCalled();
  button('Cancel renewal').click();
  await fixture.whenStable();
  let finish!: (value: ManagedSubscription) => void;
  port.cancel.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const confirm = button('Confirm cancellation at period end');
  confirm.click();
  confirm.click();
  expect(port.cancel).toHaveBeenCalledTimes(1);
  finish({
    ...item,
    status: 'cancellation_scheduled',
    canCancel: false,
    scheduledEndUTC: item.paidThroughUTC,
  });
  await fixture.whenStable();
  expect(fixture.nativeElement.textContent).toContain('Renewal cancelled');
});
it('keeps projects/add-ons explicit and retries transfer with the same operation ID', async () => {
  const { fixture, port, identity, button, navigate } = await setup(
    'purchase-one',
    true,
  );
  identity('buyer');
  await fixture.whenStable();
  expect(fixture.nativeElement.textContent).toContain('Projects stay in Acme');
  expect(fixture.nativeElement.textContent).toContain('SSO add-ons stay');
  fixture.nativeElement
    .querySelector('ion-select')
    .dispatchEvent(
      new CustomEvent('ionChange', { detail: { value: 'target' } }),
    );
  await fixture.whenStable();
  port.transfer.mockRejectedValueOnce(new Error('settlement'));
  button('Confirm transfer of paid access').click();
  await fixture.whenStable();
  expect(fixture.nativeElement.textContent).toContain('No access was moved');
  expect(navigate).not.toHaveBeenCalled();
  button('Confirm transfer of paid access').click();
  await fixture.whenStable();
  expect(port.transfer).toHaveBeenNthCalledWith(
    1,
    'test',
    item,
    'target',
    'stable-request',
  );
  expect(port.transfer).toHaveBeenNthCalledWith(
    2,
    'test',
    item,
    'target',
    'stable-request',
  );
  expect(navigate).toHaveBeenCalledWith(['/subscriptions', 'purchase-one'], {
    queryParams: { checkout: 'test' },
    replaceUrl: true,
  });
});
it('ignores a delayed detail after sign-out and rejects stale transfer choices', async () => {
  const { fixture, port, identity, button } = await setup('purchase-one', true);
  let finish!: (value: ManagedSubscription) => void;
  port.read.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  identity('buyer');
  await fixture.whenStable();
  identity(null);
  finish(item);
  await fixture.whenStable();
  expect(fixture.nativeElement.textContent).not.toContain('Acme');
  identity('buyer');
  await fixture.whenStable();
  fixture.componentRef.setInput('requestId', '../invalid');
  await fixture.whenStable();
  fixture.nativeElement
    .querySelector('ion-select')
    .dispatchEvent(
      new CustomEvent('ionChange', { detail: { value: 'source' } }),
    );
  button('Confirm transfer of paid access').click();
  await fixture.whenStable();
  expect(port.transfer).not.toHaveBeenCalled();
});
