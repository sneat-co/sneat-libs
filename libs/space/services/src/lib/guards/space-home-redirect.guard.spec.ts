import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { SneatUserService } from '@sneat/auth-core';
import { clearCurrentSpace, writeCurrentSpace } from '@sneat/core';
import { BehaviorSubject } from 'rxjs';
import { spaceHomeRedirectGuard } from './space-home-redirect.guard';

// The guard resolves a space-scoped landing URL for a space-less home route.
// Router.parseUrl is mocked to echo the string so we can assert the exact target.
describe('spaceHomeRedirectGuard', () => {
  const parseUrl = vi.fn((url: string) => ({ url }) as unknown as UrlTree);

  function run(page: string, userState: unknown) {
    const userState$ = new BehaviorSubject<unknown>(userState);
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: { parseUrl } },
        { provide: SneatUserService, useValue: { userState: userState$ } },
      ],
    });
    const guard = spaceHomeRedirectGuard(page);
    return TestBed.runInInjectionContext(
      () => (guard as unknown as () => Promise<boolean | UrlTree>)(),
    );
  }

  beforeEach(() => {
    clearCurrentSpace();
    vi.clearAllMocks();
    TestBed.resetTestingModule();
  });

  it('fast-paths to the remembered active space + page segment', async () => {
    writeCurrentSpace({ id: 's2', type: 'private' });
    const result = await run('requoter', {
      status: 'authenticated',
      record: { spaces: {} },
    });
    expect(parseUrl).toHaveBeenCalledWith('/space/private/s2/requoter');
    expect((result as { url: string }).url).toBe('/space/private/s2/requoter');
  });

  it('redirects to the family space + page when no active space', async () => {
    await run('assets', {
      status: 'authenticated',
      record: {
        spaces: {
          fam: { type: 'family', title: 'Family' },
          me: { type: 'private', title: 'Me' },
        },
      },
    });
    expect(parseUrl).toHaveBeenCalledWith('/space/family/fam/assets');
  });

  it('renders the fallback (returns true) when there is no family space', async () => {
    const result = await run('requoter', {
      status: 'authenticated',
      record: { spaces: { me: { type: 'private', title: 'Me' } } },
    });
    expect(result).toBe(true);
    expect(parseUrl).not.toHaveBeenCalled();
  });

  it('appends the given page segment verbatim (parameterised per app)', async () => {
    writeCurrentSpace({ id: 'abc', type: 'family' });
    await run('assets', { status: 'authenticated', record: { spaces: {} } });
    expect(parseUrl).toHaveBeenCalledWith('/space/family/abc/assets');
  });
});
