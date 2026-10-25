import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { NavController } from '@ionic/angular';
import { SneatAuthStateService } from '@sneat/auth-core';
import { ErrorLogger } from '@sneat/core';
import { of } from 'rxjs';
import { SignInFromEmailLinkPageComponent } from './sign-in-from-email-link-page.component';

describe('SignInFromEmailLinkPageComponent', () => {
  let component: SignInFromEmailLinkPageComponent;
  let fixture: ComponentFixture<SignInFromEmailLinkPageComponent>;
  const navigateRoot = vi.fn(() => Promise.resolve());

  beforeEach(async () => {
    localStorage.removeItem('emailForSignIn');
    navigateRoot.mockClear();
    await TestBed.configureTestingModule({
      imports: [SignInFromEmailLinkPageComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: convertToParamMap({
                returnTo: '/subscribe?plan=pro&period=yearly&checkout=test',
              }),
            },
          },
        },
        {
          provide: ErrorLogger,
          useValue: { logError: vi.fn(), logErrorHandler: () => vi.fn() },
        },
        {
          provide: SneatAuthStateService,
          useValue: { signInWithEmailLink: vi.fn(() => of({})) },
        },
        {
          provide: NavController,
          useValue: { navigateRoot },
        },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
      .overrideComponent(SignInFromEmailLinkPageComponent, {
        set: { imports: [], schemas: [CUSTOM_ELEMENTS_SCHEMA] },
      })
      .compileComponents();
    fixture = TestBed.createComponent(SignInFromEmailLinkPageComponent);
    component = fixture.componentInstance;

    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('returns to the validated checkout route after email-link sign-in', () => {
    component.signIn();
    expect(navigateRoot).toHaveBeenCalledWith(
      '/subscribe?plan=pro&period=yearly&checkout=test',
    );
  });
});
