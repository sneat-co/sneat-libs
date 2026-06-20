import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { CONTACTUS_NAV_SERVICE } from '@sneat/extension-contactus-contract';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ErrorLogger } from '@sneat/core';
import { NavController } from '@ionic/angular/standalone';
import { SpaceNavService } from '@sneat/space-services';
import { SneatUserService } from '@sneat/auth-core';
import { of } from 'rxjs';

import { InviteLinksComponent, stringHash } from './invite-links.component';

describe('InviteLinksComponent', () => {
  let component: InviteLinksComponent;
  let fixture: ComponentFixture<InviteLinksComponent>;

  beforeEach(waitForAsync(async () => {
    await TestBed.configureTestingModule({
      imports: [InviteLinksComponent],
      providers: [
        {
          provide: ErrorLogger,
          useValue: {
            logError: vi.fn(),
            logErrorHandler: vi.fn(() => vi.fn()),
          },
        },
        { provide: NavController, useValue: {} },
        { provide: SpaceNavService, useValue: {} },
        {
          provide: SneatUserService,
          useValue: { userChanged: of(undefined), userState: of({}) },
        },
        {
          provide: CONTACTUS_NAV_SERVICE,
          useValue: {
            navigateToAddMember: vi.fn(() => Promise.resolve(true)),
          },
        },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
      .overrideComponent(InviteLinksComponent, {
        set: { imports: [], template: '' },
      })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(InviteLinksComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  const stop = () =>
    ({ stopPropagation: vi.fn(), preventDefault: vi.fn() }) as unknown as Event;
  const navSvc = () =>
    TestBed.inject(CONTACTUS_NAV_SERVICE) as unknown as {
      navigateToAddMember: ReturnType<typeof vi.fn>;
    };

  describe('stringHash', () => {
    it('returns 0 for an empty string', () => {
      expect(stringHash('')).toBe(0);
    });
    it('is deterministic and non-zero for content', () => {
      expect(stringHash('abc')).toBe(stringHash('abc'));
      expect(stringHash('abc')).not.toBe(0);
    });
  });

  describe('goNewMember', () => {
    it('logs an error without a space id', () => {
      component.contactusSpace = undefined;
      component.goNewMember(stop());
      expect(navSvc().navigateToAddMember).not.toHaveBeenCalled();
    });

    it('navigates to add member with a space id', () => {
      component.contactusSpace = { id: 's1' };
      component.goNewMember(stop());
      expect(navSvc().navigateToAddMember).toHaveBeenCalledWith({ id: 's1' });
    });
  });

  it('ngOnDestroy unsubscribes without error', () => {
    expect(() => component.ngOnDestroy()).not.toThrow();
  });
});
