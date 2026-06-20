import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { CONTACTUS_SPACE_SERVICE } from '@sneat/extension-contactus-contract';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ErrorLogger } from '@sneat/core';
import { ClassName } from '@sneat/ui';
import { SpaceNavService } from '@sneat/space-services';
import { of } from 'rxjs';

import { RelatedContactsComponent } from './related-contacts.component';

describe('RelatedContactsComponent', () => {
  let component: RelatedContactsComponent;
  let fixture: ComponentFixture<RelatedContactsComponent>;

  beforeEach(waitForAsync(async () => {
    await TestBed.configureTestingModule({
      imports: [RelatedContactsComponent, NoopAnimationsModule],
      providers: [
        { provide: ClassName, useValue: 'RelatedContactsComponent' },
        {
          provide: ErrorLogger,
          useValue: {
            logError: vi.fn(),
            logErrorHandler: vi.fn(() => vi.fn()),
          },
        },
        { provide: SpaceNavService, useValue: {} },
        {
          provide: CONTACTUS_SPACE_SERVICE,
          useValue: { watchContactBriefs: vi.fn(() => of([])) },
        },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
      .overrideComponent(RelatedContactsComponent, {
        set: { imports: [], template: '' },
      })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(RelatedContactsComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('$space', { id: 'test-space' });
    fixture.componentRef.setInput('$relatedTo', undefined);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = () => component as any;

  it('$related / $relatedItems extract the contactus contacts map', () => {
    fixture.componentRef.setInput('$relatedTo', {
      key: {},
      related: { contactus: { contacts: { c1: { rolesOfItem: {} } } } },
    });
    fixture.detectChanges();
    expect(c().$related()).toEqual({
      contactus: { contacts: { c1: { rolesOfItem: {} } } },
    });
    expect(c().$relatedItems()).toEqual({ c1: { rolesOfItem: {} } });
  });

  it('$relatedContacts filters space contacts by the related items', () => {
    c().$spaceContacts.set([
      { id: 'c1', brief: {} },
      { id: 'c2', brief: {} },
    ]);
    fixture.componentRef.setInput('$relatedTo', {
      key: {},
      related: { contactus: { contacts: { c1: { rolesOfItem: {} } } } },
    });
    fixture.detectChanges();
    expect(c().$relatedContacts().map((x: { id: string }) => x.id)).toEqual([
      'c1',
    ]);
  });

  it('$relatedGroups returns the empty group template without related data', () => {
    expect(c().$relatedGroups().map((g: { relatedAs: string }) => g.relatedAs)).toEqual([
      'parent',
      'child',
      'sibling',
      'friend',
      'other',
    ]);
  });
});
