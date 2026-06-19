import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { NewLocationPageComponent } from './new-location-page.component';
import { provideContactusMocks } from '../../testing/test-utils';
import { NavController } from '@ionic/angular/standalone';

interface ITestable {
  onLocationChanged(c: unknown): void;
  onContactCreated(c: unknown): void;
  newLocation: unknown;
  $spaceRef: { set(v: unknown): void };
  $item: { set(v: unknown): void };
}

describe('NewLocationPageComponent', () => {
  let component: NewLocationPageComponent;
  let testable: ITestable;
  let fixture: ComponentFixture<NewLocationPageComponent>;
  let navController: { navigateBack: ReturnType<typeof vi.fn> };

  beforeEach(waitForAsync(async () => {
    navController = { navigateBack: vi.fn(() => Promise.resolve(true)) };
    await TestBed.configureTestingModule({
      imports: [NewLocationPageComponent],
      providers: [provideContactusMocks()],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
      .overrideComponent(NewLocationPageComponent, {
        set: {
          imports: [],
          template: '',
          providers: [{ provide: NavController, useValue: navController }],
        },
      })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NewLocationPageComponent);
    component = fixture.componentInstance;
    testable = component as unknown as ITestable;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('onLocationChanged stores the new location', () => {
    const contact = { id: 'loc1', brief: { type: 'location' } };
    testable.onLocationChanged(contact);
    expect(testable.newLocation).toBe(contact);
  });

  it('onContactCreated stores the contact but does not navigate without a space url', () => {
    const contact = { id: 'loc1' };
    testable.onContactCreated(contact);
    expect(testable.newLocation).toBe(contact);
    expect(navController.navigateBack).not.toHaveBeenCalled();
  });

  it('onContactCreated navigates back to the parent contact', () => {
    testable.$spaceRef.set({ id: 'space1' });
    testable.$item.set({ id: 'c1', space: { id: 'space1' } });
    testable.onContactCreated({ id: 'loc1' });
    expect(navController.navigateBack).toHaveBeenCalled();
  });
});
