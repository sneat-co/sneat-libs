import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { CONTACT_SERVICE } from '@sneat/extension-contactus-contract';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ErrorLogger } from '@sneat/core';

import { BasicContactFormComponent } from './basic-contact-form.component';
import { of } from 'rxjs';

describe('BasicContactFormComponent', () => {
  let component: BasicContactFormComponent;
  let fixture: ComponentFixture<BasicContactFormComponent>;

  beforeEach(waitForAsync(async () => {
    await TestBed.configureTestingModule({
      imports: [BasicContactFormComponent],
      providers: [
        {
          provide: ErrorLogger,
          useValue: {
            logError: vi.fn(),
            logErrorHandler: vi.fn(() => vi.fn()),
          },
        },
        { provide: CONTACT_SERVICE, useValue: { createContact: vi.fn() } },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
      .overrideComponent(BasicContactFormComponent, {
        set: { imports: [], template: '' },
      })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BasicContactFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = () => component as any;
  const stop = () => ({ stopPropagation: vi.fn() }) as unknown as Event;
  const svc = () =>
    TestBed.inject(CONTACT_SERVICE) as unknown as {
      createContact: ReturnType<typeof vi.fn>;
    };

  it('does nothing without a space', () => {
    component.contactType = 'company';
    c().createContact(stop());
    expect(svc().createContact).not.toHaveBeenCalled();
  });

  it('does nothing without a contact type', () => {
    component.space = { id: 's1' };
    c().createContact(stop());
    expect(svc().createContact).not.toHaveBeenCalled();
  });

  it('creates the contact and emits when valid', () => {
    svc().createContact.mockReturnValue(of({ id: 'c1' }));
    component.space = { id: 's1' };
    component.contactType = 'company';
    component.title = 'Acme';
    const emit = vi.spyOn(component.contactCreated, 'emit');
    c().createContact(stop());
    expect(svc().createContact).toHaveBeenCalledWith(
      { id: 's1' },
      expect.objectContaining({
        spaceID: 's1',
        type: 'company',
        basic: { title: 'Acme' },
      }),
    );
    expect(emit).toHaveBeenCalledWith({ id: 'c1' });
    expect(component.isCreated).toBe(true);
  });
});
