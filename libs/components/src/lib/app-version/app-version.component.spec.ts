import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppVersionComponent } from './app-version.component';

describe('AppVersionComponent', () => {
  let component: AppVersionComponent;
  let fixture: ComponentFixture<AppVersionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppVersionComponent],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
      .overrideComponent(AppVersionComponent, {
        set: { imports: [], schemas: [CUSTOM_ELEMENTS_SCHEMA] },
      })
      .compileComponents();
    fixture = TestBed.createComponent(AppVersionComponent);
    component = fixture.componentInstance;

    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
