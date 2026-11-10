import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ToastController } from '@ionic/angular';

import { SpacesCardComponent } from './spaces-card.component';
import { RouterTestingModule } from '@angular/router/testing';
import { Router } from '@angular/router';
import { ISneatUserState, SneatUserService } from '@sneat/auth-core';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { SpaceNavService, SpaceService } from '@sneat/space-services';
import { UserRequiredFieldsService } from '@sneat/auth-ui';
import { ErrorLogger } from '@sneat/core';
import { AnalyticsService } from '@sneat/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { of, throwError } from 'rxjs';
import { SNEAT_FIREBASE_AUTH } from '@sneat/core';
import { Firestore } from 'firebase/firestore';

describe('SpacesCardComponent', () => {
  let component: SpacesCardComponent;
  let fixture: ComponentFixture<SpacesCardComponent>;
  let userState$: BehaviorSubject<ISneatUserState>;
  let createSpace: ReturnType<typeof vi.fn>;
  let navigateToSpace: ReturnType<typeof vi.fn>;

  function createCard(
    groupKind?: 'housemates' | 'friends',
  ): SpacesCardComponent {
    const card = TestBed.runInInjectionContext(() => new SpacesCardComponent());
    card.spaceType = 'group';
    card.groupKind = groupKind;
    card.ngOnInit();
    TestBed.tick();
    return card;
  }

  beforeEach(async () => {
    sessionStorage.clear();
    userState$ = new BehaviorSubject<ISneatUserState>({
      status: 'authenticating',
    });
    createSpace = vi.fn(() =>
      of({
        id: 'home-1',
        type: 'group',
        brief: {
          title: 'Our home',
          type: 'group',
          groupKind: 'housemates',
        },
      }),
    );
    navigateToSpace = vi.fn(() => Promise.resolve());
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
          useValue: { navigateToSpace },
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

  it('uses neutral copy while preserving a group/housemates creation request', () => {
    fixture.componentRef.destroy();
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
    TestBed.tick();

    const card = createCard('housemates');
    const internal = card as unknown as {
      spaces(): readonly { id: string }[] | undefined;
      spaceName: { set(value: string): void };
      addSpace(): void;
      newSpaceNamePlaceholder: string;
      addSpaceHelp: string;
    };
    expect(internal.newSpaceNamePlaceholder).toBe('New space name');
    expect(internal.addSpaceHelp).toBe(
      'Enter a space name and click "Create" to add it.',
    );
    expect(internal.spaces()?.map(({ id }) => id)).toEqual(['home']);
    internal.spaceName.set('New home');
    internal.addSpace();
    TestBed.tick();
    expect(createSpace).toHaveBeenCalledWith({
      type: 'group',
      groupKind: 'housemates',
      title: 'New home',
    });
    expect(navigateToSpace).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'home-1', type: 'group' }),
      'forward',
    );
  });

  it('preserves a signed-out draft through login and creates it exactly once', () => {
    fixture.componentRef.destroy();
    const router = TestBed.inject(Router);
    const navigateToLogin = vi
      .spyOn(router, 'navigate')
      .mockResolvedValue(true);
    userState$.next({ status: 'notAuthenticated' });
    const signedOutCard = createCard('housemates') as unknown as {
      spaceName: { (): string; set(value: string): void };
      addSpace(): void;
    };
    signedOutCard.spaceName.set('Our new home');
    signedOutCard.addSpace();
    signedOutCard.addSpace();
    TestBed.tick();

    expect(createSpace).not.toHaveBeenCalled();
    expect(navigateToLogin).toHaveBeenCalledTimes(1);
    expect(navigateToLogin).toHaveBeenCalledWith(['login'], {
      fragment: '/',
      queryParams: {
        reason: 'Sign in to create this space',
        reasonDetail: 'Your space name will be waiting when you return.',
      },
    });
    expect(signedOutCard.spaceName()).toBe('Our new home');

    const restoredCard = createCard('housemates') as unknown as {
      spaceName(): string;
    };
    expect(restoredCard.spaceName()).toBe('Our new home');
    expect(navigateToLogin).toHaveBeenCalledTimes(1);
    expect(createSpace).not.toHaveBeenCalled();

    userState$.next({
      status: 'authenticated',
      user: { uid: 'owner', isAnonymous: false },
      record: { title: 'Owner', spaces: {} },
    } as ISneatUserState);
    TestBed.tick();

    expect(createSpace).not.toHaveBeenCalled();
    expect(restoredCard.spaceName()).toBe('Our new home');

    (restoredCard as unknown as { addSpace(): void }).addSpace();
    TestBed.tick();
    expect(createSpace).toHaveBeenCalledTimes(1);
    expect(createSpace).toHaveBeenCalledWith({
      type: 'group',
      groupKind: 'housemates',
      title: 'Our new home',
    });
    expect(navigateToSpace).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'home-1', type: 'group' }),
      'forward',
    );
    expect(sessionStorage.length).toBe(0);

    userState$.next({
      status: 'authenticated',
      user: { uid: 'owner', isAnonymous: false },
      record: { title: 'Owner', spaces: {} },
    } as ISneatUserState);
    TestBed.tick();
    expect(createSpace).toHaveBeenCalledTimes(1);
  });

  it('lets a retained page explicitly finish after authentication', async () => {
    fixture.componentRef.destroy();
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    userState$.next({ status: 'notAuthenticated' });
    const card = createCard('housemates') as unknown as {
      adding(): boolean;
      spaceName: { set(value: string): void };
      addSpace(): void;
    };
    card.spaceName.set('Cached-page home');
    card.addSpace();
    expect(card.adding()).toBe(true);

    await Promise.resolve();
    expect(card.adding()).toBe(false);

    userState$.next({
      status: 'authenticated',
      user: { uid: 'owner', isAnonymous: false },
      record: { title: 'Owner', spaces: {} },
    } as ISneatUserState);
    TestBed.tick();
    expect(createSpace).not.toHaveBeenCalled();

    card.addSpace();
    TestBed.tick();
    expect(createSpace).toHaveBeenCalledTimes(1);
  });

  it('lets a retained card create another space after a successful request', () => {
    fixture.componentRef.destroy();
    userState$.next({
      status: 'authenticated',
      user: { uid: 'owner', isAnonymous: false },
      record: { title: 'Owner', spaces: {} },
    } as ISneatUserState);
    const card = createCard() as unknown as {
      spaceName: { set(value: string): void };
      addSpace(): void;
    };

    card.spaceName.set('First space');
    card.addSpace();
    TestBed.tick();
    card.spaceName.set('Second space');
    card.addSpace();
    TestBed.tick();

    expect(createSpace).toHaveBeenCalledTimes(2);
    expect(createSpace).toHaveBeenNthCalledWith(1, {
      type: 'group',
      groupKind: undefined,
      title: 'First space',
    });
    expect(createSpace).toHaveBeenNthCalledWith(2, {
      type: 'group',
      groupKind: undefined,
      title: 'Second space',
    });
    expect(navigateToSpace).toHaveBeenCalledTimes(2);
  });

  it('lets only one reconstructed card claim the pending creation', () => {
    fixture.componentRef.destroy();
    const response$ = new Subject<{
      id: string;
      type: 'group';
      brief: { title: string; type: 'group'; groupKind: 'housemates' };
    }>();
    createSpace.mockReturnValueOnce(response$);
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    userState$.next({ status: 'notAuthenticated' });
    const signedOutCard = createCard('housemates') as unknown as {
      spaceName: { set(value: string): void };
      addSpace(): void;
    };
    signedOutCard.spaceName.set('One claimed home');
    signedOutCard.addSpace();
    TestBed.tick();
    const first = createCard('housemates') as unknown as { addSpace(): void };
    const second = createCard('housemates') as unknown as { addSpace(): void };
    userState$.next({
      status: 'authenticated',
      user: { uid: 'owner', isAnonymous: false },
      record: { title: 'Owner', spaces: {} },
    } as ISneatUserState);
    TestBed.tick();

    expect(createSpace).not.toHaveBeenCalled();
    first.addSpace();
    second.addSpace();
    TestBed.tick();
    expect(createSpace).toHaveBeenCalledTimes(1);
    expect(sessionStorage.length).toBe(1);

    response$.next({
      id: 'home-1',
      type: 'group',
      brief: {
        title: 'One claimed home',
        type: 'group',
        groupKind: 'housemates',
      },
    });
    response$.complete();
    expect(sessionStorage.length).toBe(0);
  });

  it('keeps another product form from claiming the scoped draft', () => {
    fixture.componentRef.destroy();
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    userState$.next({ status: 'notAuthenticated' });
    const housematesCard = createCard('housemates') as unknown as {
      spaceName: { set(value: string): void };
      addSpace(): void;
    };
    housematesCard.spaceName.set('Scoped home');
    housematesCard.addSpace();
    TestBed.tick();
    const friendsCard = createCard('friends') as unknown as {
      spaceName(): string;
    };
    expect(friendsCard.spaceName()).toBe('');
    expect(createSpace).not.toHaveBeenCalled();
    expect(sessionStorage.length).toBe(1);
  });

  it('waits for the authenticated owner record after an explicit submit', () => {
    fixture.componentRef.destroy();
    userState$.next({
      status: 'authenticated',
      user: { uid: 'owner', isAnonymous: false },
    } as ISneatUserState);
    const card = createCard() as unknown as {
      spaceName: { set(value: string): void };
      addSpace(): void;
    };
    card.spaceName.set('Owner-ready space');
    card.addSpace();
    TestBed.tick();

    expect(createSpace).not.toHaveBeenCalled();
    expect(sessionStorage.length).toBe(1);

    userState$.next({
      status: 'authenticated',
      user: { uid: 'owner', isAnonymous: false },
      record: { title: 'Owner', spaces: {} },
    } as ISneatUserState);
    TestBed.tick();

    expect(createSpace).toHaveBeenCalledTimes(1);
    expect(sessionStorage.length).toBe(0);
  });

  it('restores a failed create as a manual retry without duplicating it', () => {
    fixture.componentRef.destroy();
    createSpace.mockReturnValueOnce(
      throwError(() => new HttpErrorResponse({ status: 400 })),
    );
    userState$.next({
      status: 'authenticated',
      user: { uid: 'owner', isAnonymous: false },
      record: { title: 'Owner', spaces: {} },
    } as ISneatUserState);
    const card = createCard();
    const internal = card as unknown as {
      spaceName: { (): string; set(value: string): void };
      addSpace(): void;
    };
    internal.spaceName.set('Retryable space');
    internal.addSpace();
    TestBed.tick();

    expect(createSpace).toHaveBeenCalledTimes(1);
    expect(navigateToSpace).not.toHaveBeenCalled();
    expect(internal.spaceName()).toBe('Retryable space');
    expect(sessionStorage.length).toBe(1);

    const restored = createCard() as unknown as {
      spaceName: { (): string; set(value: string): void };
      addSpace(): void;
    };
    expect(restored.spaceName()).toBe('Retryable space');
    expect(createSpace).toHaveBeenCalledTimes(1);

    restored.addSpace();
    TestBed.tick();
    expect(createSpace).toHaveBeenCalledTimes(2);
    expect(navigateToSpace).toHaveBeenCalledTimes(1);
    expect(sessionStorage.length).toBe(0);
  });

  it('keeps a lost response uncertain instead of retrying automatically', () => {
    fixture.componentRef.destroy();
    createSpace.mockReturnValueOnce(
      throwError(() => new HttpErrorResponse({ status: 0 })),
    );
    userState$.next({
      status: 'authenticated',
      user: { uid: 'owner', isAnonymous: false },
      record: { title: 'Owner', spaces: {} },
    } as ISneatUserState);
    const card = createCard() as unknown as {
      spaceName: { set(value: string): void };
      addSpace(): void;
      canDiscardPendingCreation(): boolean;
      discardPendingCreation(): void;
      pendingCreationNotice(): string;
    };
    card.spaceName.set('Lost-response space');
    card.addSpace();
    TestBed.tick();

    expect(createSpace).toHaveBeenCalledTimes(1);
    expect(card.pendingCreationNotice()).toContain('may still be finishing');
    expect(sessionStorage.length).toBe(1);

    card.addSpace();
    TestBed.tick();
    expect(createSpace).toHaveBeenCalledTimes(1);

    expect(card.canDiscardPendingCreation()).toBe(true);
    card.discardPendingCreation();
    expect(sessionStorage.length).toBe(0);
  });

  it('does not retry an uncertain in-flight creation after reconstruction', () => {
    fixture.componentRef.destroy();
    const response$ = new Subject<{
      id: string;
      type: 'group';
      brief: { title: string; type: 'group' };
    }>();
    createSpace.mockReturnValueOnce(response$);
    userState$.next({
      status: 'authenticated',
      user: { uid: 'owner', isAnonymous: false },
      record: { title: 'Owner', spaces: {} },
    } as ISneatUserState);
    const first = createCard() as unknown as {
      spaceName: { set(value: string): void };
      addSpace(): void;
    };
    first.spaceName.set('Uncertain space');
    first.addSpace();
    TestBed.tick();

    expect(createSpace).toHaveBeenCalledTimes(1);
    expect(sessionStorage.length).toBe(1);

    const restored = createCard() as unknown as {
      addSpace(): void;
      pendingCreationNotice(): string;
    };
    expect(restored.pendingCreationNotice()).toContain(
      'may still be finishing',
    );
    expect(createSpace).toHaveBeenCalledTimes(1);

    restored.addSpace();
    TestBed.tick();
    expect(createSpace).toHaveBeenCalledTimes(1);

    response$.next({
      id: 'home-1',
      type: 'group',
      brief: { title: 'Uncertain space', type: 'group' },
    });
    response$.complete();
    expect(sessionStorage.length).toBe(0);
  });

  it('enables another card to discard only after the active request settles', () => {
    fixture.componentRef.destroy();
    const response$ = new Subject<{
      id: string;
      type: 'group';
      brief: { title: string; type: 'group' };
    }>();
    createSpace.mockReturnValueOnce(response$);
    userState$.next({
      status: 'authenticated',
      user: { uid: 'owner', isAnonymous: false },
      record: { title: 'Owner', spaces: {} },
    } as ISneatUserState);
    const submitting = createCard() as unknown as {
      spaceName: { set(value: string): void };
      addSpace(): void;
    };
    submitting.spaceName.set('Actively creating space');
    submitting.addSpace();
    TestBed.tick();

    expect(createSpace).toHaveBeenCalledTimes(1);
    expect(sessionStorage.length).toBe(1);

    const restored = createCard() as unknown as {
      addSpace(): void;
      canDiscardPendingCreation(): boolean;
      discardPendingCreation(): void;
      pendingCreationNotice(): string;
    };
    expect(restored.pendingCreationNotice()).toContain(
      'may still be finishing',
    );
    expect(restored.canDiscardPendingCreation()).toBe(false);

    restored.discardPendingCreation();
    restored.addSpace();
    TestBed.tick();

    expect(sessionStorage.length).toBe(1);
    expect(createSpace).toHaveBeenCalledTimes(1);

    response$.error(new HttpErrorResponse({ status: 0 }));
    TestBed.tick();

    expect(restored.canDiscardPendingCreation()).toBe(true);
    expect(sessionStorage.length).toBe(1);
    restored.discardPendingCreation();
    expect(sessionStorage.length).toBe(0);
  });

  it('requires a non-anonymous account before creating the pending space', () => {
    fixture.componentRef.destroy();
    const router = TestBed.inject(Router);
    const navigateToLogin = vi
      .spyOn(router, 'navigate')
      .mockResolvedValue(true);
    userState$.next({
      status: 'authenticated',
      user: { uid: 'anonymous', isAnonymous: true },
    } as ISneatUserState);
    const internal = createCard('housemates') as unknown as {
      spaceName: { set(value: string): void };
      addSpace(): void;
    };
    internal.spaceName.set('Anonymous draft');
    internal.addSpace();
    TestBed.tick();

    expect(createSpace).not.toHaveBeenCalled();
    expect(navigateToLogin).toHaveBeenCalledTimes(1);
  });
});
