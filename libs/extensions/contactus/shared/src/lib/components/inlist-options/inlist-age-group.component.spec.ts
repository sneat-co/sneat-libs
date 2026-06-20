import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { CONTACT_SERVICE } from '@sneat/extension-contactus-contract';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ErrorLogger } from '@sneat/core';
import { ClassName } from '@sneat/ui';
import { SpaceNavService } from '@sneat/space-services';
import { of } from 'rxjs';

import { InlistAgeGroupComponent } from './inlist-age-group.component';

describe('InlistAgeGroupComponent', () => {
  let component: InlistAgeGroupComponent;
  let fixture: ComponentFixture<InlistAgeGroupComponent>;

  beforeEach(waitForAsync(async () => {
    await TestBed.configureTestingModule({
      imports: [InlistAgeGroupComponent],
      providers: [
        { provide: ClassName, useValue: 'InlistAgeGroupComponent' },
        {
          provide: ErrorLogger,
          useValue: {
            logError: vi.fn(),
            logErrorHandler: vi.fn(() => vi.fn()),
          },
        },
        { provide: SpaceNavService, useValue: {} },
        { provide: CONTACT_SERVICE, useValue: { updateContact: vi.fn() } },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
      .overrideComponent(InlistAgeGroupComponent, {
        set: { imports: [], template: '' },
      })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(InlistAgeGroupComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('$space', { id: 'test-space' });
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = () => component as any;
  const optionEvent = (id: string) => ({
    uiEvent: { preventDefault: vi.fn(), stopPropagation: vi.fn() },
    option: { id, title: id },
  });

  it('onAgeGroupSelected updates the contact age group', () => {
    const svc = TestBed.inject(CONTACT_SERVICE) as unknown as {
      updateContact: ReturnType<typeof vi.fn>;
    };
    svc.updateContact.mockReturnValue(of(undefined));
    component.contactID = 'c1';
    c().onAgeGroupSelected(optionEvent('adult'));
    expect(svc.updateContact).toHaveBeenCalledWith(
      expect.objectContaining({
        spaceID: 'test-space',
        contactID: 'c1',
        ageGroup: 'adult',
      }),
    );
    expect(c().selectedOption).toEqual({ id: 'adult', title: 'adult' });
  });
});
