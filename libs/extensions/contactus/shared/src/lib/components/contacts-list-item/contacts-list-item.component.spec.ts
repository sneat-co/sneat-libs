import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CONTACT_SERVICE } from '@sneat/extension-contactus-contract';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { ErrorLogger } from '@sneat/core';

import { ContactsListItemComponent } from './contacts-list-item.component';
import { SpaceNavService } from '@sneat/space-services';
import { of } from 'rxjs';

describe('ContactListItemComponent', () => {
  let component: ContactsListItemComponent;
  let fixture: ComponentFixture<MockComponent>;

  @Component({
    selector: 'sneat-mock-component',
    template:
      '<sneat-contacts-list-item [$contact]="contact" [$space]="space"/>',
    imports: [ContactsListItemComponent],
    standalone: true,
  })
  class MockComponent {
    contact = { id: 'test-contact', brief: {} };
    space = { id: 'test-space' };
  }

  beforeEach(waitForAsync(async () => {
    await TestBed.configureTestingModule({
      imports: [MockComponent],
      providers: [
        {
          provide: SpaceNavService,
          useValue: {
            navigateForwardToSpacePage: vi.fn(() => Promise.resolve(true)),
          },
        },
        { provide: CONTACT_SERVICE, useValue: { setContactsStatus: vi.fn() } },
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = () => component as any;
  const stop = () =>
    ({
      stopPropagation: vi.fn(),
      preventDefault: vi.fn(),
      detail: { checked: true },
    }) as unknown as CustomEvent;

  it('hideRole hides configured and excluded roles', () => {
    expect(component.hideRole('owner')).toBe(true);
    component.excludeRole = 'buyer' as never;
    expect(component.hideRole('buyer')).toBe(true);
    expect(component.hideRole('tenant')).toBe(false);
  });

  it('checkboxChanged emits the checked args', () => {
    const emit = vi.spyOn(component.checkChange, 'emit');
    c().checkboxChanged(stop());
    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'test-contact', checked: true }),
    );
  });

  it('contactClicked navigates to the contact page', () => {
    component.contactClicked(stop(), { id: 'c1' } as never);
    expect(
      (TestBed.inject(SpaceNavService) as unknown as {
        navigateForwardToSpacePage: ReturnType<typeof vi.fn>;
      }).navigateForwardToSpacePage,
    ).toHaveBeenCalledWith(
      expect.anything(),
      'contact/c1',
      expect.anything(),
    );
  });

  it('archiveContact sets the contact status to archived', () => {
    const svc = TestBed.inject(CONTACT_SERVICE) as unknown as {
      setContactsStatus: ReturnType<typeof vi.fn>;
    };
    svc.setContactsStatus.mockReturnValue(of(undefined));
    component.archiveContact();
    expect(svc.setContactsStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'archived',
        spaceID: 'test-space',
        contactIDs: ['test-contact'],
      }),
    );
  });
});
