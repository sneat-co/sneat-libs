import { inject, provideAppInitializer, ErrorHandler } from '@angular/core';
import { TraceService, init, createErrorHandler } from '@sentry/angular';
import { Router } from '@angular/router';
import { BrowserOptions } from '@sentry/browser';
import { ChunkLoadErrorHandler } from './chunk-load-error.handler';

export const provideSentryAppInitializer = (options: BrowserOptions) => {
  initSentry(options);
  return [
    ...sentryAppInitializerProviders,
    provideAppInitializer(() => {
      inject(TraceService);
    }),
  ];
};

function initSentry(options: BrowserOptions): void {
  // console.log('initSentry()');
  init(options);
}

const sentryAppInitializerProviders = [
  {
    provide: TraceService,
    deps: [Router],
  },
  {
    // Recover from stale lazy-chunk loads after a deploy, delegating all other
    // errors to Sentry's handler (see ChunkLoadErrorHandler doc).
    provide: ErrorHandler,
    useValue: new ChunkLoadErrorHandler(
      createErrorHandler({
        showDialog: true,
      }),
    ),
  },
];
