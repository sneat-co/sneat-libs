import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ErrorLogger } from '@sneat/core';
import { ClassName } from '@sneat/ui';
import { SpaceNavService, SpaceService } from '@sneat/space-services';
import { of } from 'rxjs';

import { ContactRelationshipFormComponent } from './contact-relationship-form.component';

describe('ContactRelationshipFormComponent', () => {
  let component: ContactRelationshipFormComponent;
  let fixture: ComponentFixture<ContactRelationshipFormComponent>;

  beforeEach(waitForAsync(async () => {
    await TestBed.configureTestingModule({
      imports: [ContactRelationshipFormComponent],
      providers: [
        { provide: ClassName, useValue: 'ContactRelationshipFormComponent' },
        {
          provide: ErrorLogger,
          useValue: {
            logError: vi.fn(),
            logErrorHandler: vi.fn(() => vi.fn()),
          },
        },
        { provide: SpaceNavService, useValue: {} },
        { provide: SpaceService, useValue: { updateRelated: vi.fn() } },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
      .overrideComponent(ContactRelationshipFormComponent, {
        set: { imports: [], template: '' },
      })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ContactRelationshipFormComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('$space', { id: 'test-space' });
    fixture.componentRef.setInput('$contactID', 'test-contact');
    fixture.componentRef.setInput('$ageGroup', undefined);
    fixture.componentRef.setInput('$relatedTo', undefined);
    fixture.componentRef.setInput('$userSpaceContactID', undefined);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = () => component as any;

  it('$itemRef builds a contactus item ref from space and contact ids', () => {
    expect(c().$itemRef()).toEqual({
      spaceID: 'test-space',
      module: 'contactus',
      collection: 'contacts',
      itemID: 'test-contact',
    });
  });

  it('$relationshipOptions are empty for non-family spaces', () => {
    fixture.componentRef.setInput('$space', { id: 's1', type: 'team' });
    fixture.detectChanges();
    expect(c().$relationshipOptions()).toEqual([]);
  });

  it('$relationshipOptions offer family relations for a family space', () => {
    fixture.componentRef.setInput('$space', { id: 's1', type: 'family' });
    fixture.detectChanges();
    const ids = c()
      .$relationshipOptions()
      .map((o: { id: string }) => o.id);
    expect(ids).toContain('spouse');
    expect(ids).toContain('other');
  });

  it('onRelatedAsChanged emits roles directly when there is no contact id', () => {
    fixture.componentRef.setInput('$contactID', undefined);
    fixture.detectChanges();
    const emit = vi.spyOn(component.relatedAsChange, 'emit');
    c().onRelatedAsChanged({ add: { rolesToItem: ['parent'] } });
    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({ parent: expect.anything() }),
    );
  });

  it('onRelatedAsChanged updates related when contact and user ids are set', () => {
    const updateRelated = (
      TestBed.inject(SpaceService) as unknown as {
        updateRelated: ReturnType<typeof vi.fn>;
      }
    ).updateRelated;
    updateRelated.mockReturnValue(of(undefined));
    fixture.componentRef.setInput('$userSpaceContactID', 'u1');
    fixture.detectChanges();
    c().onRelatedAsChanged({ add: { rolesToItem: ['parent'] } });
    expect(updateRelated).toHaveBeenCalled();
  });
});
