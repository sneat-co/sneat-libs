import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { NewContactPageComponent } from './new-contact-page.component';
import { provideContactusMocks } from '../../testing/test-utils';

describe('ContactNewPage', () => {
  let component: NewContactPageComponent;
  let fixture: ComponentFixture<NewContactPageComponent>;

  beforeEach(waitForAsync(async () => {
    await TestBed.configureTestingModule({
      imports: [NewContactPageComponent],
      providers: [provideContactusMocks()],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
      .overrideComponent(NewContactPageComponent, {
        set: {
          imports: [],
          template: '',
          schemas: [CUSTOM_ELEMENTS_SCHEMA],
          providers: [],
        },
      })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NewContactPageComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  interface ITestable {
    onUrlParamsChanged(p: { get(k: string): string | null }): void;
    onContactChanged(c: unknown): void;
    $relation(): string | undefined;
    $contactGroupID(): string;
    $contactRoleID(): string | undefined;
    $assetID(): string;
    $parentContactID(): string;
    $contact(): unknown;
    $spaceRef: { set(v: unknown): void };
  }
  const t = () => component as unknown as ITestable;
  const paramMap = (m: Record<string, string>) => ({
    get: (k: string) => m[k] ?? null,
  });

  describe('onUrlParamsChanged', () => {
    beforeEach(() => t().$spaceRef.set({ id: 'space1' }));

    it('ignores empty params', () => {
      t().onUrlParamsChanged(paramMap({}));
      expect(t().$relation()).toBeUndefined();
      expect(t().$contactGroupID()).toBe('');
      expect(t().$assetID()).toBe('');
    });

    it('applies relation, group, role, asset and parent contact params', () => {
      t().onUrlParamsChanged(
        paramMap({
          relation: 'child',
          group: 'g1',
          role: 'tenant',
          asset: 'a1',
          contact: 'p1',
        }),
      );
      expect(t().$relation()).toBe('child');
      expect(t().$contactGroupID()).toBe('g1');
      expect(t().$contactRoleID()).toBe('tenant');
      expect(t().$assetID()).toBe('a1');
      expect(t().$parentContactID()).toBe('p1');
    });
  });

  it('onContactChanged stores the contact', () => {
    const contact = { space: { id: 'space1' }, dbo: { type: 'person' } };
    t().onContactChanged(contact);
    expect(t().$contact()).toBe(contact);
  });
});
