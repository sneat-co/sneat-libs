import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot } from '@angular/router';
import { APP_INFO, IAppInfo } from '@sneat/core';
import { PageTitleService } from './page-title.service';
import { SneatTitleStrategy } from './sneat-title.strategy';

// Builds a minimal RouterStateSnapshot whose deepest route carries the given
// route `data` and params, matching what getRouteTitle walks.
function snapshotWith(
  data: Record<string, unknown>,
  params: Record<string, string> = {},
): RouterStateSnapshot {
  const leaf = {
    firstChild: null,
    data,
    paramMap: { get: (k: string) => params[k] ?? null },
  };
  const root = {
    firstChild: leaf,
    data: {},
    paramMap: { get: () => null },
  };
  return { root } as unknown as RouterStateSnapshot;
}

const debtusAppInfo: IAppInfo = {
  appId: 'debtus',
  appTitle: 'Debtus.app',
} as IAppInfo;

function setup(appInfo: IAppInfo | null) {
  TestBed.configureTestingModule({
    providers: [
      SneatTitleStrategy,
      PageTitleService,
      Title,
      { provide: APP_INFO, useValue: appInfo },
    ],
  });
  return {
    strategy: TestBed.inject(SneatTitleStrategy),
    title: TestBed.inject(Title),
    pageTitleService: TestBed.inject(PageTitleService),
  };
}

describe('SneatTitleStrategy', () => {
  it('composes route data.title with the app title', () => {
    const { strategy, title } = setup(debtusAppInfo);
    strategy.updateTitle(snapshotWith({ title: 'Debts' }));
    expect(title.getTitle()).toBe('Debts @ Debtus.app');
  });

  it('prefixes the space type onto the route title', () => {
    const { strategy, title } = setup(debtusAppInfo);
    strategy.updateTitle(snapshotWith({ title: 'Debts' }, { spaceType: 'family' }));
    expect(title.getTitle()).toBe('Family Debts @ Debtus.app');
  });

  it('shows just the app title on a page without a title', () => {
    const { strategy, title } = setup(debtusAppInfo);
    strategy.updateTitle(snapshotWith({}));
    expect(title.getTitle()).toBe('Debtus.app');
  });

  it('lets a page override the title imperatively during its lifecycle', () => {
    const { title, pageTitleService } = setup(debtusAppInfo);
    pageTitleService.setPageTitle('My Family');
    expect(title.getTitle()).toBe('My Family @ Debtus.app');
  });

  it('a later navigation resets a page-set title (no leak)', () => {
    const { strategy, title, pageTitleService } = setup(debtusAppInfo);
    pageTitleService.setPageTitle('My Family');
    strategy.updateTitle(snapshotWith({ title: 'Debts' }));
    expect(title.getTitle()).toBe('Debts @ Debtus.app');
  });

  it('falls back to the host and warns when APP_INFO is not provided', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { strategy, title } = setup(null);
    strategy.updateTitle(snapshotWith({ title: 'Debts' }));
    expect(title.getTitle()).toBe(`Debts @ ${location.host}`);
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });
});
