import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StartEndDatesRangeFormComponent } from './start-end-dates-range-form.component';

describe('StartEndDatesRangeFormComponent', () => {
  let component: StartEndDatesRangeFormComponent;
  let fixture: ComponentFixture<StartEndDatesRangeFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StartEndDatesRangeFormComponent],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
      .overrideComponent(StartEndDatesRangeFormComponent, {
        set: { imports: [], schemas: [CUSTOM_ELEMENTS_SCHEMA], template: '' },
      })
      .compileComponents();
    fixture = TestBed.createComponent(StartEndDatesRangeFormComponent);
    component = fixture.componentInstance;

    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
