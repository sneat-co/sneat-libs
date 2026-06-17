import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ToastController } from '@ionic/angular/standalone';
import { BehaviorSubject } from 'rxjs';

import { SpacesCardComponent } from './spaces-card.component';
import { ISneatUserState, SneatUserService } from '@sneat/auth-core';
import { SpaceNavService, SpaceService } from '@sneat/space-services';
import { ErrorLogger, AnalyticsService } from '@sneat/core';

describe('SpacesCardComponent', () => {
  let component: SpacesCardComponent;
  let fixture: ComponentFixture<SpacesCardComponent>;
  let userState: BehaviorSubject<ISneatUserState>;

  beforeEach(async () => {
    userState = new BehaviorSubject<ISneatUserState>({
      status: 'authenticating',
    });

    await TestBed.configureTestingModule({
      imports: [SpacesCardComponent],
      providers: [
        { provide: SpaceService, useValue: { createSpace: vi.fn() } },
        { provide: SpaceNavService, useValue: { navigateToSpace: vi.fn() } },
        {
          provide: SneatUserService,
          useValue: { userState, currentUserID: 'user1' },
        },
        {
          provide: ErrorLogger,
          useValue: {
            logError: vi.fn(),
            logErrorHandler: vi.fn(() => vi.fn()),
          },
        },
        { provide: AnalyticsService, useValue: { logEvent: vi.fn() } },
        {
          provide: ToastController,
          useValue: {
            create: vi.fn().mockResolvedValue({ present: vi.fn() }),
          },
        },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(SpacesCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // Regression guard: a passive userState emission (no navigation / explicit CD)
  // must repaint the view via signals + OnPush. This reproduces the original
  // "stuck on Authenticating..." bug.
  it('repaints the space title when userState emits a record', async () => {
    userState.next({
      status: 'authenticated',
      record: {
        spaces: {
          space1: {
            title: 'My Space',
            type: 'team',
            roles: ['creator'],
            userContactID: 'contact1',
          },
        },
      },
    });

    await fixture.whenStable();
    fixture.detectChanges();

    // The computed signal recomputes from the passive userState emission...
    expect(component.spaces()?.length).toBe(1);
    expect(component.spaces()?.[0].brief.title).toBe('My Space');
    expect(component.loadingState()).toBe('Loading');

    // ...and the template repaints (OnPush + signals), rendering the list
    // instead of the "Authenticating..." skeleton.
    const html: string = fixture.nativeElement.innerHTML;
    expect(html).toContain('My Space');
  });
});
