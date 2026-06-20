import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { of } from 'rxjs';
import { CalendarFilterService } from '../../../calendar-filter.service';
import { SCHEDULE_NAV_SERVICE } from '@sneat/extension-calendarius-contract';

import { CalendarDayComponent } from './calendar-day.component';

describe('ScheduleDayComponent', () => {
  let component: CalendarDayComponent;
  let fixture: ComponentFixture<CalendarDayComponent>;

  beforeEach(waitForAsync(async () => {
    await TestBed.configureTestingModule({
      imports: [CalendarDayComponent],
      providers: [
        { provide: CalendarFilterService, useValue: { filter: of({}) } },
        { provide: SCHEDULE_NAV_SERVICE, useValue: {} },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CalendarDayComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('$space', { id: 'test-space' });
    fixture.componentRef.setInput('$weekday', { id: 'test-wd' });
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
