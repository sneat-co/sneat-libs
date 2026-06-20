import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { CONTACT_SERVICE } from '@sneat/extension-contactus-contract';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ErrorLogger } from '@sneat/core';

import { LocationFormComponent } from './location-form.component';
import { of } from 'rxjs';

describe('LocationFormComponent', () => {
  let component: LocationFormComponent;
  let fixture: ComponentFixture<LocationFormComponent>;
  let contactService: { createContact: ReturnType<typeof vi.fn> };

  beforeEach(waitForAsync(async () => {
    contactService = { createContact: vi.fn(() => of({ id: 'c1' })) };
    await TestBed.configureTestingModule({
      imports: [LocationFormComponent],
      providers: [
        {
          provide: ErrorLogger,
          useValue: {
            logError: vi.fn(),
            logErrorHandler: vi.fn(() => vi.fn()),
          },
        },
        { provide: CONTACT_SERVICE, useValue: contactService },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
      .overrideComponent(LocationFormComponent, {
        set: { imports: [], template: '' },
      })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(LocationFormComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('$space', { id: 'test-space' });
    fixture.detectChanges();
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = () => component as any;

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('onTitleChanged creates a location and emits the change', () => {
    const emit = vi.spyOn(component.locationChange, 'emit');
    c().title.setValue('Home');
    c().onTitleChanged();
    expect(component.location?.dbo?.title).toBe('Home');
    expect(emit).toHaveBeenCalled();
  });

  it('onAddressChanged updates the location address when a location exists', () => {
    component.location = { id: '', brief: { type: 'location' } };
    const emit = vi.spyOn(component.locationChange, 'emit');
    const address = { countryID: 'GB', city: 'London', lines: '1 St' };
    c().onAddressChanged(address);
    expect(component.location?.dbo?.address).toEqual(address);
    expect(emit).toHaveBeenCalled();
  });

  it('onAddressChanged is a no-op without a location', () => {
    const emit = vi.spyOn(component.locationChange, 'emit');
    c().onAddressChanged({ countryID: 'GB' });
    expect(emit).not.toHaveBeenCalled();
  });

  describe('submit validation', () => {
    let alertSpy: ReturnType<typeof vi.fn>;
    beforeEach(() => {
      alertSpy = vi.fn();
      vi.stubGlobal('alert', alertSpy);
    });

    it('alerts when there is no contact dbo', () => {
      component.location = undefined;
      component.submit();
      expect(alertSpy).toHaveBeenCalledWith('contact brief is not defined');
      expect(contactService.createContact).not.toHaveBeenCalled();
    });

    it('alerts when the title is missing', () => {
      component.location = { id: '', dbo: { type: 'location' } } as never;
      component.submit();
      expect(alertSpy).toHaveBeenCalledWith('title is required');
    });

    it('alerts when the address is missing', () => {
      component.location = {
        id: '',
        dbo: { type: 'location', title: 'Home' },
      } as never;
      component.submit();
      expect(alertSpy).toHaveBeenCalledWith('address is required');
    });

    it('creates the contact when fully valid', () => {
      component.location = {
        id: '',
        dbo: {
          type: 'location',
          title: 'Home',
          address: { countryID: 'GB', city: 'London', lines: '1 St' },
        },
      } as never;
      component.submit();
      expect(contactService.createContact).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'test-space' }),
        expect.objectContaining({ type: 'location' }),
      );
    });
  });

  it('ngOnChanges seeds a location brief for a new contact type', () => {
    component.contactType = 'location';
    component.ngOnChanges({ contactType: {} as never });
    expect(component.location?.brief?.type).toBe('location');
  });

  it('submit emits locationCreated on a successful create', () => {
    vi.stubGlobal('alert', vi.fn());
    contactService.createContact.mockReturnValue(of({ id: 'loc1' }));
    component.location = {
      id: '',
      dbo: {
        type: 'location',
        title: 'Home',
        address: { countryID: 'GB', city: 'London', lines: '1 St' },
      },
    } as never;
    const emit = vi.spyOn(component.locationCreated, 'emit');
    component.submit();
    expect(emit).toHaveBeenCalledWith({ id: 'loc1' });
  });

  it('disabled reflects the creating state', () => {
    expect(component.disabled).toBe(false);
    component.isCreating = true;
    expect(component.disabled).toBe(true);
  });
});
