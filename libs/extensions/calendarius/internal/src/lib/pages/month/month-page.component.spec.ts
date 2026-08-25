import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { MonthPageComponent } from './month-page.component';
import { provideCalendariusMocks } from '../../testing/test-utils';

describe('MonthPage', () => {
  let component: MonthPageComponent;
  let fixture: ComponentFixture<MonthPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MonthPageComponent],
      providers: [provideRouter([]), ...provideCalendariusMocks()],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MonthPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
