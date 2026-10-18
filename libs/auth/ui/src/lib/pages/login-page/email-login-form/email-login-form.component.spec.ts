import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToastController } from '@ionic/angular';
import { of } from 'rxjs';
import { SneatApiService } from '@sneat/api';
import { UserRecordService } from '@sneat/auth-core';
import {
  AnalyticsService,
  APP_INFO,
  ErrorLogger,
  SNEAT_FIREBASE_AUTH,
} from '@sneat/core';
import { RandomIdService } from '@sneat/random';
import { EmailLoginFormComponent } from './email-login-form.component';

const firebaseAuthMocks = vi.hoisted(() => ({
  createUserWithEmailAndPassword: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  sendEmailVerification: vi.fn(),
}));

vi.mock('firebase/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('firebase/auth')>()),
  ...firebaseAuthMocks,
}));

describe('EmailLoginFormComponent', () => {
  let fixture: ComponentFixture<EmailLoginFormComponent>;
  const logError = vi.fn();
  const toastCreate = vi.fn();
  const initUserRecord = vi.fn();

  beforeEach(async () => {
    localStorage.removeItem('emailForSignIn');
    vi.clearAllMocks();
    firebaseAuthMocks.sendEmailVerification.mockResolvedValue(undefined);
    initUserRecord.mockReturnValue(of(undefined));
    await TestBed.configureTestingModule({
      imports: [EmailLoginFormComponent],
      providers: [
        {
          provide: APP_INFO,
          useValue: { appId: 'test', appTitle: 'Test' },
        },
        {
          provide: AnalyticsService,
          useValue: { logEvent: vi.fn() },
        },
        {
          provide: ErrorLogger,
          useValue: { logError, logErrorHandler: () => vi.fn() },
        },
        { provide: ToastController, useValue: { create: toastCreate } },
        { provide: SNEAT_FIREBASE_AUTH, useValue: {} },
        {
          provide: RandomIdService,
          useValue: { newRandomId: () => 'test-id' },
        },
        {
          provide: SneatApiService,
          useValue: { post: vi.fn(), setApiAuthToken: vi.fn() },
        },
        {
          provide: UserRecordService,
          useValue: { initUserRecord },
        },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
      .overrideComponent(EmailLoginFormComponent, {
        set: { imports: [], schemas: [CUSTOM_ELEMENTS_SCHEMA] },
      })
      .compileComponents();
  });

  afterEach(() => {
    localStorage.removeItem('emailForSignIn');
  });

  function create(
    initialMode?: 'sign-in' | 'sign-up',
  ): EmailLoginFormComponent {
    fixture = TestBed.createComponent(EmailLoginFormComponent);
    if (initialMode) {
      fixture.componentRef.setInput('initialMode', initialMode);
    }
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  function selectedMode(component: EmailLoginFormComponent): 'in' | 'up' {
    return (component as unknown as { sign: () => 'in' | 'up' }).sign();
  }

  it('defaults to sign-in when no remembered email exists', () => {
    expect(selectedMode(create())).toBe('in');
  });

  it('keeps the remembered-email sign-in default for existing callers', () => {
    localStorage.setItem('emailForSignIn', 'person@example.com');

    expect(selectedMode(create())).toBe('in');
  });

  it('uses an explicit initial sign-in mode', () => {
    expect(selectedMode(create('sign-in'))).toBe('in');
  });

  it('uses an explicit initial sign-up mode even with a remembered email', () => {
    localStorage.setItem('emailForSignIn', 'person@example.com');

    expect(selectedMode(create('sign-up'))).toBe('up');
  });

  it('allows the user to switch modes after initialization', () => {
    const component = create('sign-in');
    const sign = (
      component as unknown as { sign: { set(value: 'in' | 'up'): void } }
    ).sign;
    sign.set('up');

    expect(selectedMode(component)).toBe('up');
  });

  it('does not log "can not set focus to undefined input" when the mode changes or the page is entered', () => {
    const error = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    try {
      const component = create();
      component.signChanged();
      component.ionViewDidEnter();
      expect(error).not.toHaveBeenCalled();
    } finally {
      error.mockRestore();
    }
  });

  it('does not log when sign-up finds the required company name missing', async () => {
    const error = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const alertSpy = vi.fn();
    vi.stubGlobal('alert', alertSpy);
    try {
      const component = create();
      const fields = component as unknown as Record<
        'email' | 'firstName' | 'lastName',
        { set(value: string): void }
      >;
      fields.email.set('a@example.test');
      fields.firstName.set('A');
      fields.lastName.set('B');
      (component.appInfo as { requiredSpaceType?: string }).requiredSpaceType =
        'company';
      await component.signUp();
      expect(alertSpy).toHaveBeenCalledWith(
        'Company title is a required field',
      );
      expect(error).not.toHaveBeenCalled();
    } finally {
      error.mockRestore();
      vi.unstubAllGlobals();
    }
  });

  describe('rendered flows', () => {
    const emailAlreadyInUse = Object.assign(new Error('exists'), {
      code: 'auth/email-already-in-use',
    });

    function el(): HTMLElement {
      return fixture.nativeElement as HTMLElement;
    }

    function type(
      component: EmailLoginFormComponent,
      values: Partial<
        Record<'email' | 'password' | 'firstName' | 'lastName', string>
      >,
    ): void {
      const fields = component as unknown as Record<
        string,
        { set(value: string): void }
      >;
      for (const [name, value] of Object.entries(values)) {
        fields[name].set(value);
      }
      fixture.detectChanges();
    }

    function actionButton(text: string): HTMLElement {
      const buttons = Array.from(
        el().querySelectorAll<HTMLElement>('ion-button'),
      );
      const found = buttons.find((b) =>
        b.innerHTML.replace(/<[^>]*>/g, '').includes(text),
      );
      if (!found) {
        throw new Error('no action button: ' + text);
      }
      return found;
    }

    async function settle(): Promise<void> {
      await fixture.whenStable();
      await new Promise((resolve) => setTimeout(resolve));
      fixture.detectChanges();
    }

    it('shows the password sign-in form by default, not the sign-up form', () => {
      create();

      expect(el().querySelector('ion-input[type=password]')).not.toBeNull();
      expect(el().querySelector('ion-input[name=first_name]')).toBeNull();
      expect(actionButton('Sign in')).toBeTruthy();
    });

    it('signs a returning user in with the typed email and password', async () => {
      const credential = { user: { getIdToken: vi.fn() } };
      firebaseAuthMocks.signInWithEmailAndPassword.mockResolvedValue(
        credential,
      );
      const component = create();
      const loggedIn = vi.fn();
      component.loggedIn.subscribe(loggedIn);
      type(component, { email: ' back@example.test ', password: 'secret-pw' });

      actionButton('Sign in').click();
      await settle();

      expect(firebaseAuthMocks.signInWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        'back@example.test',
        'secret-pw',
      );
      expect(
        firebaseAuthMocks.createUserWithEmailAndPassword,
      ).not.toHaveBeenCalled();
      expect(loggedIn).toHaveBeenCalledWith(credential);
      expect(logError).not.toHaveBeenCalled();
    });

    describe('sign-up tab', () => {
      function openSignUp(): EmailLoginFormComponent {
        const component = create('sign-up');
        type(component, {
          email: 'person@example.test',
          firstName: 'Pat',
          lastName: 'Person',
        });
        return component;
      }

      it('creates a new account and initialises the user record (unchanged)', async () => {
        const getIdToken = vi.fn().mockResolvedValue('id-token');
        const credential = { user: { getIdToken } };
        firebaseAuthMocks.createUserWithEmailAndPassword.mockResolvedValue(
          credential,
        );
        const component = openSignUp();
        const loggedIn = vi.fn();
        component.loggedIn.subscribe(loggedIn);

        actionButton('Sign up').click();
        await settle();

        expect(
          firebaseAuthMocks.createUserWithEmailAndPassword,
        ).toHaveBeenCalledWith(
          expect.anything(),
          'person@example.test',
          'test-id',
        );
        expect(initUserRecord).toHaveBeenCalledWith(
          expect.objectContaining({
            authProvider: 'password',
            email: 'person@example.test',
            names: { firstName: 'Pat', lastName: 'Person' },
          }),
        );
        expect(loggedIn).toHaveBeenCalledWith(credential);
        expect(selectedMode(component)).toBe('up');
        expect(el().querySelector('.existing-account-hint')).toBeNull();
        expect(logError).not.toHaveBeenCalled();
      });

      it('switches to sign-in, keeps the email and explains, when the account already exists', async () => {
        firebaseAuthMocks.createUserWithEmailAndPassword.mockRejectedValue(
          emailAlreadyInUse,
        );
        const alertSpy = vi.fn();
        vi.stubGlobal('alert', alertSpy);
        try {
          const component = openSignUp();

          actionButton('Sign up').click();
          await settle();

          expect(selectedMode(component)).toBe('in');
          expect(
            (component as unknown as { email: () => string }).email(),
          ).toBe('person@example.test');
          expect(el().querySelector('ion-input[type=password]')).not.toBeNull();
          expect(
            el().querySelector('.existing-account-hint')?.textContent,
          ).toContain('already has an account');
          expect(logError).not.toHaveBeenCalled();
          expect(toastCreate).not.toHaveBeenCalled();
          expect(alertSpy).not.toHaveBeenCalled();
          expect(initUserRecord).not.toHaveBeenCalled();
          expect(localStorage.getItem('emailForSignIn')).toBe(
            'person@example.test',
          );
          expect(
            (
              component as unknown as { signingWith: () => unknown }
            ).signingWith(),
          ).toBeUndefined();
        } finally {
          vi.unstubAllGlobals();
        }
      });

      it('clears the hint once the user signs in', async () => {
        firebaseAuthMocks.createUserWithEmailAndPassword.mockRejectedValue(
          emailAlreadyInUse,
        );
        firebaseAuthMocks.signInWithEmailAndPassword.mockResolvedValue({});
        const component = openSignUp();
        actionButton('Sign up').click();
        await settle();
        type(component, { password: 'secret-pw' });

        actionButton('Sign in').click();
        await settle();

        expect(el().querySelector('.existing-account-hint')).toBeNull();
      });

      it('drops the hint when the user goes back to the sign-up tab', async () => {
        firebaseAuthMocks.createUserWithEmailAndPassword.mockRejectedValue(
          emailAlreadyInUse,
        );
        const component = openSignUp();
        actionButton('Sign up').click();
        await settle();
        expect(el().querySelector('.existing-account-hint')).not.toBeNull();
        const sign = (
          component as unknown as { sign: { set(v: 'in' | 'up'): void } }
        ).sign;

        sign.set('in');
        component.signChanged();
        fixture.detectChanges();
        expect(el().querySelector('.existing-account-hint')).not.toBeNull();

        sign.set('up');
        component.signChanged();
        fixture.detectChanges();
        expect(el().querySelector('.existing-account-hint')).toBeNull();
      });

      it('still reports other sign-up failures as errors', async () => {
        const failure = Object.assign(new Error('weak'), {
          code: 'auth/weak-password',
        });
        firebaseAuthMocks.createUserWithEmailAndPassword.mockRejectedValue(
          failure,
        );
        const component = openSignUp();

        actionButton('Sign up').click();
        await settle();

        expect(selectedMode(component)).toBe('up');
        expect(logError).toHaveBeenCalledWith(
          failure,
          'Failed to sign up with email',
          { report: false },
        );
      });
    });
  });
});
