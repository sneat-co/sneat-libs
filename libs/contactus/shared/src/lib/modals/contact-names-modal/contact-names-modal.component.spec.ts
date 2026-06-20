import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { CONTACT_SERVICE } from '@sneat/extension-contactus-contract';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ErrorLogger } from '@sneat/core';
import { ClassName } from '@sneat/ui';
import { ModalController } from '@ionic/angular/standalone';
import { of } from 'rxjs';

import { ContactNamesModalComponent } from './contact-names-modal.component';

// Mock browser global 'personalbar' which does not exist in happy-dom
(globalThis as Record<string, unknown>)['personalbar'] = {};

describe('ContactNamesModalComponent', () => {
  let component: ContactNamesModalComponent;
  let fixture: ComponentFixture<ContactNamesModalComponent>;

  beforeEach(waitForAsync(async () => {
    await TestBed.configureTestingModule({
      imports: [ContactNamesModalComponent],
      providers: [
        { provide: ClassName, useValue: 'ContactNamesModalComponent' },
        {
          provide: ErrorLogger,
          useValue: {
            logError: vi.fn(),
            logErrorHandler: vi.fn(() => vi.fn()),
          },
        },
        {
          provide: ModalController,
          useValue: {
            dismiss: vi.fn(() => Promise.resolve(true)),
            create: vi.fn(() =>
              Promise.resolve({
                present: vi.fn(() => Promise.resolve()),
                onDidDismiss: vi.fn(() => Promise.resolve({ data: undefined })),
              }),
            ),
          },
        },
        { provide: CONTACT_SERVICE, useValue: { updateContact: vi.fn() } },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
      .overrideComponent(ContactNamesModalComponent, {
        set: { imports: [], template: '' },
      })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ContactNamesModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = () => component as any;
  const svc = () =>
    TestBed.inject(CONTACT_SERVICE) as unknown as {
      updateContact: ReturnType<typeof vi.fn>;
    };

  it('onNamesChanged stores the names', () => {
    c().onNamesChanged({ firstName: 'John' });
    expect(component.names).toEqual({ firstName: 'John' });
  });

  describe('saveChanges', () => {
    it('aborts without a contact id', () => {
      component.contactID = undefined;
      component.spaceID = 's1';
      c().saveChanges();
      expect(svc().updateContact).not.toHaveBeenCalled();
    });

    it('aborts without a space id', () => {
      component.contactID = 'c1';
      component.spaceID = undefined;
      c().saveChanges();
      expect(svc().updateContact).not.toHaveBeenCalled();
    });

    it('updates the contact names when valid', () => {
      svc().updateContact.mockReturnValue(of(undefined));
      component.contactID = 'c1';
      component.spaceID = 's1';
      component.names = { firstName: 'John' };
      c().saveChanges();
      expect(svc().updateContact).toHaveBeenCalledWith(
        expect.objectContaining({
          contactID: 'c1',
          spaceID: 's1',
          names: { firstName: 'John' },
        }),
      );
    });
  });
});
