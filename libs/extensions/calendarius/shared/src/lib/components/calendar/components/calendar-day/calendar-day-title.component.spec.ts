import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CalendarDayTitleComponent } from './calendar-day-title.component';

describe('CalendarDayTitleComponent', () => {
  let component: CalendarDayTitleComponent;
  let fixture: ComponentFixture<CalendarDayTitleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CalendarDayTitleComponent],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
      .overrideComponent(CalendarDayTitleComponent, {
        set: { imports: [], schemas: [CUSTOM_ELEMENTS_SCHEMA], template: '' },
      })
      .compileComponents();
    fixture = TestBed.createComponent(CalendarDayTitleComponent);
    component = fixture.componentInstance;

    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
