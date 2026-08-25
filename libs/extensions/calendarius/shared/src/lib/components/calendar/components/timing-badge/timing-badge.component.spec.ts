import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TimingBadgeComponent } from './timing-badge.component';

describe('TimingBadgeComponent', () => {
  let component: TimingBadgeComponent;
  let fixture: ComponentFixture<TimingBadgeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TimingBadgeComponent],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
      .overrideComponent(TimingBadgeComponent, {
        set: { imports: [], schemas: [CUSTOM_ELEMENTS_SCHEMA], template: '' },
      })
      .compileComponents();
    fixture = TestBed.createComponent(TimingBadgeComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('$isCanceled', false);
    fixture.componentRef.setInput('$timing', { start: { time: '09:00' } });
    fixture.componentRef.setInput('$adjustment', undefined);

    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
