import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ErrorLogger } from '@sneat/core';
import { ClassName } from '@sneat/ui';
import { SpaceNavService } from '@sneat/space-services';

import { NewContactFormComponent } from './new-contact-form.component';

describe('NewContactFormComponent', () => {
  let component: NewContactFormComponent;
  let fixture: ComponentFixture<NewContactFormComponent>;

  beforeEach(waitForAsync(async () => {
    await TestBed.configureTestingModule({
      imports: [NewContactFormComponent],
      providers: [
        { provide: ClassName, useValue: 'NewContactFormComponent' },
        {
          provide: ErrorLogger,
          useValue: {
            logError: vi.fn(),
            logErrorHandler: vi.fn(() => vi.fn()),
          },
        },
        { provide: SpaceNavService, useValue: {} },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
      .overrideComponent(NewContactFormComponent, {
        set: { imports: [], template: '' },
      })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NewContactFormComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('$space', { id: 'test-space' });
    fixture.componentRef.setInput('$contact', {
      id: '',
      space: { id: 'test-space' },
      dbo: { type: 'person' },
    });
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = () => component as any;

  it('onContactChanged re-emits the contact', () => {
    const emit = vi.spyOn(component.contactChange, 'emit');
    const contact = { space: { id: 'test-space' }, dbo: { type: 'person' } };
    c().onContactChanged(contact);
    expect(emit).toHaveBeenCalledWith(contact);
  });

  it('onTabChange sets the tab signal', () => {
    c().onTabChange({ detail: { value: 'company' } });
    expect(c().$tab()).toBe('company');
  });

  it('onTabChange to pet seeds an animal contact and emits it', () => {
    const emit = vi.spyOn(component.contactChange, 'emit');
    c().onTabChange({ detail: { value: 'pet' } });
    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({
        dbo: expect.objectContaining({ type: 'animal' }),
      }),
    );
    expect(c().$tab()).toBe('pet');
  });
});
