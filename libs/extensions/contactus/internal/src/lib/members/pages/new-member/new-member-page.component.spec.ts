import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { NewMemberPageComponent } from './new-member-page.component';
import { provideContactusMocks } from '../../../testing/test-utils';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('MemberNewPage', () => {
  let component: NewMemberPageComponent;
  let fixture: ComponentFixture<NewMemberPageComponent>;

  beforeEach(waitForAsync(async () => {
    await TestBed.configureTestingModule({
      imports: [NewMemberPageComponent],
      providers: [provideContactusMocks()],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
      .overrideComponent(NewMemberPageComponent, {
        set: { imports: [], providers: [] },
      })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NewMemberPageComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  type Testable = {
    onContactTypeChanged(e: CustomEvent): void;
    onTabChanged(e: CustomEvent): void;
    $contact(): { dbo?: { type?: string }; space?: { id?: string } };
    $inviteType(): string;
    $contactType(): string | undefined;
  };
  const t = () => component as unknown as Testable;

  it('onContactTypeChanged updates the contact dbo type', () => {
    t().onContactTypeChanged({ detail: { value: 'animal' } } as CustomEvent);
    expect(t().$contact().dbo?.type).toBe('animal');
    expect(t().$contactType()).toBe('animal');
  });

  it('onTabChanged switches the invite type', () => {
    t().onTabChanged({ detail: { value: 'personal' } } as CustomEvent);
    expect(t().$inviteType()).toBe('personal');
  });

  describe('query param group handling', () => {
    const createWith = async (queryParams: Record<string, string>) => {
      TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [NewMemberPageComponent],
        providers: [
          provideContactusMocks(),
          {
            provide: ActivatedRoute,
            useValue: {
              queryParams: of(queryParams),
              queryParamMap: of({ get: () => null }),
              paramMap: of({ get: () => null }),
              params: of({}),
              snapshot: {
                paramMap: { get: () => null },
                queryParamMap: { get: () => null },
              },
            },
          },
        ],
        schemas: [CUSTOM_ELEMENTS_SCHEMA],
      })
        .overrideComponent(NewMemberPageComponent, {
          set: { imports: [], providers: [] },
        })
        .compileComponents();
      const f = TestBed.createComponent(NewMemberPageComponent);
      return f.componentInstance as unknown as Testable;
    };

    it('maps group=kids to a child person', async () => {
      const c = await createWith({ group: 'kids' });
      expect(c.$contact().dbo?.type).toBe('person');
      expect(
        (c.$contact().dbo as { ageGroup?: string }).ageGroup,
      ).toBe('child');
    });

    it('maps group=pets to an animal', async () => {
      const c = await createWith({ group: 'pets' });
      expect(c.$contact().dbo?.type).toBe('animal');
    });

    it('maps roles param into the contact dbo roles', async () => {
      const c = await createWith({ roles: 'parent, child' });
      expect((c.$contact().dbo as { roles?: string[] }).roles).toEqual([
        'parent',
        'child',
      ]);
    });
  });
});
