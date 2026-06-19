import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA, Component } from '@angular/core';
import { ReactiveFormsModule, FormsModule, FormGroup } from '@angular/forms';
import { ErrorLogger } from '@sneat/core';

import { NamesFormComponent } from './names-form.component';

describe('NamesFormComponent', () => {
  let component: NamesFormComponent;
  let fixture: ComponentFixture<MockComponent>;

  @Component({
    selector: 'sneat-mock-component',
    template: '<sneat-names-form/>',
    imports: [NamesFormComponent, ReactiveFormsModule, FormsModule],
    standalone: true,
  })
  class MockComponent {}

  beforeEach(waitForAsync(async () => {
    await TestBed.configureTestingModule({
      imports: [MockComponent, ReactiveFormsModule, FormsModule],
      providers: [
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

  describe('generateFullName', () => {
    it('should generate full name from first and last name', () => {
      component.firstName.setValue('John');
      component.lastName.setValue('Doe');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fullName = (component as any).generateFullName();
      expect(fullName).toBe('John Doe');
    });

    it('should generate full name from first, middle and last name', () => {
      component.firstName.setValue('John');
      component.middleName.setValue('Michael');
      component.lastName.setValue('Doe');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fullName = (component as any).generateFullName();
      expect(fullName).toBe('John Michael Doe');
    });

    it('should generate full name from first and middle name', () => {
      component.firstName.setValue('John');
      component.middleName.setValue('Michael');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fullName = (component as any).generateFullName();
      expect(fullName).toBe('John Michael');
    });

    it('should generate full name from middle and last name', () => {
      component.middleName.setValue('Michael');
      component.lastName.setValue('Doe');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fullName = (component as any).generateFullName();
      expect(fullName).toBe('Michael Doe');
    });

    it('should return empty string if only one name part is provided', () => {
      component.firstName.setValue('John');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fullName = (component as any).generateFullName();
      expect(fullName).toBe('');
    });

    it('should handle extra whitespace', () => {
      component.firstName.setValue('  John  ');
      component.lastName.setValue('  Doe  ');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fullName = (component as any).generateFullName();
      expect(fullName).toBe('John Doe');
    });

    it('should return empty string when all fields are empty', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fullName = (component as any).generateFullName();
      expect(fullName).toBe('');
    });
  });

  describe('names', () => {
    it('should return names object with all fields', () => {
      component.firstName.setValue('John');
      component.lastName.setValue('Doe');
      component.middleName.setValue('Michael');
      component.fullName.setValue('John Michael Doe');

      const names = component.names();
      
      expect(names.firstName).toBe('John');
      expect(names.lastName).toBe('Doe');
      expect(names.fullName).toBe('John Michael Doe');
    });

    it('should exclude empty fields', () => {
      component.firstName.setValue('John');
      component.lastName.setValue('');

      const names = component.names();
      
      expect(names.firstName).toBe('John');
      expect(names.lastName).toBeUndefined();
    });
  });

  describe('isNamesFormValid', () => {
    it('should return null when form is valid with firstName and lastName', () => {
      const formGroup = new FormGroup({
        firstName: component.firstName,
        lastName: component.lastName,
        fullName: component.fullName,
        nickName: component.nickName,
      });

      component.firstName.setValue('John');
      component.lastName.setValue('Doe');
      component.fullName.setValue('John Doe');

      const result = component.isNamesFormValid(formGroup);
      expect(result).toBeNull();
    });

    it('should return null when only fullName is provided', () => {
      const formGroup = new FormGroup({
        firstName: component.firstName,
        lastName: component.lastName,
        fullName: component.fullName,
        nickName: component.nickName,
      });

      component.fullName.setValue('John Doe');

      const result = component.isNamesFormValid(formGroup);
      expect(result).toBeNull();
    });

    it('should return null when only nickName is provided', () => {
      const formGroup = new FormGroup({
        firstName: component.firstName,
        lastName: component.lastName,
        fullName: component.fullName,
        nickName: component.nickName,
      });

      component.nickName.setValue('Johnny');

      const result = component.isNamesFormValid(formGroup);
      expect(result).toBeNull();
    });

    it('should return error when all fields are empty', () => {
      const formGroup = new FormGroup({
        firstName: component.firstName,
        lastName: component.lastName,
        fullName: component.fullName,
        nickName: component.nickName,
      });

      const result = component.isNamesFormValid(formGroup);
      expect(result).toBeTruthy();
      expect(result?.['fullName']).toContain('at least one of the following must be provided');
    });

    it('should return error when firstName and lastName are provided but fullName is missing', () => {
      const formGroup = new FormGroup({
        firstName: component.firstName,
        lastName: component.lastName,
        fullName: component.fullName,
        nickName: component.nickName,
      });

      component.firstName.setValue('John');
      component.lastName.setValue('Doe');

      const result = component.isNamesFormValid(formGroup);
      expect(result).toBeTruthy();
      expect(result?.['fullName']).toContain('full name should be supplied as well');
    });

    it('should handle whitespace in field values', () => {
      const formGroup = new FormGroup({
        firstName: component.firstName,
        lastName: component.lastName,
        fullName: component.fullName,
        nickName: component.nickName,
      });

      component.firstName.setValue('  ');
      component.lastName.setValue('  ');
      component.fullName.setValue('  ');
      component.nickName.setValue('  ');

      const result = component.isNamesFormValid(formGroup);
      expect(result).toBeTruthy();
      expect(result?.['fullName']).toContain('at least one of the following must be provided');
    });
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = () => component as any;

  describe('ngOnChanges', () => {
    it('populates form controls from the name input', () => {
      component.name = {
        firstName: 'John',
        lastName: 'Doe',
        middleName: 'M',
        nickName: 'JD',
        fullName: 'John M Doe',
      };
      component.ngOnChanges({ name: {} as never });
      expect(component.firstName.value).toBe('John');
      expect(component.lastName.value).toBe('Doe');
      expect(component.nickName.value).toBe('JD');
      expect(component.fullName.value).toBe('John M Doe');
    });

    it('disables and re-enables the form via the disabled input', () => {
      component.disabled = true;
      component.ngOnChanges({ disabled: {} as never });
      expect(component.namesForm.disabled).toBe(true);
      component.disabled = false;
      component.ngOnChanges({ disabled: {} as never });
      expect(component.namesForm.enabled).toBe(true);
    });

    it('adds a required validator when a field is marked required', () => {
      component.fields = { firstName: { required: true } };
      component.ngOnChanges({ fields: {} as never });
      component.firstName.setValue('');
      expect(component.firstName.valid).toBe(false);
      component.firstName.setValue('John');
      expect(component.firstName.valid).toBe(true);
    });
  });

  describe('onNameChanged / setName', () => {
    it('regenerates the full name and emits the names', () => {
      const emit = vi.spyOn(component.namesChanged, 'emit');
      component.firstName.setValue('John');
      component.lastName.setValue('Doe');
      c().onNameChanged();
      expect(component.fullName.value).toBe('John Doe');
      expect(emit).toHaveBeenCalledWith(
        expect.objectContaining({ firstName: 'John', lastName: 'Doe' }),
      );
    });
  });

  describe('onFullNameChanged', () => {
    it('marks the full name as manually changed when it diverges', () => {
      component.firstName.setValue('John');
      component.lastName.setValue('Doe');
      component.fullName.setValue('Custom Name');
      c().onFullNameChanged();
      // Once flagged, a subsequent onNameChanged must not overwrite fullName.
      c().onNameChanged();
      expect(component.fullName.value).toBe('Custom Name');
    });
  });

  describe('navigation outputs', () => {
    it('nameKeyupEnter emits keyupEnter for a valid form', () => {
      const emit = vi.spyOn(component.keyupEnter, 'emit');
      component.fullName.setValue('John Doe');
      const event = new Event('keyup');
      c().nameKeyupEnter(event);
      expect(emit).toHaveBeenCalledWith(event);
    });

    it('onNext emits next', () => {
      const emit = vi.spyOn(component.next, 'emit');
      const event = new Event('click');
      c().onNext(event);
      expect(emit).toHaveBeenCalledWith(event);
    });

    it('canGoNext reflects whether a name is set', () => {
      component.name = {};
      expect(c().canGoNext).toBe(false);
      component.name = { firstName: 'John' };
      expect(c().canGoNext).toBe(true);
    });
  });
});
