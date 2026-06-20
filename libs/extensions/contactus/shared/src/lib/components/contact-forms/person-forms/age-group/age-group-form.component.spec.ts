import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { AgeGroupFormComponent } from './age-group-form.component';

describe('AgeGroupFormComponent', () => {
  let component: AgeGroupFormComponent;
  let fixture: ComponentFixture<AgeGroupFormComponent>;

  beforeEach(waitForAsync(async () => {
    await TestBed.configureTestingModule({
      imports: [AgeGroupFormComponent, NoopAnimationsModule],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
      .overrideComponent(AgeGroupFormComponent, {
        set: { imports: [], template: '' },
      })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AgeGroupFormComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('$ageGroup', undefined);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = () => component as any;

  it('shows the pet option and pet-aware label by default', () => {
    fixture.componentRef.setInput('hidePetOption', false);
    fixture.detectChanges();
    expect(c().$ageGroupLabel()).toBe('Adult/child or pet?');
    expect(c().$ageGroupOptions().map((o: { id: string }) => o.id)).toContain(
      'pet',
    );
  });

  it('hides the pet option and adjusts the label when hidePetOption is set', () => {
    fixture.componentRef.setInput('hidePetOption', true);
    fixture.detectChanges();
    expect(c().$ageGroupLabel()).toBe('Adult or child?');
    expect(
      c().$ageGroupOptions().map((o: { id: string }) => o.id),
    ).not.toContain('pet');
  });

  it('onAgeGroupChanged emits the selected age group', () => {
    const emit = vi.spyOn(component.ageGroupChange, 'emit');
    c().onAgeGroupChanged('adult');
    expect(emit).toHaveBeenCalledWith('adult');
  });
});
