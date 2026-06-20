import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ErrorLogger } from '@sneat/core';

import { AddressFormComponent } from './address-form.component';

describe('AddressFormComponent', () => {
  let component: AddressFormComponent;
  let fixture: ComponentFixture<AddressFormComponent>;

  beforeEach(waitForAsync(async () => {
    await TestBed.configureTestingModule({
      imports: [AddressFormComponent],
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
    })
      .overrideComponent(AddressFormComponent, {
        set: { imports: [], template: '' },
      })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AddressFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = () => component as any;

  it('emits the form on init', () => {
    const emit = vi.spyOn(component.formCreated, 'emit');
    component.ngOnInit();
    expect(emit).toHaveBeenCalledWith(component.form);
  });

  describe('field change handlers emit addressChange', () => {
    it('onCountryChanged sets the country and emits', () => {
      const emit = vi.spyOn(component.addressChange, 'emit');
      c().onCountryChanged('GB');
      expect(c().countryID.value).toBe('GB');
      expect(emit).toHaveBeenCalledWith(
        expect.objectContaining({ countryID: 'GB' }),
      );
    });

    it('onCountryChanged clears zip/lines for the placeholder country', () => {
      c().zip.setValue('AB1');
      c().lines.setValue('1 St');
      c().onCountryChanged('--');
      expect(c().zip.value).toBe('');
      expect(c().lines.value).toBe('');
    });

    it('onZipChanged emits the updated zip code', () => {
      const emit = vi.spyOn(component.addressChange, 'emit');
      c().zip.setValue('AB1 2CD');
      c().onZipChanged();
      expect(emit).toHaveBeenCalledWith(
        expect.objectContaining({ zipCode: 'AB1 2CD' }),
      );
    });

    it('onStateChanged / onCityChanged / onLinesChanged emit', () => {
      const emit = vi.spyOn(component.addressChange, 'emit');
      c().state.setValue('CA');
      c().onStateChanged();
      c().city.setValue('LA');
      c().onCityChanged();
      c().lines.setValue('5th Ave');
      c().onLinesChanged();
      expect(emit).toHaveBeenCalledTimes(3);
    });
  });

  describe('ngOnChanges', () => {
    it('makes a required zip when requiredFields.zip is set', () => {
      component.requiredFields = { zip: true };
      component.ngOnChanges({ requiredFields: {} as never });
      c().zip.setValue('');
      expect(c().zip.valid).toBe(false);
    });

    it('populates controls from the address input', () => {
      component.address = { countryID: 'GB', zipCode: 'AB1', lines: '1 St' };
      component.ngOnChanges({ address: {} as never });
      expect(c().countryID.value).toBe('GB');
      expect(c().zip.value).toBe('AB1');
      expect(c().lines.value).toBe('1 St');
    });
  });

  describe('saveChanges', () => {
    it('emits a save event with the address when dirty', () => {
      const emit = vi.spyOn(component.save, 'emit');
      c().countryID.setValue('GB');
      component.form.markAsDirty();
      c().saveChanges();
      expect(emit).toHaveBeenCalledWith(
        expect.objectContaining({ object: expect.objectContaining({ countryID: 'GB' }) }),
      );
    });

    it('does not emit when the form is pristine', () => {
      const emit = vi.spyOn(component.save, 'emit');
      c().saveChanges();
      expect(emit).not.toHaveBeenCalled();
    });
  });

  it('cancelChanges restores controls to the current address', () => {
    component.address = { countryID: 'GB', zipCode: 'AB1' };
    c().countryID.setValue('US');
    c().cancelChanges();
    expect(c().countryID.value).toBe('GB');
    expect(c().countryID.pristine).toBe(true);
  });
});
