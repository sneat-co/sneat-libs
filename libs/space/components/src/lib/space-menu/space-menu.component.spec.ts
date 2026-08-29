import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
} from '@angular/core';
import {
  NavController,
  MenuController,
  IonList,
  IonItem,
  IonSelect,
  IonSelectOption,
  IonIcon,
  IonLabel,
  IonItemDivider,
  IonButtons,
  IonButton,
} from '@ionic/angular';
import { AuthMenuItemComponent } from '@sneat/auth-ui';
import { SpaceMenuComponent } from './space-menu.component';
import { RouterTestingModule } from '@angular/router/testing';
import { ErrorLogger } from '@sneat/core';
import { AnalyticsService, APP_INFO, LOGGER_FACTORY } from '@sneat/core';
import { SneatUserService } from '@sneat/auth-core';
import { NEVER, of, Subject } from 'rxjs';
import { SNEAT_FIREBASE_AUTH } from '@sneat/core';
import { Firestore } from 'firebase/firestore';
import { SpaceService } from '@sneat/space-services';
import { provideSpaceExtensionNavItems } from '../space-extension-links';

@Component({
  selector: 'sneat-auth-menu-item',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
})
class AuthMenuItemStubComponent {}

describe('SpaceMenuComponent', () => {
  let component: SpaceMenuComponent;
  let fixture: ComponentFixture<SpaceMenuComponent>;
  let userChanged: Subject<string | undefined>;

  beforeEach(async () => {
    userChanged = new Subject<string | undefined>();
    await TestBed.configureTestingModule({
      imports: [SpaceMenuComponent, RouterTestingModule],
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
        {
          provide: SneatUserService,
          useValue: {
            currentUserID: undefined,
            userChanged,
            userState: of({}),
          },
        },
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
        provideSpaceExtensionNavItems([
          {
            id: 'sizes',
            title: 'Sizes',
            path: 'sizes',
            icon: '<svg></svg>',
          },
        ]),
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
      .overrideComponent(SpaceMenuComponent, {
        remove: {
          imports: [
            IonList,
            IonItem,
            IonSelect,
            IonSelectOption,
            IonIcon,
            IonLabel,
            IonItemDivider,
            IonButtons,
            IonButton,
            AuthMenuItemComponent,
          ],
        },
        add: {
          imports: [AuthMenuItemStubComponent],
          schemas: [CUSTOM_ELEMENTS_SCHEMA],
        },
      })
      .overrideProvider(SpaceService, {
        useValue: { watchSpace: vi.fn(() => NEVER) },
      })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SpaceMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders the Sizes menu item for the sizeus extension', () => {
    const labels = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('ion-label'),
    ).map((label) => label.textContent?.trim());
    expect(labels).toContain('Sizes');
  });

  it('renders primary space links before the extensions section', () => {
    const labels = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('ion-label'),
    );
    const labelTexts = labels.map((label) => label.textContent?.trim());

    expect(labelTexts.indexOf('Members')).toBeLessThan(
      labelTexts.indexOf('Calendar'),
    );
    expect(labelTexts.indexOf('Calendar')).toBeLessThan(
      labelTexts.indexOf('Extensions'),
    );

    const calendarItem = labels
      .find((label) => label.textContent?.trim() === 'Calendar')
      ?.closest('ion-item');
    expect(calendarItem?.getAttribute('lines')).toBe('none');

    const extensionsDivider = labels
      .find((label) => label.textContent?.trim() === 'Extensions')
      ?.closest('ion-item-divider');
    expect(extensionsDivider?.getAttribute('color')).toBe('header');
  });

  it('keeps URL-derived space identity when auth initially reports no user', () => {
    component['onSpaceIdChangedInUrl']({
      id: 'family-space',
      type: 'family',
    });

    userChanged.next(undefined);

    expect(component['$space']()).toMatchObject({
      id: 'family-space',
      type: 'family',
    });
  });

  it('disables space navigation when the requested space does not exist', () => {
    component['onSpaceIdChangedInUrl']({
      id: 'missing-space',
      type: 'family',
    });
    fixture.detectChanges();
    component['onSpaceContextChanged']({
      id: 'missing-space',
      type: undefined,
      brief: null,
      dbo: null,
    });
    fixture.detectChanges();

    expect(component['$space']()).toMatchObject({
      id: 'missing-space',
      type: 'family',
    });
    expect(component['$spaceNotFound']()).toBe(true);
    expect(component['$disabled']()).toBe(true);

    const navigationItems = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll(
        'ion-item[tappable]',
      ),
    );
    expect(navigationItems.length).toBeGreaterThan(0);
    expect(
      navigationItems.every(
        (item) => (item as unknown as { disabled: boolean }).disabled,
      ),
    ).toBe(true);
  });
});
