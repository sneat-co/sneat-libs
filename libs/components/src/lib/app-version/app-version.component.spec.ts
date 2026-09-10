import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BUILD_INFO, IBuildInfo } from '@sneat/core-public';
import { AppVersionComponent } from './app-version.component';
import { buildInfo as placeholderBuildInfo } from './build-info';

async function createFixture(
  provideBuildInfoValue?: IBuildInfo,
): Promise<ComponentFixture<AppVersionComponent>> {
  await TestBed.configureTestingModule({
    imports: [AppVersionComponent],
    providers: provideBuildInfoValue
      ? [{ provide: BUILD_INFO, useValue: provideBuildInfoValue }]
      : [],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
  })
    .overrideComponent(AppVersionComponent, {
      set: { imports: [], schemas: [CUSTOM_ELEMENTS_SCHEMA] },
    })
    .compileComponents();
  const fixture = TestBed.createComponent(AppVersionComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}

function toggleRow(
  fixture: ComponentFixture<AppVersionComponent>,
): HTMLElement {
  return fixture.nativeElement.querySelector(
    '[data-testid="build-info-toggle"]',
  ) as HTMLElement;
}

// The icon's `name` is bound as a property (`[name]`), the way the real
// Stencil `ion-icon` element consumes it — under CUSTOM_ELEMENTS_SCHEMA in
// this test double, that update reaches the DOM `name` property but is not
// reliably mirrored onto the `name` *attribute* (happy-dom doesn't reflect
// arbitrary property writes on an unrecognized custom-element tag back to
// attributes), so assertions read the property, not getAttribute('name').
function chevronName(
  fixture: ComponentFixture<AppVersionComponent>,
): string | undefined {
  const icon = fixture.nativeElement.querySelector(
    '[data-testid="build-info-chevron"]',
  ) as HTMLElement & { name?: string };
  return icon.name;
}

describe('AppVersionComponent', () => {
  it('should create', async () => {
    const fixture = await createFixture();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders a collapsed footer row by default, with no version/hash rows', async () => {
    const fixture = await createFixture();
    expect(toggleRow(fixture)).toBeTruthy();
    expect(toggleRow(fixture).getAttribute('aria-expanded')).toBe('false');
    expect(
      fixture.nativeElement.querySelector(
        '[data-testid="build-info-version"]',
      ),
    ).toBeNull();
    expect(
      fixture.nativeElement.querySelector('[data-testid="build-info-hash"]'),
    ).toBeNull();
    expect(chevronName(fixture)).toBe('chevron-down-outline');
  });

  it('expands to reveal the version and build rows when the row is tapped', async () => {
    const fixture = await createFixture();
    toggleRow(fixture).click();
    fixture.detectChanges();

    expect(toggleRow(fixture).getAttribute('aria-expanded')).toBe('true');
    expect(chevronName(fixture)).toBe('chevron-up-outline');

    const version = fixture.nativeElement.querySelector(
      '[data-testid="build-info-version"]',
    ) as HTMLElement;
    expect(version.textContent?.trim()).toBe(
      `Version v${placeholderBuildInfo.version}`,
    );

    const hash = fixture.nativeElement.querySelector(
      '[data-testid="build-info-hash"]',
    ) as HTMLElement;
    expect(hash.textContent?.trim()).toBe(
      `Build ${placeholderBuildInfo.gitHash.substring(0, 7)} @ ${placeholderBuildInfo.buildTimestamp}`,
    );
  });

  it('collapses again on a second tap, hiding the version/build rows', async () => {
    const fixture = await createFixture();
    toggleRow(fixture).click();
    fixture.detectChanges();
    toggleRow(fixture).click();
    fixture.detectChanges();

    expect(toggleRow(fixture).getAttribute('aria-expanded')).toBe('false');
    expect(
      fixture.nativeElement.querySelector(
        '[data-testid="build-info-version"]',
      ),
    ).toBeNull();
  });

  it('clicking the copyright link does not toggle the expanded state', async () => {
    const fixture = await createFixture();
    const link = fixture.nativeElement.querySelector(
      'a',
    ) as HTMLAnchorElement;
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    // jsdom/happy-dom navigation to an external href isn't relevant here —
    // only that the click doesn't bubble up to the ion-item's toggle handler.
    link.dispatchEvent(event);
    fixture.detectChanges();

    expect(toggleRow(fixture).getAttribute('aria-expanded')).toBe('false');
  });

  it('defaults the copyright holder to Sneat.Work linking to https://sneat.work, starting 2020', async () => {
    const fixture = await createFixture();
    const link = fixture.nativeElement.querySelector(
      'a',
    ) as HTMLAnchorElement;
    expect(link.textContent?.trim()).toBe('Sneat.Work');
    expect(link.getAttribute('href')).toBe('https://sneat.work');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(toggleRow(fixture).textContent).toContain('2020');
  });

  it('lets a consuming app override copyrightHolder, copyrightUrl and startYear', async () => {
    const fixture = await createFixture();
    fixture.componentRef.setInput('copyrightHolder', 'DataTug.app');
    fixture.componentRef.setInput('copyrightUrl', 'https://datatug.app');
    fixture.componentRef.setInput('startYear', 2022);
    fixture.detectChanges();
    await fixture.whenStable();

    const link = fixture.nativeElement.querySelector(
      'a',
    ) as HTMLAnchorElement;
    expect(link.textContent?.trim()).toBe('DataTug.app');
    expect(link.getAttribute('href')).toBe('https://datatug.app');
    expect(toggleRow(fixture).textContent).toContain('2022');
  });

  it('renders the committed placeholders when BUILD_INFO is not provided', async () => {
    const fixture = await createFixture();
    toggleRow(fixture).click();
    fixture.detectChanges();

    const version = fixture.nativeElement.querySelector(
      '[data-testid="build-info-version"]',
    ) as HTMLElement;
    expect(version.textContent?.trim()).toBe(
      `Version v${placeholderBuildInfo.version}`,
    );
  });

  it('renders the provided BUILD_INFO when an app calls provideBuildInfo()', async () => {
    const buildInfo: IBuildInfo = {
      version: '1.2.3',
      gitHash: 'abcdef1234567890',
      buildTimestamp: '2026-09-10T12:00:00.000Z',
    };
    const fixture = await createFixture(buildInfo);
    toggleRow(fixture).click();
    fixture.detectChanges();

    const version = fixture.nativeElement.querySelector(
      '[data-testid="build-info-version"]',
    ) as HTMLElement;
    const hash = fixture.nativeElement.querySelector(
      '[data-testid="build-info-hash"]',
    ) as HTMLElement;
    expect(version.textContent?.trim()).toBe('Version v1.2.3');
    expect(hash.textContent?.trim()).toBe(
      'Build abcdef1 @ 2026-09-10T12:00:00.000Z',
    );
    // Build year (from buildTimestamp) drives the collapsed row's end year.
    expect(toggleRow(fixture).textContent).toContain('2026');
  });

  it('renders build info via non-input elements only (no readonly ion-input)', async () => {
    const fixture = await createFixture();
    expect(fixture.nativeElement.querySelector('ion-input')).toBeNull();
  });
});
