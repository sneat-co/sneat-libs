import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SneatApiService } from '@sneat/api';
import { SneatUserService } from '@sneat/auth-core';
import { ErrorLogger } from '@sneat/core';
import { ClassName } from '@sneat/ui';
import { of } from 'rxjs';
import { UserAuthAccountsComponent } from './user-auth-accounts.component';

describe('UserAuthAccountsComponent', () => {
  let component: UserAuthAccountsComponent;
  let fixture: ComponentFixture<UserAuthAccountsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserAuthAccountsComponent],
      providers: [
        { provide: ClassName, useValue: 'TestComponent' },
        {
          provide: ErrorLogger,
          useValue: { logError: vi.fn(), logErrorHandler: () => vi.fn() },
        },
        {
          provide: SneatUserService,
          useValue: {
            userState: of({ record: undefined }),
          },
        },
        {
          provide: SneatApiService,
          useValue: { delete: vi.fn() },
        },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
      .overrideComponent(UserAuthAccountsComponent, {
        set: { imports: [], schemas: [CUSTOM_ELEMENTS_SCHEMA] },
      })
      .compileComponents();
    fixture = TestBed.createComponent(UserAuthAccountsComponent);
    component = fixture.componentInstance;

    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('offers GitHub among the sign-in methods', () => {
    fixture.detectChanges();
    const providers = Array.from(
      fixture.nativeElement.querySelectorAll(
        'sneat-user-auth-provider-status',
      ) as NodeListOf<Element>,
    ).map((el) => el.getAttribute('providerID'));
    expect(providers).toEqual([
      'google.com',
      'apple.com',
      'microsoft.com',
      'github.com',
    ]);
  });

  it('shows messaging apps by default and hides them on request', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Messaging apps');
    fixture.componentRef.setInput('showMessagingApps', false);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Messaging apps');
    expect(
      fixture.nativeElement.querySelector('sneat-telegram-auth-account'),
    ).toBeTruthy();
    expect(
      fixture.nativeElement.querySelectorAll('sneat-user-auth-provider-status')
        .length,
    ).toBe(4);
  });
});
