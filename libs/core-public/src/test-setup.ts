/**
 * Zoneless vitest setup for `@sneat/core-public`.
 *
 * This project sits *below* `@sneat/core` in the dependency graph (`core`
 * imports `core-public`), so it cannot reuse `@sneat/core/testing-light`
 * without introducing a cycle — the zoneless test environment is inlined here
 * instead. Keep it in step with
 * `libs/core/src/lib/testing/base-test-setup.ts`, which is the canonical
 * template for the rest of the workspace.
 *
 * zone.js is not a dependency of this workspace: no `waitForAsync`, no
 * `fakeAsync`, no `tick()`. See `@sneat/core/testing` for the migration table.
 */
import { NgModule, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing';

@NgModule({ providers: [provideZonelessChangeDetection()] })
class ZonelessTestEnvironmentModule {}

try {
  TestBed.initTestEnvironment(
    [BrowserDynamicTestingModule, ZonelessTestEnvironmentModule],
    platformBrowserDynamicTesting(),
  );
} catch (error) {
  if (!(error instanceof Error) || !error.message.includes('already')) {
    throw error;
  }
}
