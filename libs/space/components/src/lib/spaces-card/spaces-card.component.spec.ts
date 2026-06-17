import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ToastController } from '@ionic/angular/standalone';

import { SpacesCardComponent } from './spaces-card.component';
import { RouterTestingModule } from '@angular/router/testing';
import { ISneatUserState, SneatUserService } from '@sneat/auth-core';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { SpaceNavService, SpaceService } from '@sneat/space-services';
import { UserRequiredFieldsService } from '@sneat/auth-ui';
import { ErrorLogger } from '@sneat/core';
import { AnalyticsService } from '@sneat/core';
import { BehaviorSubject } from 'rxjs';
import { Auth } from '@angular/fire/auth';
import { Firestore } from '@angular/fire/firestore';

describe('SpacesCardComponent', () => {
  let component: SpacesCardComponent;
  let fixture: ComponentFixture<SpacesCardComponent>;
  let userState$: BehaviorSubject<ISneatUserState>;

  beforeEach(waitForAsync(async () => {
    userState$ = new BehaviorSubject<ISneatUserState>({
      status: 'authenticating',
    });
    await TestBed.configureTestingModule({
      imports: [
        SpacesCardComponent,
        RouterTestingModule,
        HttpClientTestingModule,
      ],
      providers: [
        { provide: SpaceService, useValue: {} },
        { provide: SpaceNavService, useValue: {} },
        // The card now embeds the real SpacesListComponent, which injects this.
        { provide: UserRequiredFieldsService, useValue: { open: vi.fn() } },
        {
          provide: SneatUserService,
          useValue: { userState: userState$, currentUserID: undefined },
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
          provide: Auth,
          useValue: {
            onIdTokenChanged: vi.fn(() => () => void 0),
            onAuthStateChanged: vi.fn(() => () => void 0),
          },
        },
        { provide: Firestore, useValue: {} },
        {
          provide: ToastController,
          useValue: {
            create: vi.fn().mockResolvedValue({ present: vi.fn() }),
          },
        },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SpacesCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // Regression guard: before the fix the card stayed on "Authenticating..." even
  // after the user record loaded, because it mutated fields in a subscription and
  // relied on Zone change detection. With signals the derived `spaces` must react
  // to a later (async, e.g. Firestore) userState emission — which is what makes
  // the view repaint under OnPush, with or without Zone. (We assert the reactive
  // signal rather than the Ionic shadow DOM, which jsdom does not render.)
  it('reactively derives spaces when the user record emits later', async () => {
    const c = component as unknown as {
      spaces(): readonly { id: string; brief: { title: string } }[] | undefined;
    };
    expect(c.spaces()).toBeUndefined(); // record not loaded yet

    userState$.next({
      status: 'authenticated',
      user: {
        uid: 'u1',
        isAnonymous: false,
        emailVerified: true,
        providerData: [],
      } as ISneatUserState['user'],
      record: {
        title: 'Test User',
        spaces: {
          s1: { title: 'Family', type: 'family', roles: ['creator'] },
        },
      },
    } as ISneatUserState);

    await fixture.whenStable();
    expect(c.spaces()?.[0]?.brief?.title).toBe('Family');
  });
});
