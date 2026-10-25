import { ActivatedRoute, provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
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
import { EmailLoginFormComponent } from './email-login-form/email-login-form.component';
import { TelegramLoginConfig } from './telegram-login-config';
import { LoginPageComponent } from './login-page.component';

vi.mock('firebase/firestore', async () => ({
  ...(await vi.importActual('firebase/firestore')),
  collection: vi.fn(() => ({ id: 'users' })),
  doc: vi.fn((collection, id) => ({ collection, id })),
  onSnapshot: vi.fn(),
}));

describe('LoginPage ?mode= query param', () => {
  beforeEach(() => {
    // ion-icon fetches its SVG assets from the happy-dom origin, which has no server.
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('', { status: 404 }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.removeItem('emailForSignIn');
    TestBed.resetTestingModule();
  });

  // Renders the real login page for a signed-out visitor and returns the tab
  // ('in' = Sign in, 'up' = Sign up) the shared email form opened on.
  async function openedTab(queryParams: Record<string, unknown>) {
    let tokenObserver: { next: (user: unknown) => void } | undefined;
    let authObserver: { next: (user: unknown) => void } | undefined;
    const fbAuth = {
      currentUser: null as unknown,
      onIdTokenChanged: (observer: { next: (user: unknown) => void }) => {
        tokenObserver = observer;
      },
      onAuthStateChanged: (observer: { next: (user: unknown) => void }) => {
        authObserver = observer;
      },
    };
    await TestBed.configureTestingModule({
      imports: [LoginPageComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { queryParams } } },
        SneatAuthStateService,
        SneatUserService,
        { provide: Firestore, useValue: {} },
        { provide: SNEAT_FIREBASE_AUTH, useValue: fbAuth },
        {
          provide: ErrorLogger,
          useValue: { logError: vi.fn(), logErrorHandler: () => vi.fn() },
        },
        {
          provide: AnalyticsService,
          useValue: { identify: vi.fn(), logEvent: vi.fn() },
        },
        {
          provide: SneatUrlOperationBlocker,
          useValue: { isBlocked: () => false },
        },
        {
          provide: SneatApiService,
          useValue: { postAsAnonymous: () => NEVER },
        },
        {
          provide: UserRecordService,
          useValue: { initUserRecord: vi.fn(() => NEVER) },
        },
        { provide: APP_INFO, useValue: {} },
        { provide: RANDOM_ID_OPTIONS, useValue: { len: 9 } },
        { provide: TelegramLoginConfig, useValue: { botID: '' } },
        { provide: ToastController, useValue: { create: vi.fn() } },
        {
          provide: NavController,
          useValue: { navigateRoot: vi.fn().mockResolvedValue(true) },
        },
      ],
    }).compileComponents();
    const auth = TestBed.inject(SneatAuthStateService);
    TestBed.inject(SneatUserService);
    auth.authState.subscribe();

    const fixture = TestBed.createComponent(LoginPageComponent);
    fixture.detectChanges();
    tokenObserver?.next(null);
    authObserver?.next(null);
    fixture.detectChanges();

    const form = fixture.debugElement.query(
      By.directive(EmailLoginFormComponent),
    );
    expect(form).not.toBeNull();
    const tab = (
      form.componentInstance as unknown as { sign: () => 'in' | 'up' }
    ).sign();
    fixture.destroy();
    return tab;
  }

  it('opens on Sign in when no mode is given', async () => {
    expect(await openedTab({})).toBe('in');
  });

  it('opens on Sign up for mode=sign-up', async () => {
    expect(await openedTab({ mode: 'sign-up' })).toBe('up');
  });

  it('opens on Sign in for mode=sign-in', async () => {
    expect(await openedTab({ mode: 'sign-in' })).toBe('in');
  });

  it('ignores unknown mode values', async () => {
    expect(await openedTab({ mode: 'register' })).toBe('in');
    TestBed.resetTestingModule();
    expect(await openedTab({ mode: ['sign-up', 'sign-up'] })).toBe('in');
  });
});
