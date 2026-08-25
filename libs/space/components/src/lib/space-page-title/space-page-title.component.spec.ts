import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SpacePageTitleComponent } from './space-page-title.component';

describe('SpacePageTitleComponent', () => {
  let component: SpacePageTitleComponent;
  let fixture: ComponentFixture<SpacePageTitleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SpacePageTitleComponent],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
      .overrideComponent(SpacePageTitleComponent, {
        set: { imports: [], schemas: [CUSTOM_ELEMENTS_SCHEMA] },
      })
      .compileComponents();
    fixture = TestBed.createComponent(SpacePageTitleComponent);
    component = fixture.componentInstance;

    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
