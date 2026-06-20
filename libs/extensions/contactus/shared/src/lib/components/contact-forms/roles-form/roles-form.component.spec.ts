import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ErrorLogger } from '@sneat/core';
import { ClassName } from '@sneat/ui';
import { SpaceNavService } from '@sneat/space-services';

import { RolesFormComponent } from './roles-form.component';

describe('RolesFormComponent', () => {
  let component: RolesFormComponent;
  let fixture: ComponentFixture<RolesFormComponent>;

  beforeEach(waitForAsync(async () => {
    await TestBed.configureTestingModule({
      imports: [RolesFormComponent, NoopAnimationsModule],
      providers: [
        { provide: ClassName, useValue: 'RolesFormComponent' },
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
      .overrideComponent(RolesFormComponent, {
        set: { imports: [], template: '' },
      })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(RolesFormComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('$space', { id: 'test-space' });
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = () => component as any;
  const stopEvent = () =>
    ({ stopPropagation: vi.fn() }) as unknown as Event;

  it('roleChecked emits the ids of the checked roles', () => {
    component.roles = [
      { id: 'teacher', title: 'Teacher', icon: 'person', checked: true },
      { id: 'admin', title: 'Admin', icon: 'robot', checked: false },
    ];
    const emit = vi.spyOn(component.rolesChange, 'emit');
    component.roleChecked(stopEvent());
    expect(emit).toHaveBeenCalledWith(['teacher']);
  });

  it('configures educator staff roles on space type change', () => {
    vi.spyOn(location, 'pathname', 'get').mockReturnValue('/space/staff');
    c().onSpaceTypeChanged({ id: 's1', type: 'educator' });
    expect(component.roles?.map((r) => r.id)).toEqual([
      'teacher',
      'administrator',
    ]);
  });
});
