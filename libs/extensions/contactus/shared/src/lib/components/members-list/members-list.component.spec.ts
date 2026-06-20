import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { CONTACT_SERVICE, CONTACTUS_NAV_SERVICE } from '@sneat/extension-contactus-contract';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ErrorLogger } from '@sneat/core';
import {
  NavController,
  ModalController,
  IonRouterOutlet,
} from '@ionic/angular/standalone';
import { of } from 'rxjs';
import { SpaceNavService } from '@sneat/space-services';
import { SneatUserService } from '@sneat/auth-core';
import { SCHEDULE_NAV_SERVICE } from '@sneat/extension-calendarius-contract';

import { MembersListComponent } from './members-list.component';

describe('MembersListComponent', () => {
  let component: MembersListComponent;
  let fixture: ComponentFixture<MembersListComponent>;

  beforeEach(waitForAsync(async () => {
    await TestBed.configureTestingModule({
      imports: [MembersListComponent, RouterTestingModule, NoopAnimationsModule],
      providers: [
        { provide: SpaceNavService, useValue: { navigateToSpaces: vi.fn() } },
        { provide: NavController, useValue: {} },
        {
          provide: SneatUserService,
          useValue: { userState: of({}), currentUserID: 'u1' },
        },
        {
          provide: CONTACT_SERVICE,
          useValue: {
            setContactsStatus: vi.fn(),
            removeSpaceMember: vi.fn(() => of({ id: 'test-space' })),
          },
        },
        { provide: SCHEDULE_NAV_SERVICE, useValue: { goCalendar: vi.fn(() => Promise.resolve()) } },
        { provide: ModalController, useValue: {} },
        { provide: IonRouterOutlet, useValue: {} },
        { provide: CONTACTUS_NAV_SERVICE, useValue: { navigateToMember: vi.fn() } },
        {
          provide: ErrorLogger,
          useValue: {
            logError: vi.fn(),
            logErrorHandler: vi.fn(() => vi.fn()),
          },
        },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
      .overrideComponent(MembersListComponent, {
        set: { imports: [], template: '' },
      })
      .compileComponents();

    fixture = TestBed.createComponent(MembersListComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('$space', { id: 'test-space' });
    fixture.componentRef.setInput('$members', []);
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = () => component as any;
  const stop = () =>
    ({ stopPropagation: vi.fn(), preventDefault: vi.fn() }) as unknown as Event;

  it('$membersToDisplay filters by role when a role is set', () => {
    fixture.componentRef.setInput('$members', [
      { id: 'a', brief: { roles: ['parent'] } },
      { id: 'b', brief: { roles: ['child'] } },
    ]);
    fixture.componentRef.setInput('$role', 'parent');
    fixture.detectChanges();
    expect(c().$membersToDisplay().map((m: { id: string }) => m.id)).toEqual([
      'a',
    ]);
  });

  it('genderIcon maps gender to an icon', () => {
    expect(component.genderIcon({ brief: { gender: 'male' } } as never)).toBe(
      'man-outline',
    );
    expect(component.genderIcon({ brief: { gender: 'female' } } as never)).toBe(
      'woman-outline',
    );
    expect(component.genderIcon({ brief: {} } as never)).toBe('person-outline');
  });

  it('isInviteButtonVisible is true only for persons without a userID', () => {
    expect(
      c().isInviteButtonVisible({ brief: { type: 'person' } }),
    ).toBe(true);
    expect(
      c().isInviteButtonVisible({ brief: { type: 'person', userID: 'u' } }),
    ).toBe(false);
    expect(c().isInviteButtonVisible({ brief: { type: 'company' } })).toBe(
      false,
    );
  });

  it('isAgeOptionsVisible requires a family space and unknown age group', () => {
    fixture.componentRef.setInput('$space', { id: 's1', type: 'family' });
    fixture.detectChanges();
    expect(
      c().isAgeOptionsVisible({ brief: { type: 'person' } }),
    ).toBe(true);
    expect(
      c().isAgeOptionsVisible({ brief: { type: 'person', ageGroup: 'adult' } }),
    ).toBe(false);
  });

  it('goMember navigates to the member', () => {
    component.goMember({ id: 'm1', brief: {} } as never);
    expect(
      (TestBed.inject(CONTACTUS_NAV_SERVICE) as unknown as {
        navigateToMember: ReturnType<typeof vi.fn>;
      }).navigateToMember,
    ).toHaveBeenCalled();
  });

  it('goSchedule navigates to the member calendar', () => {
    component.goSchedule(stop(), { id: 'm1' } as never);
    expect(
      (TestBed.inject(SCHEDULE_NAV_SERVICE) as unknown as {
        goCalendar: ReturnType<typeof vi.fn>;
      }).goCalendar,
    ).toHaveBeenCalledWith(expect.anything(), { member: 'm1' });
  });

  it('removeMember calls the service to remove the member', () => {
    component.removeMember(stop(), { id: 'm1', brief: {} } as never);
    expect(
      (TestBed.inject(CONTACT_SERVICE) as unknown as {
        removeSpaceMember: ReturnType<typeof vi.fn>;
      }).removeSpaceMember,
    ).toHaveBeenCalledWith({ spaceID: 'test-space', contactID: 'm1' });
  });
});
