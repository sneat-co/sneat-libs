import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ErrorLogger } from '@sneat/core';
import { ClassName } from '@sneat/ui';
import { SpaceNavService } from '@sneat/space-services';

import { FamilyMembersComponent } from './family-members.component';

describe('FamilyMembersComponent', () => {
  let component: FamilyMembersComponent;
  let fixture: ComponentFixture<FamilyMembersComponent>;

  beforeEach(waitForAsync(async () => {
    await TestBed.configureTestingModule({
      imports: [FamilyMembersComponent],
      providers: [
        { provide: ClassName, useValue: 'FamilyMembersComponent' },
        {
          provide: ErrorLogger,
          useValue: {
            logError: vi.fn(),
            logErrorHandler: vi.fn(() => vi.fn()),
          },
        },
        { provide: SpaceNavService, useValue: {} },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
      .overrideComponent(FamilyMembersComponent, {
        set: { imports: [], template: '' },
      })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FamilyMembersComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('$space', { id: 'test-space' });
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = () => component as any;

  it('groups members into adults, children, pets and other on changes', () => {
    component.contactusSpaceDbo = {
      contacts: {
        a1: { type: 'person', ageGroup: 'adult', roles: ['member'] },
        k1: { type: 'person', ageGroup: 'child', roles: ['member'] },
        p1: { type: 'animal', roles: ['member'] },
        o1: { type: 'person', roles: ['member'] },
        nonMember: { type: 'person', ageGroup: 'adult', roles: [] },
      },
    } as never;
    component.ngOnChanges({ contactusSpaceDbo: {} as never });

    const groups = c().predefinedMemberGroups;
    const byId = (id: string) =>
      groups.find((g: { id: string }) => g.id === id);
    expect(byId('adults').contacts.map((m: { id: string }) => m.id)).toEqual([
      'a1',
    ]);
    expect(byId('kids').contacts.map((m: { id: string }) => m.id)).toEqual([
      'k1',
    ]);
    expect(byId('pets').contacts.map((m: { id: string }) => m.id)).toEqual([
      'p1',
    ]);
    // Non-members are excluded entirely.
    const allIds = groups.flatMap((g: { contacts: { id: string }[] }) =>
      g.contacts.map((m) => m.id),
    );
    expect(allIds).not.toContain('nonMember');
    expect(allIds).toEqual(expect.arrayContaining(['a1', 'k1', 'p1']));
  });

  it('places an ungrouped member into the other group', () => {
    component.contactusSpaceDbo = {
      contacts: {
        o1: { type: 'person', roles: ['member'] },
      },
    } as never;
    component.ngOnChanges({ contactusSpaceDbo: {} as never });
    const other = c().predefinedMemberGroups.find(
      (g: { id: string }) => g.id === 'other',
    );
    expect(other.contacts.map((m: { id: string }) => m.id)).toEqual(['o1']);
  });
});
