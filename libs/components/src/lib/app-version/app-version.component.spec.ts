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

describe('AppVersionComponent', () => {
  it('should create', async () => {
    const fixture = await createFixture();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders the committed placeholders when BUILD_INFO is not provided', async () => {
    const fixture = await createFixture();
    const version = fixture.nativeElement.querySelector(
      '[data-testid="build-info-version"]',
    ) as HTMLElement;
    const hash = fixture.nativeElement.querySelector(
      '[data-testid="build-info-hash"]',
    ) as HTMLElement;
    expect(version.textContent?.trim()).toBe(placeholderBuildInfo.version);
    expect(hash.textContent?.trim()).toBe(
      `${placeholderBuildInfo.gitHash.substring(0, 7)} @ ${placeholderBuildInfo.buildTimestamp}`,
    );
  });

  it('renders the provided BUILD_INFO when an app calls provideBuildInfo()', async () => {
    const buildInfo: IBuildInfo = {
      version: '1.2.3',
      gitHash: 'abcdef1234567890',
      buildTimestamp: '2026-09-10T12:00:00.000Z',
    };
    const fixture = await createFixture(buildInfo);
    const version = fixture.nativeElement.querySelector(
      '[data-testid="build-info-version"]',
    ) as HTMLElement;
    const hash = fixture.nativeElement.querySelector(
      '[data-testid="build-info-hash"]',
    ) as HTMLElement;
    expect(version.textContent?.trim()).toBe('1.2.3');
    expect(hash.textContent?.trim()).toBe('abcdef1 @ 2026-09-10T12:00:00.000Z');
  });

  it('renders build info via non-input elements only (no readonly ion-input)', async () => {
    const fixture = await createFixture();
    expect(fixture.nativeElement.querySelector('ion-input')).toBeNull();
  });
});
