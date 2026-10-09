import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ISneatAuthState,
  ISneatUserState,
  SneatAuthStateService,
  SneatUserService,
} from '@sneat/auth-core';
import { ErrorLogger } from '@sneat/core';
import { BehaviorSubject } from 'rxjs';
import { AuthPanelComponent } from './auth-panel.component';

describe('AuthPanelComponent', () => {
  let fixture: ComponentFixture<AuthPanelComponent>;
  let states: BehaviorSubject<ISneatUserState>;
  let authStates: BehaviorSubject<ISneatAuthState>;
  const retryUserRecordInitialization = vi.fn();

  beforeEach(async () => {
    retryUserRecordInitialization.mockClear();
    states = new BehaviorSubject<ISneatUserState>({ status: 'authenticating' });
    authStates = new BehaviorSubject<ISneatAuthState>({ status: 'authenticating' });
    await TestBed.configureTestingModule({
      imports: [AuthPanelComponent],
      providers: [
        {
          provide: SneatAuthStateService,
          useValue: { authState: authStates.asObservable(), signInWith: vi.fn() },
        },
        {
          provide: SneatUserService,
          useValue: {
            userState: states.asObservable(),
            onUserSignedIn: vi.fn(),
            retryUserRecordInitialization,
          },
        },
        {
          provide: ErrorLogger,
          useValue: { logError: vi.fn() },
        },
      ],
    })
      .overrideComponent(AuthPanelComponent, {
        set: { imports: [], schemas: [CUSTOM_ELEMENTS_SCHEMA] },
      })
      .compileComponents();
  });

  function create(returnTo?: string): AuthPanelComponent {
    fixture = TestBed.createComponent(AuthPanelComponent);
    fixture.componentRef.setInput('returnTo', returnTo);
    return fixture.componentInstance;
  }

  it('waits for the matching user record after Firebase identity is authenticated', () => {
    const component = create('/subscribe?plan=pro&period=yearly&checkout=test');
    const ready: Array<{ uid?: string; ready: boolean }> = [];
    component.accountReadyChange.subscribe((value) => ready.push(value));

    fixture.detectChanges();
    authStates.next({
      status: 'authenticated',
      user: { uid: 'buyer' } as ISneatAuthState['user'],
    });
    expect(ready.at(-1)).toEqual({ uid: 'buyer', ready: false });

    // A stale record for the previous identity must not release checkout.
    states.next({
      status: 'authenticated',
      user: { uid: 'previous-buyer' } as ISneatUserState['user'],
      record: {} as NonNullable<ISneatUserState['record']>,
    });
    expect(ready.at(-1)).toEqual({ uid: 'buyer', ready: false });

    states.next({
      status: 'authenticated',
      user: { uid: 'buyer' } as ISneatUserState['user'],
    });
    expect(ready.at(-1)).toEqual({ uid: 'buyer', ready: false });

    states.next({
      status: 'authenticated',
      user: { uid: 'buyer' } as ISneatUserState['user'],
      record: {} as NonNullable<ISneatUserState['record']>,
      userRecordStatus: 'loading',
    });
    expect(ready.at(-1)).toEqual({ uid: 'buyer', ready: false });

    states.next({
      status: 'authenticated',
      user: { uid: 'buyer' } as ISneatUserState['user'],
      record: {} as NonNullable<ISneatUserState['record']>,
      userRecordStatus: 'ready',
    });
    expect(ready.at(-1)).toEqual({ uid: 'buyer', ready: true });

    authStates.next({ status: 'notAuthenticated' });
    expect(ready.at(-1)).toEqual({ uid: undefined, ready: false });
  });

  it('reports a preloaded account after the continuation input is bound', () => {
    states.next({
      status: 'authenticated',
      user: { uid: 'buyer' } as ISneatUserState['user'],
      record: {} as NonNullable<ISneatUserState['record']>,
      userRecordStatus: 'ready',
    });
    const component = create('/business/checkout?planID=datatug-business-usage-annual&spaceID=space_1');
    authStates.next({
      status: 'authenticated',
      user: { uid: 'buyer' } as ISneatAuthState['user'],
    });
    const ready: Array<{ uid?: string; ready: boolean }> = [];
    component.accountReadyChange.subscribe((value) => ready.push(value));

    fixture.detectChanges();

    expect(ready).toEqual([{ uid: 'buyer', ready: true }]);
    expect(fixture.nativeElement.textContent).toContain('Sign in with company SSO');
  });

  it('never reports an anonymous identity as checkout-ready', () => {
    const component = create('/subscribe?plan=pro&period=monthly');
    const ready: Array<{ uid?: string; ready: boolean }> = [];
    component.accountReadyChange.subscribe((value) => ready.push(value));
    fixture.detectChanges();
    const anonymous = { uid: 'anon', isAnonymous: true } as ISneatAuthState['user'];
    authStates.next({ status: 'authenticated', user: anonymous });
    states.next({
      status: 'authenticated',
      user: anonymous as ISneatUserState['user'],
      record: {} as NonNullable<ISneatUserState['record']>,
      userRecordStatus: 'ready',
    });

    expect(ready.at(-1)).toEqual({ uid: 'anon', ready: false });
  });

  it('keeps account initialization failures out of the credential form and offers retry', () => {
    const component = create('/subscribe?plan=pro&period=monthly');
    const ready: Array<{ uid?: string; ready: boolean }> = [];
    component.accountReadyChange.subscribe((value) => ready.push(value));
    fixture.detectChanges();
    const user = { uid: 'buyer', isAnonymous: false };
    authStates.next({ status: 'authenticated', user });
    states.next({
      status: 'authenticated',
      user: user as ISneatUserState['user'],
      record: { title: 'Buyer' } as NonNullable<ISneatUserState['record']>,
      userRecordStatus: 'failed',
    });
    fixture.detectChanges();

    expect(ready.at(-1)).toEqual({ uid: 'buyer', ready: false });
    expect(fixture.nativeElement.textContent).toContain(
      'Your account is still being prepared.',
    );
    const retry = fixture.nativeElement.querySelector('ion-button');
    expect(retry?.textContent).toContain('Retry account setup');
    retry?.click();
    expect(retryUserRecordInitialization).toHaveBeenCalledOnce();
  });
});
