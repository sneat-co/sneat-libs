import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, CUSTOM_ELEMENTS_SCHEMA, ChangeDetectionStrategy, input } from '@angular/core';
import {
  NavController,
  MenuController,
  IonIcon,
  IonItem,
  IonLabel,
} from '@ionic/angular';
import { SpacesListComponent } from '../spaces-list';
import { SpacesMenuComponent } from './spaces-menu.component';
import { ErrorLogger } from '@sneat/core';
import { AnalyticsService, APP_INFO, LOGGER_FACTORY } from '@sneat/core';
import { of } from 'rxjs';
import { SneatUserService } from '@sneat/auth-core';
import { SNEAT_FIREBASE_AUTH } from '@sneat/core';
import { Firestore } from 'firebase/firestore';

@Component({
  selector: 'sneat-spaces-list',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
})
class SpacesListStubComponent {
  readonly spaces = input<unknown[]>();
  readonly pathPrefix = input('/space');
}

describe('SpacesMenuComponent', () => {
  let component: SpacesMenuComponent;
  let fixture: ComponentFixture<SpacesMenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SpacesMenuComponent],
      providers: [
        {
          provide: ErrorLogger,
          useValue: {
            logError: vi.fn(),
            logErrorHandler: vi.fn(() => vi.fn()),
          },
        },
        { provide: AnalyticsService, useValue: { logEvent: vi.fn() } },
        { provide: LOGGER_FACTORY, useValue: { getLogger: () => console } },
        { provide: APP_INFO, useValue: {} },
        { provide: SneatUserService, useValue: { userState: of({}) } },
        { provide: NavController, useValue: {} },
        { provide: MenuController, useValue: {} },
        {
          provide: SNEAT_FIREBASE_AUTH,
          useValue: {
            onIdTokenChanged: vi.fn(() => () => void 0),
            onAuthStateChanged: vi.fn(() => () => void 0),
          },
        },
        { provide: Firestore, useValue: {} },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
      .overrideComponent(SpacesMenuComponent, {
        remove: { imports: [IonIcon, IonItem, IonLabel, SpacesListComponent] },
        add: {
          imports: [SpacesListStubComponent],
          schemas: [CUSTOM_ELEMENTS_SCHEMA],
        },
      })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SpacesMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
