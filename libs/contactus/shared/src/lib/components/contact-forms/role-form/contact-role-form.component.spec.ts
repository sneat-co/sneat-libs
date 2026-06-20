import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { CONTACT_GROUP_SERVICE } from '@sneat/extension-contactus-contract';
import { CUSTOM_ELEMENTS_SCHEMA, Component } from '@angular/core';
import { of } from 'rxjs';

import { ContactRoleFormComponent } from './contact-role-form.component';
import { ErrorLogger } from '@sneat/core';

describe('ContactRoleFormComponent', () => {
  let component: ContactRoleFormComponent;
  let fixture: ComponentFixture<MockComponent>;

  @Component({
    selector: 'sneat-mock-component',
    template:
      '<sneat-contact-role-form [$contactGroupID]="contactGroupID" [$contactRoleID]="contactRoleID"/>',
    imports: [ContactRoleFormComponent],
    standalone: true,
  })
  class MockComponent {
    contactGroupID = undefined;
    contactRoleID = undefined;
  }

  beforeEach(waitForAsync(async () => {
    await TestBed.configureTestingModule({
      imports: [MockComponent],
      providers: [
        {
          provide: CONTACT_GROUP_SERVICE,
          useValue: { getContactGroups: vi.fn().mockReturnValue(of([])) },
        },
        {
          provide: ErrorLogger,
          useValue: {
            logError: vi.fn(),
            logErrorHandler: vi.fn(() => vi.fn()),
          },
        },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MockComponent);
    component = fixture.debugElement.children[0].componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = () => component as any;
  const groups = [
    {
      id: 'family',
      dbo: {
        title: 'Family',
        emoji: '👪',
        roles: [
          { id: 'parent', brief: { title: 'Parent', emoji: '🧑' } },
          { id: 'pet', brief: { title: 'Pet' } },
        ],
      },
    },
  ];

  it('$groupItems maps groups to select items', () => {
    c().$groups.set(groups);
    expect(c().$groupItems()).toEqual([
      { id: 'family', title: 'Family', emoji: '👪' },
    ]);
  });

  it('$roleItems is empty when no group is selected', () => {
    c().$groups.set(groups);
    expect(c().$roleItems()).toEqual([]);
  });

  it('onContactGroupIDChanged emits the group id and group', () => {
    c().$groups.set(groups);
    const idEmit = vi.spyOn(component.contactGroupIDChange, 'emit');
    const groupEmit = vi.spyOn(component.contactGroupChange, 'emit');
    c().onContactGroupIDChanged('family');
    expect(idEmit).toHaveBeenCalledWith('family');
    expect(groupEmit).toHaveBeenCalledWith(groups[0]);
  });
});
