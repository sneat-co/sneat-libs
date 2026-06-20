import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { CONTACT_SERVICE } from '@sneat/extension-contactus-contract';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ErrorLogger } from '@sneat/core';
import { ClassName } from '@sneat/ui';

import { ContactDobComponent } from './contact-dob.component';
import { of } from 'rxjs';

describe('ContactDobComponent', () => {
  let component: ContactDobComponent;
  let fixture: ComponentFixture<ContactDobComponent>;

  beforeEach(waitForAsync(async () => {
    await TestBed.configureTestingModule({
      imports: [ContactDobComponent],
      providers: [
        { provide: ClassName, useValue: 'ContactDobComponent' },
        {
          provide: ErrorLogger,
          useValue: {
            logError: vi.fn(),
            logErrorHandler: vi.fn(() => vi.fn()),
          },
        },
        { provide: CONTACT_SERVICE, useValue: { updateContact: vi.fn() } },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
      .overrideComponent(ContactDobComponent, {
        set: { imports: [], template: '' },
      })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ContactDobComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('$contact', {
      id: 'test',
      space: { id: 'test-space' },
    });
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = () => component as any;

  it('$dob reflects the contact dbo date of birth', () => {
    fixture.componentRef.setInput('$contact', {
      id: 'c1',
      space: { id: 'space1' },
      dbo: { dob: '2000-01-02' },
    });
    fixture.detectChanges();
    expect(c().$dob()).toBe('2000-01-02');
  });

  describe('onDobChanged', () => {
    it('is a no-op without a contact', () => {
      fixture.componentRef.setInput('$contact', undefined);
      fixture.detectChanges();
      const updateContact = TestBed.inject(CONTACT_SERVICE)
        .updateContact as ReturnType<typeof vi.fn>;
      c().onDobChanged('2000-01-02');
      expect(updateContact).not.toHaveBeenCalled();
    });

    it('updates the contact with the new date of birth', () => {
      const updateContact = TestBed.inject(CONTACT_SERVICE)
        .updateContact as ReturnType<typeof vi.fn>;
      updateContact.mockReturnValue(of(undefined));
      fixture.componentRef.setInput('$contact', {
        id: 'c1',
        space: { id: 'space1' },
        dbo: {},
      });
      fixture.detectChanges();
      c().onDobChanged('2000-01-02');
      expect(updateContact).toHaveBeenCalledWith(
        expect.objectContaining({
          spaceID: 'space1',
          contactID: 'c1',
          dateOfBirth: '2000-01-02',
        }),
      );
    });
  });
});
