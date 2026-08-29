import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { MenuController, NavController } from '@ionic/angular';
import {
  SneatAuthStateService,
  SneatUserService,
} from '@sneat/auth-core';
import { ErrorLogger } from '@sneat/core';
import { BehaviorSubject, of } from 'rxjs';
import { AuthMenuItemComponent } from './auth-menu-item.component';

describe('AuthMenuItemComponent', () => {
  let fixture: ComponentFixture<AuthMenuItemComponent>;
  const authState = new BehaviorSubject({ status: 'authenticating' as const });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuthMenuItemComponent, RouterTestingModule],
      providers: [
        {
          provide: SneatAuthStateService,
          useValue: { authState, signOut: vi.fn() },
        },
        {
          provide: SneatUserService,
          useValue: { userState: of(undefined) },
        },
        {
          provide: ErrorLogger,
          useValue: { logError: vi.fn(), logErrorHandler: () => vi.fn() },
        },
        { provide: NavController, useValue: {} },
        { provide: MenuController, useValue: {} },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AuthMenuItemComponent);
    fixture.detectChanges();
  });

  it('shows the user icon and a right-side spinner while authenticating', () => {
    const item = (fixture.nativeElement as HTMLElement).querySelector(
      '[data-testid="authenticating"]',
    );

    expect(item?.querySelector('ion-icon[slot="start"][name="person-circle-outline"]'))
      .not.toBeNull();
    const buttons = item?.querySelector('ion-buttons[slot="end"]');
    expect(buttons).not.toBeNull();
    expect(
      buttons?.querySelector('ion-spinner[name="lines-small"][color="medium"]'),
    ).not.toBeNull();
    expect(item?.outerHTML || '').toContain('Authenticating...');
  });

  it('uses the shared header color for the authentication section', () => {
    const sectionHeader = (
      fixture.nativeElement as HTMLElement
    ).querySelector('ion-item-divider');

    expect(sectionHeader?.getAttribute('color')).toBe('header');
  });
});
