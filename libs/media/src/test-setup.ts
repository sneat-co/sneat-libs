import { NgModule, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';

@NgModule({ providers: [provideZonelessChangeDetection()] })
class ZonelessTestEnvironmentModule {}

try {
  TestBed.initTestEnvironment(
    [BrowserDynamicTestingModule, ZonelessTestEnvironmentModule],
    platformBrowserDynamicTesting(),
  );
} catch (error) {
  if (!(error instanceof Error) || !error.message.includes('already')) throw error;
}
