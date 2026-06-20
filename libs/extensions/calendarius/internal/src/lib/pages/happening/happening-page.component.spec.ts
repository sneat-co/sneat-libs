import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { HappeningPageComponent } from './happening-page.component';
import { provideCalendariusMocks } from '../../testing/test-utils';

describe('RegularHappeningPage', () => {
  let component: HappeningPageComponent;
  let fixture: ComponentFixture<HappeningPageComponent>;

  beforeEach(waitForAsync(async () => {
    await TestBed.configureTestingModule({
      imports: [HappeningPageComponent],
      providers: [provideRouter([]), ...provideCalendariusMocks()],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
      .overrideComponent(HappeningPageComponent, {
        set: { imports: [], schemas: [CUSTOM_ELEMENTS_SCHEMA] },
      })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(HappeningPageComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
