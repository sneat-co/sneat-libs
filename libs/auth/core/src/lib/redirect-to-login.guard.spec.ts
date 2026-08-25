import { TestBed } from '@angular/core/testing';
import { Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loginRedirectPath,
  sneatAuthGuard,
} from './redirect-to-login.guard';
import { AuthStatus, SneatAuthStateService } from './sneat-auth-state-service';

describe('loginRedirectPath', () => {
  it('targets bare /login for the root path', () => {
    expect(loginRedirectPath('/')).toBe('/login');
  });

  it('appends the path as a hash fragment for a non-root path', () => {
    expect(loginRedirectPath('/protected')).toBe('/login#/protected');
  });
});

describe('sneatAuthGuard', () => {
  const parseUrl = vi.fn((url: string) => ({ url }) as unknown as UrlTree);

  function run(authStatus$: BehaviorSubject<AuthStatus>, url = '/protected') {
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: { parseUrl } },
        {
          provide: SneatAuthStateService,
          useValue: { authStatus: authStatus$ },
        },
      ],
    });
    const state = { url } as RouterStateSnapshot;
    return TestBed.runInInjectionContext(() =>
      sneatAuthGuard(
        {} as never,
        state,
      ) as Promise<boolean | UrlTree>,
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.resetTestingModule();
  });

  it('admits a signed-in visitor', async () => {
    const result = await run(
      new BehaviorSubject<AuthStatus>('authenticated'),
    );
    expect(result).toBe(true);
    expect(parseUrl).not.toHaveBeenCalled();
  });

  it('redirects a signed-out visitor to /login with the attempted path as a hash', async () => {
    const result = await run(
      new BehaviorSubject<AuthStatus>('notAuthenticated'),
      '/protected',
    );
    expect(parseUrl).toHaveBeenCalledWith('/login#/protected');
    expect((result as { url: string }).url).toBe('/login#/protected');
  });

  it('redirects to bare /login when the attempted path is the root', async () => {
    await run(new BehaviorSubject<AuthStatus>('notAuthenticated'), '/');
    expect(parseUrl).toHaveBeenCalledWith('/login');
  });

  it('waits out the initial "authenticating" status before deciding', async () => {
    const authStatus$ = new BehaviorSubject<AuthStatus>('authenticating');
    const pending = run(authStatus$, '/protected');

    let settled = false;
    void pending.then(() => (settled = true));
    await Promise.resolve();
    await Promise.resolve();
    expect(settled).toBe(false);
    expect(parseUrl).not.toHaveBeenCalled();

    authStatus$.next('authenticated');
    const result = await pending;
    expect(result).toBe(true);
  });
});
