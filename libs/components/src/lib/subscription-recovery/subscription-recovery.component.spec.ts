import { TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  convertToParamMap,
  provideRouter,
} from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import {
  SubscriptionRecoveryComponent,
  SUBSCRIPTION_RECOVERY,
  SubscriptionRecoveryPort,
} from './subscription-recovery.component';

async function setup() {
  const params = new BehaviorSubject(convertToParamMap({ checkout: 'test' }));
  let identity!: (id: string | null) => void;
  const load = vi.fn().mockResolvedValue({ items: [] });
  const stop = vi.fn();
  const port: SubscriptionRecoveryPort = {
    observeIdentity(callback) {
      identity = callback;
      return stop;
    },
    load,
  };
  await TestBed.configureTestingModule({
    imports: [SubscriptionRecoveryComponent],
    providers: [
      provideRouter([]),
      { provide: ActivatedRoute, useValue: { queryParamMap: params } },
      { provide: SUBSCRIPTION_RECOVERY, useValue: port },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(SubscriptionRecoveryComponent);
  await fixture.whenStable();
  return { fixture, params, load, stop, identity };
}
it('loads only for signed-in buyers and clears all previous data on sign-out', async () => {
  const { fixture, identity, load, stop } = await setup();
  expect(load).not.toHaveBeenCalled();
  load.mockResolvedValue({
    items: [
      {
        id: 'one',
        label: 'Business monthly',
        action: 'Finish setup',
        path: '/pricing/return',
        query: { mode: 'test', session_id: 'cs_test_one' },
      },
    ],
  });
  identity('buyer');
  await fixture.whenStable();
  expect(load).toHaveBeenCalledWith('test', '');
  expect(fixture.nativeElement.textContent).toContain('Finish setup');
  expect(
    fixture.nativeElement.querySelector('ion-item').getAttribute('href'),
  ).toContain('mode=test');
  identity(null);
  await fixture.whenStable();
  expect(fixture.nativeElement.textContent).not.toContain('Business monthly');
  fixture.destroy();
  expect(stop).toHaveBeenCalled();
});
it('discards a delayed response after identity or mode changes', async () => {
  const { fixture, identity, load, params } = await setup();
  let finish!: (value: unknown) => void;
  load.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  identity('old');
  identity(null);
  finish({
    items: [
      {
        id: 'foreign',
        label: 'Old buyer data',
        action: 'Finish',
        path: '/',
        query: {},
      },
    ],
  });
  await fixture.whenStable();
  expect(fixture.nativeElement.textContent).not.toContain('Old buyer');
  params.next(convertToParamMap({ checkout: 'live' }));
  identity('buyer');
  fixture.componentInstance.refresh();
  await fixture.whenStable();
  expect(load).toHaveBeenCalledTimes(1);
});
it('retries a failed read, pages results and refreshes after returning to the account', async () => {
  const { fixture, identity, load } = await setup();
  load.mockRejectedValueOnce(new Error('unavailable'));
  identity('buyer');
  await fixture.whenStable();
  expect(fixture.nativeElement.textContent).toContain('could not be checked');
  load.mockResolvedValueOnce({ items: [], next: 'billing_after' });
  fixture.nativeElement.querySelector('ion-button').click();
  await fixture.whenStable();
  expect(fixture.nativeElement.textContent).toContain('Show more purchases');
  load.mockResolvedValueOnce({ items: [] });
  fixture.nativeElement.querySelector('ion-button').click();
  await fixture.whenStable();
  expect(load).toHaveBeenLastCalledWith('test', 'billing_after');
  fixture.componentInstance.refresh();
  await fixture.whenStable();
  expect(load).toHaveBeenLastCalledWith('test', '');
});
