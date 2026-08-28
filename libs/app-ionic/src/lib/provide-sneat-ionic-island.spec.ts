import { TestBed } from '@angular/core/testing';
import { NavController } from '@ionic/angular/common';
import {
  provideSneatIonicIsland,
  provideSneatIonicShell,
  SneatIonicIslandHostComponent,
} from './provide-sneat-ionic-island';

describe('provideSneatIonicIsland', () => {
  it('is opt-in and the host is standalone for a lazy specialist route', () => {
    TestBed.configureTestingModule({ providers: [provideSneatIonicIsland()] });
    expect(provideSneatIonicShell()).toBeTruthy();
    const fixture = TestBed.createComponent(SneatIonicIslandHostComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});

describe('provideSneatIonicShell', () => {
  it('explicitly retains the focused NavController token required by lazy space routes', () => {
    const navController = NavController as typeof NavController & {
      \u0275prov?: unknown;
    };
    const injectableDefinition = navController.\u0275prov;

    // A lazy consumer must not rely on the class's tree-shakable `providedIn`
    // metadata being retained by a different Ionic entry point.
    Object.defineProperty(navController, '\u0275prov', {
      configurable: true,
      value: undefined,
    });

    try {
      TestBed.configureTestingModule({ providers: [provideSneatIonicShell()] });

      expect(TestBed.inject(NavController)).toBeInstanceOf(NavController);
    } finally {
      Object.defineProperty(navController, '\u0275prov', {
        configurable: true,
        value: injectableDefinition,
      });
    }
  });
});
