import { TestBed } from '@angular/core/testing';
import {
  Router,
  Route,
  UrlSegment,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
} from '@angular/router';
import { SneatAuthGuard, SNEAT_AUTH_GUARDS } from './sneat-auth-guard';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('SneatAuthGuard', () => {
  let guard: SneatAuthGuard;
  let routerMock: {
    createUrlTree: ReturnType<typeof vi.fn>;
    parseUrl: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    routerMock = {
      createUrlTree: vi.fn(),
      parseUrl: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [SneatAuthGuard, { provide: Router, useValue: routerMock }],
    });

    guard = TestBed.inject(SneatAuthGuard);
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });

  // Regression guard for the 0.27.0 @angular/fire removal: this guard used to
  // `inject(Auth)` from '@angular/fire/auth' without ever reading the instance.
  // It must now construct with no Firebase provider in the injector at all —
  // note the TestBed above deliberately provides none.
  it('should be constructible without any Firebase Auth provider', () => {
    expect(() => TestBed.inject(SneatAuthGuard)).not.toThrow();
  });

  describe('canLoad', () => {
    it('should return true', () => {
      const route: Route = { path: 'test' };
      const segments: UrlSegment[] = [];

      const result = guard.canLoad(route, segments);
      expect(result).toBe(true);
    });
  });

  describe('canActivate', () => {
    it('should return true', () => {
      const route = {} as ActivatedRouteSnapshot;
      const state = { url: '/test' } as RouterStateSnapshot;

      const result = guard.canActivate(route, state);
      expect(result).toBe(true);
    });
  });

  describe('canActivateChild', () => {
    it('should return true', () => {
      const childRoute = {} as ActivatedRouteSnapshot;
      const state = { url: '/test/child' } as RouterStateSnapshot;

      const result = guard.canActivateChild(childRoute, state);
      expect(result).toBe(true);
    });
  });
});

describe('SNEAT_AUTH_GUARDS', () => {
  it('should wire both router hooks to SneatAuthGuard', () => {
    expect(SNEAT_AUTH_GUARDS.canActivate).toEqual([SneatAuthGuard]);
    expect(SNEAT_AUTH_GUARDS.canLoad).toEqual([SneatAuthGuard]);
  });
});
