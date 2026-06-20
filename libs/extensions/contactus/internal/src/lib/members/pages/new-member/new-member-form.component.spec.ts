import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { NavController } from '@ionic/angular/standalone';
import { of, throwError } from 'rxjs';

import { NewMemberFormComponent } from './new-member-form.component';
import { provideContactusMocks } from '../../../testing/test-utils';
import { MemberService } from '../../../services';
import { SpaceNavService } from '@sneat/space-services';
import { RoutingState } from '@sneat/core';
import { NavController } from '@ionic/angular/standalone';

interface ITestable {
  submit(): void;
  onContactChanged(contact: unknown): void;
  contactusSpace?: unknown;
  personFormComponent?: unknown;
  personRequirements: Record<string, unknown>;
}

describe('NewMemberFormComponent', () => {
  let component: NewMemberFormComponent;
  let testable: ITestable;
  let fixture: ComponentFixture<NewMemberFormComponent>;
  let memberService: { createMember: ReturnType<typeof vi.fn> };
  let navController: { pop: ReturnType<typeof vi.fn> };
  let spaceNav: {
    navigateBackToSpacePage: ReturnType<typeof vi.fn>;
    navigateForwardToSpacePage: ReturnType<typeof vi.fn>;
  };

  const setInputs = (
    space: Record<string, unknown>,
    dbo: Record<string, unknown>,
  ) => {
    fixture.componentRef.setInput('$space', space);
    fixture.componentRef.setInput('$contact', { space, dbo });
    fixture.detectChanges();
    // @ViewChild is reset to undefined while change detection runs against the
    // stubbed (empty) template, so (re)install the stub after detectChanges().
    testable.personFormComponent = {};
  };

  beforeEach(waitForAsync(async () => {
    memberService = { createMember: vi.fn(() => of({ id: 'm1' })) };
    navController = { pop: vi.fn(() => Promise.resolve(true)) };
    spaceNav = {
      navigateBackToSpacePage: vi.fn(() => Promise.resolve(true)),
      navigateForwardToSpacePage: vi.fn(() => Promise.resolve(true)),
    };

    await TestBed.configureTestingModule({
      imports: [NewMemberFormComponent],
      providers: [
        ...provideContactusMocks(),
        { provide: MemberService, useValue: memberService },
        { provide: SpaceNavService, useValue: spaceNav },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
      .overrideComponent(NewMemberFormComponent, {
        set: {
          imports: [],
          schemas: [CUSTOM_ELEMENTS_SCHEMA],
          template: '',
          providers: [{ provide: NavController, useValue: navController }],
        },
      })
      .compileComponents();
    fixture = TestBed.createComponent(NewMemberFormComponent);
    component = fixture.componentInstance;
    testable = component as unknown as ITestable;
    setInputs(
      { id: 'test-space', type: 'family' },
      { type: 'person', gender: 'unknown' },
    );
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('$qrData', () => {
    it('builds the base join url for a family space', () => {
      setInputs({ id: 'fam1', type: 'family' }, { type: 'person' });
      const url = (component as unknown as { $qrData(): string }).$qrData();
      expect(url).toContain('https://sneat.app/pwa/join?family=fam1');
      expect(url).toContain('utm_campaign=new_member');
      expect(url).not.toContain('gender=');
    });

    it('appends gender and ageGroup when meaningfully set', () => {
      setInputs(
        { id: 'fam1', type: 'family' },
        { type: 'person', gender: 'male', ageGroup: 'adult' },
      );
      const url = (component as unknown as { $qrData(): string }).$qrData();
      expect(url).toContain('&gender=male');
      expect(url).toContain('&ageGroup=adult');
    });

    it('omits gender for non-meaningful values', () => {
      setInputs(
        { id: 'fam1', type: 'family' },
        { type: 'person', gender: 'other' },
      );
      const url = (component as unknown as { $qrData(): string }).$qrData();
      expect(url).not.toContain('gender=');
    });
  });

  describe('onContactChanged / setPersonRequirements', () => {
    it('requires ageGroup+relatedAs and hides roles for a family person', () => {
      const contact = {
        space: { id: 'fam1', type: 'family' },
        dbo: { type: 'person' },
      };
      const emit = vi.spyOn(component.contactChange, 'emit');
      testable.onContactChanged(contact);
      expect(testable.personRequirements['ageGroup']).toEqual({
        required: true,
      });
      expect(testable.personRequirements['roles']).toEqual({ hide: true });
      expect(testable.personRequirements['relatedAs']).toEqual({
        required: true,
      });
      expect(emit).toHaveBeenCalledWith(contact);
    });

    it('hides ageGroup+relatedAs and requires roles for a non-family/animal', () => {
      setInputs({ id: 'team1', type: 'team' }, { type: 'person' });
      const contact = {
        space: { id: 'team1', type: 'team' },
        dbo: { type: 'person' },
      };
      testable.onContactChanged(contact);
      expect(testable.personRequirements['ageGroup']).toEqual({ hide: true });
      expect(testable.personRequirements['roles']).toEqual({ required: true });
      expect(testable.personRequirements['relatedAs']).toEqual({ hide: true });
    });
  });

  describe('submit', () => {
    it('logs an error and aborts when space has no id', () => {
      setInputs({ type: 'family' }, { type: 'person' });
      testable.submit();
      expect(memberService.createMember).not.toHaveBeenCalled();
    });

    it('throws when a required ageGroup is missing', () => {
      setInputs({ id: 'fam1', type: 'family' }, { type: 'person' });
      testable.personRequirements = { ageGroup: { required: true } };
      expect(() => testable.submit()).toThrow('Age group is a required field');
    });

    it('creates the member and navigates back when valid', () => {
      setInputs(
        { id: 'fam1', type: 'family' },
        { type: 'person', ageGroup: 'adult', gender: 'male', names: {} },
      );
      testable.personRequirements = {};
      testable.contactusSpace = { dbo: { contacts: {} } };
      testable.submit();
      expect(memberService.createMember).toHaveBeenCalledWith(
        expect.objectContaining({ spaceID: 'fam1', status: 'active' }),
      );
      expect(spaceNav.navigateBackToSpacePage).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'fam1' }),
        'members',
      );
    });

    it('re-enables the form on a create error', () => {
      memberService.createMember.mockReturnValue(
        throwError(() => new Error('boom')),
      );
      setInputs(
        { id: 'fam1', type: 'family' },
        { type: 'person', ageGroup: 'adult', gender: 'male', names: {} },
      );
      testable.personRequirements = {};
      testable.contactusSpace = { dbo: { contacts: {} } };
      testable.submit();
      expect(
        (component as unknown as { addMemberForm: { enabled: boolean } })
          .addMemberForm.enabled,
      ).toBe(true);
    });

    it('pops the nav stack on success when there is nav history', async () => {
      TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [NewMemberFormComponent],
        providers: [
          ...provideContactusMocks(),
          { provide: MemberService, useValue: memberService },
          { provide: SpaceNavService, useValue: spaceNav },
          { provide: RoutingState, useValue: { hasHistory: () => true } },
        ],
        schemas: [CUSTOM_ELEMENTS_SCHEMA],
      })
        .overrideComponent(NewMemberFormComponent, {
          set: {
            imports: [],
            schemas: [CUSTOM_ELEMENTS_SCHEMA],
            template: '',
            providers: [{ provide: NavController, useValue: navController }],
          },
        })
        .compileComponents();
      const f = TestBed.createComponent(NewMemberFormComponent);
      const c = f.componentInstance;
      const ct = c as unknown as ITestable;
      f.componentRef.setInput('$space', { id: 'fam1', type: 'family' });
      f.componentRef.setInput('$contact', {
        space: { id: 'fam1', type: 'family' },
        dbo: { type: 'person', ageGroup: 'adult', gender: 'male', names: {} },
      });
      f.detectChanges();
      ct.personFormComponent = {};
      ct.personRequirements = {};
      ct.contactusSpace = { dbo: { contacts: {} } };
      ct.submit();
      expect(navController.pop).toHaveBeenCalled();
    });
  });
});
