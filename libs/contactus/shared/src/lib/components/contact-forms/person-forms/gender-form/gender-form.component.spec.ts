import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { CONTACT_SERVICE } from '@sneat/extension-contactus-contract';
import { CUSTOM_ELEMENTS_SCHEMA, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ErrorLogger } from '@sneat/core';

import { GenderFormComponent } from './gender-form.component';

describe('GenderFormComponent', () => {
  let component: GenderFormComponent;
  let fixture: ComponentFixture<MockComponent>;

  @Component({
    selector: 'sneat-mock-component',
    template:
      '<sneat-gender-form [$spaceID]="spaceID" [$contactID]="contactID" [$genderID]="genderID"/>',
    imports: [GenderFormComponent, FormsModule],
    standalone: true,
  })
  class MockComponent {
    spaceID = 'test-space';
    contactID = undefined;
    genderID = undefined;
  }

  beforeEach(waitForAsync(async () => {
    await TestBed.configureTestingModule({
      imports: [MockComponent, FormsModule],
      providers: [
        {
          provide: CONTACT_SERVICE,
          useValue: { updateContact: vi.fn() },
        },
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

  it('exposes the gender options', () => {
    expect(c().genderOptions.map((o: { id: string }) => o.id)).toEqual(
      expect.arrayContaining(['male', 'female', 'other', 'undisclosed']),
    );
  });

  it('onGenderIDChanged emits the gender directly when there is no contact id', () => {
    const emit = vi.spyOn(component.genderChange, 'emit');
    c().onGenderIDChanged('male');
    expect(emit).toHaveBeenCalledWith('male');
  });

  it('skip emits the undisclosed gender', () => {
    const emit = vi.spyOn(component.genderChange, 'emit');
    c().skip();
    expect(emit).toHaveBeenCalledWith('undisclosed');
  });

  it('treats a falsy gender as unknown', () => {
    const emit = vi.spyOn(component.genderChange, 'emit');
    c().onGenderIDChanged('');
    expect(emit).toHaveBeenCalledWith('unknown');
  });
});
