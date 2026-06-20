import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { ContactPageComponent } from './contact-page.component';
import { provideContactusMocks } from '../../testing/test-utils';
import {
  ContactService,
  ContactusSpaceService,
} from '../../services';
import { SneatNavService } from '@sneat/core';
import { of, throwError } from 'rxjs';

interface ITestable {
  saveAddress(e: unknown): void;
  deleteContact(): void;
  watchItemChanges(): { subscribe(o: unknown): void };
  onSpaceIdChanged(): void;
  $item: { set(v: unknown): void; (): { brief?: unknown } };
  $spaceRef: { set(v: unknown): void };
}

describe('CommuneContactPage', () => {
  let component: ContactPageComponent;
  let testable: ITestable;
  let fixture: ComponentFixture<ContactPageComponent>;
  let contactService: {
    updateContact: ReturnType<typeof vi.fn>;
    deleteContact: ReturnType<typeof vi.fn>;
    watchContactById: ReturnType<typeof vi.fn>;
    watchChildContacts: ReturnType<typeof vi.fn>;
  };
  let navService: { goBack: ReturnType<typeof vi.fn> };

  const setSpace = (id: string) => testable.$spaceRef.set({ id });
  const setContact = (v: unknown) => testable.$item.set(v);

  beforeEach(waitForAsync(async () => {
    contactService = {
      updateContact: vi.fn(() => of(undefined)),
      deleteContact: vi.fn(() => of(undefined)),
      watchContactById: vi.fn(() => of({})),
      watchChildContacts: vi.fn(() => of([])),
    };
    navService = { goBack: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [ContactPageComponent],
      providers: [
        provideContactusMocks(),
        { provide: ContactService, useValue: contactService },
        { provide: SneatNavService, useValue: navService },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
      .overrideComponent(ContactPageComponent, {
        set: {
          imports: [],
          template: '',
          providers: [
            { provide: ContactService, useValue: contactService },
            { provide: SneatNavService, useValue: navService },
          ],
        },
      })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ContactPageComponent);
    component = fixture.componentInstance;
    testable = component as unknown as ITestable;
    setSpace('space1');
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('saveAddress', () => {
    it('reports an error when contact id is missing', () => {
      const save = {
        object: { countryID: 'GB' },
        error: vi.fn(),
        success: vi.fn(),
      };
      testable.saveAddress(save);
      expect(save.error).toHaveBeenCalled();
      expect(contactService.updateContact).not.toHaveBeenCalled();
    });

    it('calls updateContact and reports success', () => {
      setContact({ id: 'c1', space: { id: 'space1' } });
      const save = {
        object: { countryID: 'GB' },
        error: vi.fn(),
        success: vi.fn(),
      };
      testable.saveAddress(save);
      expect(contactService.updateContact).toHaveBeenCalledWith(
        expect.objectContaining({ spaceID: 'space1', contactID: 'c1' }),
      );
      expect(save.success).toHaveBeenCalled();
    });
  });

  describe('deleteContact', () => {
    beforeEach(() =>
      setContact({ id: 'c1', brief: { title: 'Bob' }, space: { id: 'space1' } }),
    );

    it('aborts when the confirm dialog is declined', () => {
      vi.stubGlobal('confirm', vi.fn(() => false));
      testable.deleteContact();
      expect(contactService.deleteContact).not.toHaveBeenCalled();
    });

    it('deletes and navigates back when confirmed', () => {
      vi.stubGlobal('confirm', vi.fn(() => true));
      testable.deleteContact();
      expect(contactService.deleteContact).toHaveBeenCalledWith(
        expect.objectContaining({ spaceID: 'space1', contactID: 'c1' }),
      );
      expect(navService.goBack).toHaveBeenCalledWith('/space/space1/contacts');
    });

    it('logs an error when delete fails', () => {
      contactService.deleteContact.mockReturnValue(
        throwError(() => new Error('boom')),
      );
      vi.stubGlobal('confirm', vi.fn(() => true));
      testable.deleteContact();
      expect(navService.goBack).not.toHaveBeenCalled();
    });
  });

  describe('watchItemChanges (ContactBasePage)', () => {
    it('errors when there is no contact id', () => {
      setContact({ id: '', space: { id: 'space1' } });
      const onErr = vi.fn();
      testable.watchItemChanges().subscribe({ next: vi.fn(), error: onErr });
      expect(onErr).toHaveBeenCalled();
      expect(contactService.watchContactById).not.toHaveBeenCalled();
    });

    it('watches the contact by id when present', () => {
      setContact({ id: 'c1', space: { id: 'space1' } });
      testable.watchItemChanges().subscribe({ next: vi.fn(), error: vi.fn() });
      expect(contactService.watchContactById).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'space1' }),
        'c1',
      );
    });
  });

  describe('onSpaceIdChanged → watchSpaceContactusEntry', () => {
    it('fills the contact brief from the space briefs when missing a dbo', () => {
      const brief = { type: 'person', names: { full: 'Bob' } };
      const contactusSpace = TestBed.inject(
        ContactusSpaceService,
      ) as unknown as { watchContactBriefs: ReturnType<typeof vi.fn> };
      contactusSpace.watchContactBriefs.mockReturnValue(
        of([{ id: 'c1', brief }]),
      );
      setContact({ id: 'c1', space: { id: 'space1' } });
      testable.onSpaceIdChanged();
      expect(testable.$item().brief).toEqual(brief);
    });
  });
});
