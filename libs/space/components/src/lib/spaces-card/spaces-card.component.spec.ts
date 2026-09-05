import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ToastController } from '@ionic/angular';

import { SpacesCardComponent } from './spaces-card.component';
import { RouterTestingModule } from '@angular/router/testing';
import { ISneatUserState, SneatUserService } from '@sneat/auth-core';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { SpaceNavService, SpaceService } from '@sneat/space-services';
import { UserRequiredFieldsService } from '@sneat/auth-ui';
import { ErrorLogger } from '@sneat/core';
import { AnalyticsService } from '@sneat/core';
import { BehaviorSubject } from 'rxjs';
import { of } from 'rxjs';
import { SNEAT_FIREBASE_AUTH } from '@sneat/core';
import { Firestore } from 'firebase/firestore';

describe('SpacesCardComponent', () => {
  let component: SpacesCardComponent;
  let fixture: ComponentFixture<SpacesCardComponent>;
  let userState$: BehaviorSubject<ISneatUserState>;
  let createSpace: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    userState$ = new BehaviorSubject<ISneatUserState>({
      status: 'authenticating',
    });
    createSpace = vi.fn(() =>
      of({
        id: 'home-1',
        brief: {
          title: 'Our home',
          type: 'group',
          groupKind: 'housemates',
        },
      }),
    );
    await TestBed.configureTestingModule({
      imports: [
        SpacesCardComponent,
        RouterTestingModule,
        HttpClientTestingModule,
      ],
      providers: [
        { provide: SpaceService, useValue: { createSpace } },
        {
          provide: SpaceNavService,
          useValue: { navigateToSpace: vi.fn(() => Promise.resolve()) },
        },
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
          provide: SNEAT_FIREBASE_AUTH,
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
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SpacesCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('uses the shared blue card-header treatment', () => {
    const header = fixture.nativeElement.querySelector(
      'ion-card > ion-item',
    ) as HTMLElement;

    expect(header.classList.contains('sneat-card-header')).toBe(true);
    expect(header.getAttribute('lines')).toBe('full');
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

  it('filters and creates the configured group kind', async () => {
    component.spaceType = 'group';
    component.groupKind = 'housemates';
    userState$.next({
      status: 'authenticated',
      user: { uid: 'u1' },
      record: {
        title: 'Test User',
        spaces: {
          home: {
            title: 'Our home',
            type: 'group',
            groupKind: 'housemates',
            roles: ['owner'],
            userContactID: 'u1',
          },
          friends: {
            title: 'Friends',
            type: 'group',
            groupKind: 'friends',
            roles: ['owner'],
            userContactID: 'u1',
          },
        },
      },
    } as ISneatUserState);
    await fixture.whenStable();

    const internal = component as unknown as {
      spaces(): readonly { id: string }[] | undefined;
      spaceName: { set(value: string): void };
      addSpace(): void;
    };
    expect(internal.spaces()?.map(({ id }) => id)).toEqual(['home']);
    internal.spaceName.set('New home');
    internal.addSpace();
    expect(createSpace).toHaveBeenCalledWith({
      type: 'group',
      groupKind: 'housemates',
      title: 'New home',
    });
  });
});
