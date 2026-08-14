import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot } from '@angular/router';
import { APP_INFO, IAppInfo } from '@sneat/core-public';
import { PageTitleService } from './page-title.service';
import { provideAppInfo } from './provide-app-info';
import { SneatTitleStrategy } from './sneat-title.strategy';

function snapshotWith(
  data: Record<string, unknown>,
  params: Record<string, string> = {},
): RouterStateSnapshot {
  const leaf = {
    firstChild: null,
    data,
    paramMap: { get: (key: string) => params[key] ?? null },
  };
  const root = {
    firstChild: leaf,
    data: {},
    paramMap: { get: () => null },
  };
  return { root } as unknown as RouterStateSnapshot;
}

const appInfo: IAppInfo = {
  appId: 'debtus',
  appTitle: 'Debtus.app',
};

function setup(configuredAppInfo: IAppInfo | null) {
  TestBed.configureTestingModule({
    providers: [
      SneatTitleStrategy,
      PageTitleService,
      Title,
      configuredAppInfo
        ? provideAppInfo(configuredAppInfo)
        : { provide: APP_INFO, useValue: null },
    ],
  });
  return {
    strategy: TestBed.inject(SneatTitleStrategy),
    title: TestBed.inject(Title),
    pageTitleService: TestBed.inject(PageTitleService),
  };
}

describe('SneatTitleStrategy', () => {
  it('composes the deepest route title with the app title', () => {
    const { strategy, title } = setup(appInfo);
    strategy.updateTitle(snapshotWith({ title: 'Debts' }));
    expect(title.getTitle()).toBe('Debts @ Debtus.app');
  });

  it('preserves the legacy space type prefix', () => {
    const { strategy, title } = setup(appInfo);
    strategy.updateTitle(
      snapshotWith({ title: 'Debts' }, { spaceType: 'family' }),
    );
    expect(title.getTitle()).toBe('Family Debts @ Debtus.app');
  });

  it('shows only the app title when a route has no title', () => {
    const { strategy, title } = setup(appInfo);
    strategy.updateTitle(snapshotWith({}));
    expect(title.getTitle()).toBe('Debtus.app');
  });

  it('supports an imperative page title that navigation later resets', () => {
    const { strategy, title, pageTitleService } = setup(appInfo);
    pageTitleService.setPageTitle('My Family');
    expect(title.getTitle()).toBe('My Family @ Debtus.app');
    strategy.updateTitle(snapshotWith({ title: 'Debts' }));
    expect(title.getTitle()).toBe('Debts @ Debtus.app');
  });

  it('falls back to the host and warns when APP_INFO is absent', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { strategy, title } = setup(null);
    strategy.updateTitle(snapshotWith({ title: 'Debts' }));
    expect(title.getTitle()).toBe(`Debts @ ${location.host}`);
    expect(warn).toHaveBeenCalledOnce();
  });
});
