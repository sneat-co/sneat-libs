import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ErrorLogger } from '@sneat/core';
import { ClassName } from '@sneat/ui';
import { SpaceNavService, SpaceService } from '@sneat/space-services';
import { SneatUserService } from '@sneat/auth-core';
import { of } from 'rxjs';

import { RelationshipFormComponent } from './relationship-form.component';

describe('RelationshipFormComponent', () => {
  let component: RelationshipFormComponent;
  let fixture: ComponentFixture<RelationshipFormComponent>;

  beforeEach(waitForAsync(async () => {
    await TestBed.configureTestingModule({
      imports: [RelationshipFormComponent, NoopAnimationsModule],
      providers: [
        { provide: ClassName, useValue: 'RelationshipFormComponent' },
        {
          provide: ErrorLogger,
          useValue: {
            logError: vi.fn(),
            logErrorHandler: vi.fn(() => vi.fn()),
          },
        },
        { provide: SpaceNavService, useValue: {} },
        { provide: SpaceService, useValue: { updateRelated: vi.fn() } },
        {
          provide: SneatUserService,
          useValue: { userState: of({}), userChanged: of(undefined) },
        },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
      .overrideComponent(RelationshipFormComponent, {
        set: { imports: [], template: '' },
      })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(RelationshipFormComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('$space', { id: 'test-space' });
    fixture.componentRef.setInput('$itemRef', undefined);
    fixture.componentRef.setInput('$relatedTo', undefined);
    fixture.componentRef.setInput('$relationshipOptions', []);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = () => component as any;
  const stop = () =>
    ({ stopPropagation: vi.fn(), preventDefault: vi.fn() }) as unknown as Event;

  it('onRelationshipChanged emits an add change', () => {
    const emit = vi.spyOn(component.relatedAsChange, 'emit');
    c().onRelationshipChanged('parent');
    expect(emit).toHaveBeenCalledWith({ add: { rolesToItem: ['parent'] } });
  });

  it('openAddRelationship alerts not implemented', () => {
    const alertSpy = vi.fn();
    vi.stubGlobal('alert', alertSpy);
    c().openAddRelationship(stop());
    expect(alertSpy).toHaveBeenCalled();
  });

  describe('$rolesOfItemRelatedToTarget', () => {
    it('is undefined without related data', () => {
      expect(c().$rolesOfItemRelatedToTarget()).toBeUndefined();
    });

    it('maps rolesToItem entries into a list', () => {
      const key = {
        spaceID: 's1',
        module: 'contactus',
        collection: 'contacts',
        itemID: 'u1',
      };
      fixture.componentRef.setInput('$relatedTo', {
        key,
        related: {
          contactus: {
            contacts: { u1: { rolesToItem: { parent: { created: {} } } } },
          },
        },
      });
      fixture.detectChanges();
      const roles = c().$rolesOfItemRelatedToTarget();
      expect(roles.map((r: { id: string }) => r.id)).toEqual(['parent']);
      expect(c().$relationshipsCount()).toBe(1);
      expect(c().$hasRelationships()).toBe(true);
    });
  });

  it('removeRelationship throws without an itemRef', () => {
    expect(() => c().removeRelationship(stop(), 'parent')).toThrow(
      'itemRef is not set',
    );
  });

  it('removeRelationship updates related when refs are set', () => {
    const updateRelated = (
      TestBed.inject(SpaceService) as unknown as {
        updateRelated: ReturnType<typeof vi.fn>;
      }
    ).updateRelated;
    updateRelated.mockReturnValue(of(undefined));
    fixture.componentRef.setInput('$itemRef', {
      spaceID: 's1',
      module: 'contactus',
      collection: 'contacts',
      itemID: 'c1',
    });
    fixture.componentRef.setInput('$relatedTo', {
      key: {
        spaceID: 's1',
        module: 'contactus',
        collection: 'contacts',
        itemID: 'u1',
      },
      related: {},
    });
    fixture.detectChanges();
    const emit = vi.spyOn(component.relatedAsChange, 'emit');
    c().removeRelationship(stop(), 'parent');
    expect(updateRelated).toHaveBeenCalled();
    expect(emit).toHaveBeenCalledWith({ remove: { rolesToItem: ['parent'] } });
  });
});
