import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { NavController, ToastController } from '@ionic/angular';
import { Firestore } from 'firebase/firestore';
import { NEVER } from 'rxjs';
import {
  SneatAuthStateService,
  SneatUserService,
  UserRecordService,
} from '@sneat/auth-core';
import {
  APP_INFO,
  AnalyticsService,
  ErrorLogger,
  SNEAT_FIREBASE_AUTH,
  SneatUrlOperationBlocker,
} from '@sneat/core';
import { SneatApiService } from '@sneat/api';
import { RANDOM_ID_OPTIONS } from '@sneat/random';
import { TelegramLoginConfig } from './telegram-login-config';
import { LoginPageComponent } from './login-page.component';

vi.mock('firebase/firestore', async () => ({
  ...(await vi.importActual('firebase/firestore')),
  collection: vi.fn(() => ({ id: 'users' })),
  doc: vi.fn((collection, id) => ({ collection, id })),
  onSnapshot: vi.fn(),
}));

describe('LoginPage auth failure recovery integration', () => {
  it('restores shared controls for actual token-first, auth-second, token-rejection callbacks', async () => {
    let tokenObserver:
      | { next: (user: unknown) => void }
      | undefined;
    let authObserver:
      | { next: (user: unknown) => void }
      | undefined;
    let rejectToken!: (error: Error) => void;
    const fbAuth = {
      currentUser: null as unknown,
      onIdTokenChanged: (observer: { next: (user: unknown) => void }) => {
        tokenObserver = observer;
      },
      onAuthStateChanged: (observer: { next: (user: unknown) => void }) => {
        authObserver = observer;
      },
    };
    const navigateRoot = vi.fn().mockResolvedValue(true);

    await TestBed.configureTestingModule({
      imports: [LoginPageComponent],
      providers: [
        provideRouter([]),
        SneatAuthStateService,
        SneatUserService,
        { provide: Firestore, useValue: {} },
        { provide: SNEAT_FIREBASE_AUTH, useValue: fbAuth },
        {
          provide: ErrorLogger,
          useValue: { logError: vi.fn(), logErrorHandler: () => vi.fn() },
        },
        { provide: AnalyticsService, useValue: { identify: vi.fn(), logEvent: vi.fn() } },
        { provide: SneatUrlOperationBlocker, useValue: { isBlocked: () => false } },
        { provide: SneatApiService, useValue: { postAsAnonymous: () => NEVER } },
        { provide: UserRecordService, useValue: { initUserRecord: vi.fn(() => NEVER) } },
        { provide: APP_INFO, useValue: {} },
        { provide: RANDOM_ID_OPTIONS, useValue: { len: 9 } },
        { provide: TelegramLoginConfig, useValue: { botID: '' } },
        { provide: ToastController, useValue: { create: vi.fn() } },
        { provide: NavController, useValue: { navigateRoot } },
      ],
    }).compileComponents();

    const auth = TestBed.inject(SneatAuthStateService);
    TestBed.inject(SneatUserService);
    let latestAuthState: unknown;
    auth.authState.subscribe((state) => (latestAuthState = state));

    const fixture = TestBed.createComponent(LoginPageComponent);
    fixture.detectChanges();
    const buyer = {
      uid: 'buyer',
      isAnonymous: false,
      email: 'buyer@example.test',
      emailVerified: true,
      providerData: [],
      getIdToken: () =>
        new Promise<string>((_resolve, reject) => {
          rejectToken = reject;
        }),
    };
    fbAuth.currentUser = buyer;

    tokenObserver?.next(buyer);
    authObserver?.next(buyer);
    expect(latestAuthState).toMatchObject({
      status: 'authenticated',
      loadingPhase: 'ready',
      token: null,
    });

    rejectToken(new Error('token retrieval failed'));
    await Promise.resolve();
    await Promise.resolve();
    fixture.detectChanges();

    expect(latestAuthState).toMatchObject({
      status: 'authenticated',
      loadingPhase: 'failed',
    });
    expect(navigateRoot).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain(
      "We couldn't complete sign-in.",
    );
    expect(
      fixture.nativeElement.querySelector('sneat-email-login-form'),
    ).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain(
      'Sign in with company SSO',
    );
    expect(fixture.nativeElement.textContent).not.toContain(
      'Retry account setup',
    );
    fixture.destroy();
    TestBed.resetTestingModule();
  });
});
