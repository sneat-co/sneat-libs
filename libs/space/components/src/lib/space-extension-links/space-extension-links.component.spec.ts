import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { SpaceExtensionLinksComponent } from './space-extension-links.component';
import { SpaceExtensionNavItem } from './space-extension-nav-item';

const items: readonly SpaceExtensionNavItem[] = [
  {
    id: 'assets',
    title: 'Assets',
    path: 'assets',
    icon: '',
  },
  {
    id: 'retros',
    title: 'Retrospectives',
    path: 'retros',
    icon: '',
    spaceTypes: ['team', 'company'],
  },
  {
    id: 'sizes',
    title: 'Sizes',
    path: 'sizes',
    icon: '',
  },
];

describe('SpaceExtensionLinksComponent', () => {
  let fixture: ComponentFixture<SpaceExtensionLinksComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SpaceExtensionLinksComponent, RouterTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(SpaceExtensionLinksComponent);
    fixture.componentRef.setInput('$space', {
      id: 'family-space',
      type: 'family',
    });
    fixture.componentRef.setInput('$items', items);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('renders one configurable list and hides items for other space types', () => {
    const labels = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll(
        'ion-label.extension-title',
      ),
    ).map((label) => label.textContent?.trim());

    expect(labels).toEqual(['Assets', 'Sizes']);
  });

  it('removes the border from the final visible item', () => {
    const renderedItems = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('ion-item'),
    );

    expect(renderedItems.at(-1)?.classList).toContain('last-extension-item');
  });
});
