import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ErrorLogger } from '@sneat/core';
import { ClassName } from '@sneat/ui';
import { SpaceNavService } from '@sneat/space-services';
import { SneatUserService } from '@sneat/auth-core';
import { of } from 'rxjs';

import { PersonWizardComponent } from './person-wizard.component';

describe('PersonWizardComponent', () => {
  let component: PersonWizardComponent;
  let fixture: ComponentFixture<PersonWizardComponent>;

  beforeEach(waitForAsync(async () => {
    await TestBed.configureTestingModule({
      imports: [PersonWizardComponent, NoopAnimationsModule],
      providers: [
        { provide: ClassName, useValue: 'PersonWizardComponent' },
        {
          provide: ErrorLogger,
          useValue: {
            logError: vi.fn(),
            logErrorHandler: vi.fn(() => vi.fn()),
          },
        },
        { provide: SpaceNavService, useValue: {} },
        {
          provide: SneatUserService,
          useValue: { userState: of({}), userChanged: of(undefined) },
        },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
      .overrideComponent(PersonWizardComponent, {
        set: { imports: [], template: '' },
      })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PersonWizardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('$space', { id: 'test-space' });
    fixture.componentRef.setInput('$contact', {
      id: '',
      space: { id: 'test-space' },
      dbo: { type: 'person' },
    });
    fixture.componentRef.setInput('$fields', {});
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = () => component as any;
  const setContact = (dbo: Record<string, unknown>) => {
    fixture.componentRef.setInput('$contact', {
      id: '',
      space: { id: 'test-space' },
      dbo,
    });
    fixture.detectChanges();
  };

  it('onGenderChanged emits the contact with the new gender', () => {
    const emit = vi.spyOn(component.contactChange, 'emit');
    c().onGenderChanged('male');
    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({ dbo: expect.objectContaining({ gender: 'male' }) }),
    );
  });

  it('onNameChanged sets the names and reveals the next button', () => {
    const emit = vi.spyOn(component.contactChange, 'emit');
    c().onNameChanged({ firstName: 'John' });
    expect(component.show.nameNext).toBe(true);
    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({
        dbo: expect.objectContaining({ names: { firstName: 'John' } }),
      }),
    );
  });

  it('onAgeGroupChanged converts a pet selection to an animal', () => {
    const emit = vi.spyOn(component.contactChange, 'emit');
    c().onAgeGroupChanged('pet');
    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({ dbo: expect.objectContaining({ type: 'animal' }) }),
    );
  });

  it('onContactTypeChanged adjusts the name fields for animals', () => {
    setContact({ type: 'animal' });
    c().onContactTypeChanged();
    expect(component.nameFields.nickName).toEqual({
      hide: false,
      required: true,
    });
    expect(component.nameFields.firstName).toEqual({ hide: true });
  });

  it('onEmailsChanged emits with the communicationChannels step', () => {
    const emit = vi.spyOn(component.contactChange, 'emit');
    c().onEmailsChanged([{ type: 'personal', address: 'a@b.com' }]);
    expect(emit).toHaveBeenCalled();
  });

  it('nextFromName throws without a names form component', () => {
    expect(() =>
      c().nextFromName({ stopPropagation: vi.fn() }),
    ).toThrow('!namesFormComponent');
  });

  it('onRelatedAsChanged throws without a user contact id', () => {
    expect(() =>
      c().onRelatedAsChanged({ parent: { created: {} } }),
    ).toThrow('!$userContactID()');
  });

  it('onPhoneChanged emits the contact with the channels step', () => {
    const emit = vi.spyOn(component.contactChange, 'emit');
    c().onPhoneChanged([{ type: 'mobile', number: '555' }]);
    expect(emit).toHaveBeenCalled();
  });

  it('onAgeGroupChanged keeps a person for an adult selection', () => {
    const emit = vi.spyOn(component.contactChange, 'emit');
    c().onAgeGroupChanged('adult');
    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({
        dbo: expect.objectContaining({ type: 'person', ageGroup: 'adult' }),
      }),
    );
  });

  it('nextFromName advances when the names form is valid', () => {
    const openNext = vi.spyOn(c(), 'openNext');
    c().namesFormComponent = {
      namesForm: { markAllAsTouched: vi.fn(), valid: true },
    };
    c().nextFromName({ stopPropagation: vi.fn() });
    expect(openNext).toHaveBeenCalledWith('name');
    expect(component.show.nameNext).toBe(false);
  });
});
