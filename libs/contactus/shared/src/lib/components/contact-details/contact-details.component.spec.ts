import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ErrorLogger } from '@sneat/core';
import { ClassName } from '@sneat/ui';
import { SpaceNavService } from '@sneat/space-services';
import { ModalController } from '@ionic/angular/standalone';
import { SneatUserService } from '@sneat/auth-core';
import { of } from 'rxjs';

import { ContactDetailsComponent } from './contact-details.component';

describe('ContactDetailsComponent', () => {
  let component: ContactDetailsComponent;
  let fixture: ComponentFixture<ContactDetailsComponent>;

  beforeEach(waitForAsync(async () => {
    await TestBed.configureTestingModule({
      imports: [ContactDetailsComponent],
      providers: [
        { provide: ClassName, useValue: 'ContactDetailsComponent' },
        {
          provide: ErrorLogger,
          useValue: {
            logError: vi.fn(),
            logErrorHandler: vi.fn(() => vi.fn()),
          },
        },
        { provide: SpaceNavService, useValue: {} },
        {
          provide: ModalController,
          useValue: { create: vi.fn(), dismiss: vi.fn() },
        },
        {
          provide: SneatUserService,
          useValue: {
            userState: of({}),
            userChanged: of(undefined),
            currentUserID: undefined,
          },
        },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
      .overrideComponent(ContactDetailsComponent, {
        set: { imports: [], template: '', providers: [] },
      })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ContactDetailsComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('$space', { id: 'test-space' });
    fixture.componentRef.setInput('$contact', {
      id: 'test-contact',
      space: { id: 'test-space' },
    });
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = () => component as any;
  const setContact = (contact: unknown) => {
    fixture.componentRef.setInput('$contact', contact);
    fixture.detectChanges();
  };

  it('$showRolesTab is hidden for family spaces', () => {
    fixture.componentRef.setInput('$space', { id: 's1', type: 'family' });
    fixture.detectChanges();
    expect(c().$showRolesTab()).toBe(false);
    fixture.componentRef.setInput('$space', { id: 's1', type: 'team' });
    fixture.detectChanges();
    expect(c().$showRolesTab()).toBe(true);
  });

  it('$isMember reflects the member role', () => {
    setContact({ id: 'c1', space: { id: 's1' }, brief: { roles: ['member'] } });
    expect(c().$isMember()).toBe(true);
    setContact({ id: 'c1', space: { id: 's1' }, brief: { roles: [] } });
    expect(c().$isMember()).toBe(false);
  });

  it('hideForContactTypes hides for non-matching contact types', () => {
    setContact({ id: 'c1', space: { id: 's1' }, brief: { type: 'company' } });
    expect(c().hideForContactTypes(['person'])).toBe(true);
    expect(c().hideForContactTypes(['company'])).toBe(false);
  });

  it('$contactWithBriefAndOptionalDbo is set only when a brief exists', () => {
    setContact({ id: 'c1', space: { id: 's1' } });
    expect(c().$contactWithBriefAndOptionalDbo()).toBeUndefined();
    setContact({ id: 'c1', space: { id: 's1' }, brief: { type: 'person' } });
    expect(c().$contactWithBriefAndOptionalDbo()).toBeTruthy();
  });

  describe('onGenderChanged', () => {
    it('throws when no contact is set', () => {
      setContact(undefined);
      expect(() => c().onGenderChanged('male')).toThrow('Contact is not set');
    });

    it('emits the contact with the new gender', () => {
      setContact({ id: 'c1', space: { id: 's1' }, dbo: { gender: 'unknown' } });
      const emit = vi.spyOn(component.contactChange, 'emit');
      c().onGenderChanged('male');
      expect(emit).toHaveBeenCalledWith(
        expect.objectContaining({ dbo: expect.objectContaining({ gender: 'male' }) }),
      );
    });
  });

  it('openEditNamesDialog presents a modal', async () => {
    const present = vi.fn(() => Promise.resolve());
    (
      TestBed.inject(ModalController) as unknown as {
        create: ReturnType<typeof vi.fn>;
      }
    ).create.mockReturnValue(Promise.resolve({ present }));
    setContact({ id: 'c1', space: { id: 's1' }, dbo: { names: {} } });
    await c().openEditNamesDialog();
    expect(present).toHaveBeenCalled();
  });
});
