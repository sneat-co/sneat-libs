import { NgZone } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { appConfig } from './app.config';

describe('appConfig', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('bootstraps the demo with zoneless change detection', () => {
    TestBed.configureTestingModule({ providers: appConfig.providers });

    expect(TestBed.inject(NgZone).constructor.name).toBe('NoopNgZone');
  });
});
