import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { MembersPageComponent } from './members-page.component';
import { provideContactusMocks } from '../../../testing/test-utils';

describe('CommuneMembersPage', () => {
  let component: MembersPageComponent;
  let fixture: ComponentFixture<MembersPageComponent>;

  beforeEach(waitForAsync(async () => {
    await TestBed.configureTestingModule({
      imports: [MembersPageComponent],
      providers: [provideContactusMocks()],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
      .overrideComponent(MembersPageComponent, {
        set: { imports: [], providers: [] },
      })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MembersPageComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  type Testable = {
    segment: 'all' | 'groups';
    goNew(): void;
    goGroup(g: unknown): void;
    goNewMemberPage(g?: unknown): void;
    onSpaceDboChanged(): void;
    navigateForwardToSpacePage: ReturnType<typeof vi.fn>;
    $spaceRef: { set(v: unknown): void };
  };
  const t = () => component as unknown as Testable;

  beforeEach(() => {
    t().navigateForwardToSpacePage = vi.fn(() => Promise.resolve(true));
  });

  it('goNew navigates to new-member for the "all" segment', () => {
    t().segment = 'all';
    t().goNew();
    expect(t().navigateForwardToSpacePage).toHaveBeenCalledWith(
      'new-member',
      expect.anything(),
    );
  });

  it('goNew navigates to new-group for the "groups" segment', () => {
    t().segment = 'groups';
    t().goNew();
    expect(t().navigateForwardToSpacePage).toHaveBeenCalledWith('new-group');
  });

  it('goGroup navigates to the member group page with state', () => {
    t().goGroup({ id: 'g1' });
    expect(t().navigateForwardToSpacePage).toHaveBeenCalledWith(
      'group/g1',
      expect.objectContaining({ state: { memberGroup: { id: 'g1' } } }),
    );
  });

  it('goNewMemberPage passes the group as a query param', () => {
    t().goNewMemberPage({ id: 'adults' });
    expect(t().navigateForwardToSpacePage).toHaveBeenCalledWith(
      'new-member',
      expect.objectContaining({ queryParams: { group: 'adults' } }),
    );
  });

  it('goNew alerts on an unknown segment', () => {
    const alertSpy = vi.fn();
    vi.stubGlobal('alert', alertSpy);
    t().segment = 'weird' as never;
    t().goNew();
    expect(alertSpy).toHaveBeenCalled();
    expect(t().navigateForwardToSpacePage).not.toHaveBeenCalled();
  });

  describe('onSpaceDboChanged', () => {
    it('loads data for a family space without throwing', () => {
      t().$spaceRef.set({ id: 'fam1', type: 'family' });
      expect(() => t().onSpaceDboChanged()).not.toThrow();
    });

    it('throws "not implemented" for a member-group space', () => {
      t().$spaceRef.set({ id: 'edu1', type: 'educator' });
      expect(() => t().onSpaceDboChanged()).toThrow(
        'not implemented yet due to refactoring',
      );
    });
  });
});
