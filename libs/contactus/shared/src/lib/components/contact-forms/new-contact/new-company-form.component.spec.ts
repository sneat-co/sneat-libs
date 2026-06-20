import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { CONTACT_SERVICE } from '@sneat/extension-contactus-contract';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ErrorLogger } from '@sneat/core';
import { ClassName } from '@sneat/ui';
import { SpaceNavService } from '@sneat/space-services';

import { NewCompanyFormComponent } from './new-company-form.component';
import { of } from 'rxjs';

describe('NewCompanyFormComponent', () => {
  let component: NewCompanyFormComponent;
  let fixture: ComponentFixture<NewCompanyFormComponent>;

  beforeEach(waitForAsync(async () => {
    await TestBed.configureTestingModule({
      imports: [NewCompanyFormComponent],
      providers: [
        { provide: ClassName, useValue: 'NewCompanyFormComponent' },
        {
          provide: ErrorLogger,
          useValue: {
            logError: vi.fn(),
            logErrorHandler: vi.fn(() => vi.fn()),
          },
        },
        { provide: SpaceNavService, useValue: {} },
        { provide: CONTACT_SERVICE, useValue: { createContact: vi.fn() } },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
      .overrideComponent(NewCompanyFormComponent, {
        set: { imports: [], template: '' },
      })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NewCompanyFormComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('$space', { id: 'test-space' });
    fixture.componentRef.setInput('$contact', {
      id: '',
      space: { id: 'test-space' },
      dbo: { type: 'company' },
    });
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = () => component as any;
  const svc = () =>
    TestBed.inject(CONTACT_SERVICE) as unknown as {
      createContact: ReturnType<typeof vi.fn>;
    };

  it('onContactChanged stores the contact', () => {
    const contact = { id: '', brief: { type: 'company' } };
    c().onContactChanged(contact);
    expect(c().contact).toBe(contact);
  });

  it('ngOnChanges patches the role into the form', () => {
    component.contactRole = 'buyer';
    component.ngOnChanges({ contactRole: {} as never });
    expect(c().form.controls.role.value).toBe('buyer');
  });

  describe('create', () => {
    let alertSpy: ReturnType<typeof vi.fn>;
    beforeEach(() => {
      alertSpy = vi.fn();
      vi.stubGlobal('alert', alertSpy);
    });

    it('alerts when the title is missing', () => {
      c().contact = { id: '', dbo: {} };
      c().create();
      expect(alertSpy).toHaveBeenCalledWith('Contact title is a required field');
    });

    it('alerts when the role is missing', () => {
      c().contact = { id: '', dbo: { title: 'Acme' } };
      component.contactRole = undefined;
      c().create();
      expect(alertSpy).toHaveBeenCalledWith('Contact role is a required field');
    });

    it('creates the contact when title and role are set', () => {
      svc().createContact.mockReturnValue(of({ id: 'c1' }));
      c().contact = {
        id: '',
        dbo: {
          title: 'Acme',
          address: { countryID: 'GB', city: 'London', lines: '1 St' },
        },
      };
      component.contactRole = 'buyer';
      const emit = vi.spyOn(component.contactCreated, 'emit');
      c().create();
      expect(svc().createContact).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'test-space' }),
        expect.objectContaining({ type: 'company' }),
      );
      expect(emit).toHaveBeenCalledWith({ id: 'c1' });
    });
  });
});
