import { Component, CUSTOM_ELEMENTS_SCHEMA, output } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { SneatApiService } from '@sneat/api';
import {
  AuthStatuses,
  ISneatAuthState,
  ISneatAuthUser,
  SneatAuthStateService,
} from '@sneat/auth-core';
import { BehaviorSubject, Subject } from 'rxjs';
import { TelegramAuthAccountComponent } from './telegram-auth-account.component';
@Component({
  selector: 'sneat-login-with-telegram',
  template: '',
  inputs: ['isUserAuthenticated'],
})
class TelegramLoginStub {
  readonly authenticated = output<void>();
  readonly authenticationFailed = output<void>();
}
describe('TelegramAuthAccountComponent', () => {
  let fixture: ComponentFixture<TelegramAuthAccountComponent>;
  let auth: BehaviorSubject<ISneatAuthState>;
  let status: Subject<{ connected: boolean; username?: string }>;
  let unlink: Subject<void>;
  let api: { get: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn> };
  const ready = (uid: string): ISneatAuthState => ({
    status: AuthStatuses.authenticated,
    user: { uid } as ISneatAuthUser,
  });
  const text = () => fixture.nativeElement.textContent as string;
  const button = (label: string): HTMLElement => {
    const found = Array.from(
      fixture.nativeElement.querySelectorAll(
        'ion-button',
      ) as NodeListOf<HTMLElement>,
    ).find((el) => el.textContent?.trim() === label);
    if (!found) throw new Error('Missing button: ' + label);
    return found;
  };
  beforeEach(async () => {
    vi.stubGlobal(
      'confirm',
      vi.fn(() => true),
    );
    auth = new BehaviorSubject(ready('A'));
    status = new Subject();
    unlink = new Subject();
    api = { get: vi.fn(() => status), delete: vi.fn(() => unlink) };
    await TestBed.configureTestingModule({
      imports: [TelegramAuthAccountComponent],
      providers: [
        { provide: SneatApiService, useValue: api },
        { provide: SneatAuthStateService, useValue: { authState: auth } },
      ],
    })
      .overrideComponent(TelegramAuthAccountComponent, {
        set: {
          imports: [TelegramLoginStub],
          schemas: [CUSTOM_ELEMENTS_SCHEMA],
        },
      })
      .compileComponents();
    fixture = TestBed.createComponent(TelegramAuthAccountComponent);
    await fixture.whenStable();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
  it('renders asynchronous authoritative status and rechecks after the widget succeeds', async () => {
    expect(text()).toContain('Checking Telegram connection');
    expect(api.get).toHaveBeenCalledWith('auth/telegram-link');
    status.next({ connected: false });
    await fixture.whenStable();
    expect(text()).toContain('Not connected yet.');
    fixture.debugElement
      .query(By.directive(TelegramLoginStub))
      .componentInstance.authenticated.emit();
    await fixture.whenStable();
    expect(api.get).toHaveBeenCalledTimes(2);
    status.next({ connected: true, username: 'alex' });
    await fixture.whenStable();
    expect(text()).toContain('Connected as @alex');
    expect(button('Disconnect')).toBeTruthy();
    expect(
      fixture.nativeElement.querySelector('sneat-login-with-telegram'),
    ).toBeNull();
  });
  it('shows lookup errors, retries, and never fabricates an account handle', async () => {
    status.error(new Error('offline'));
    await fixture.whenStable();
    expect(text()).toContain('Could not check Telegram connection');
    expect(
      fixture.nativeElement.querySelector('sneat-login-with-telegram'),
    ).toBeNull();
    const retry = new Subject<{ connected: boolean }>();
    api.get.mockReturnValue(retry);
    button('Retry').click();
    retry.next({ connected: true });
    await fixture.whenStable();
    expect(text()).toContain('Connected');
    expect(text()).not.toContain('@');
  });
  it('disconnects only after confirmation, blocks duplicates, and rechecks', async () => {
    status.next({ connected: true });
    await fixture.whenStable();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    button('Disconnect').click();
    expect(api.delete).not.toHaveBeenCalled();
    confirm.mockReturnValue(true);
    button('Disconnect').click();
    button('Disconnect').click();
    expect(api.delete).toHaveBeenCalledTimes(1);
    expect(api.delete).toHaveBeenCalledWith(
      'auth/disconnect?provider=telegram',
    );
    const refreshed = new Subject<{ connected: boolean }>();
    api.get.mockReturnValue(refreshed);
    unlink.next();
    refreshed.next({ connected: false });
    await fixture.whenStable();
    expect(text()).toContain('Not connected yet.');
  });
  it('preserves connected state and permits retry after unlink fails', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    status.next({ connected: true });
    await fixture.whenStable();
    button('Disconnect').click();
    unlink.error(new Error('failed'));
    await fixture.whenStable();
    expect(text()).toContain('Could not disconnect Telegram');
    expect(button('Disconnect')).toBeTruthy();
    api.delete.mockReturnValue(new Subject());
    button('Disconnect').click();
    expect(api.delete).toHaveBeenCalledTimes(2);
  });
  it('ignores old status and unlink responses after an account switch', async () => {
    const oldStatus = status;
    status = new Subject();
    api.get.mockReturnValue(status);
    auth.next(ready('B'));
    oldStatus.next({ connected: true, username: 'wrong' });
    status.next({ connected: true, username: 'right' });
    await fixture.whenStable();
    expect(text()).toContain('@right');
    expect(text()).not.toContain('@wrong');
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    button('Disconnect').click();
    auth.next(ready('C'));
    unlink.next();
    await fixture.whenStable();
    expect(text()).toContain('Checking Telegram connection');
    expect(text()).not.toContain('@right');
    expect(api.get).toHaveBeenCalledTimes(3);
  });
});
