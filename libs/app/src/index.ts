export * from './environments';
export * from './lib/base-app.component';
export * from './lib/sneat-base-app';
export * from './lib/get-standard-sneat-imports';
export * from './lib/app-component.service';
export * from './environments/environment.local';
export * from './lib/init-helpers';
export * from './lib/contact-extensions';
export * from './lib/get-standard-sneat-providers';
export * from './lib/app-specific-providers';
export * from './lib/capacitator-http.service';
export {
  PageTitleService,
  SneatTitleStrategy,
  SNEAT_AUTHENTICATED_LIFECYCLE,
} from '@sneat/app-public';
// `./lib/init-firebase` used to re-export `getAngularFireProviders` and
// `provideFireApp` from @sneat/app-auth. Both were removed in 0.27.0 with
// `@angular/fire`; `provideSneatFirebase` replaces them, and is re-exported
// here so an app importing its Firebase bootstrap from `@sneat/app` keeps a
// one-line migration.
export {
  provideSneatFirebase,
  SNEAT_FIREBASE_APP,
  SNEAT_FIREBASE_AUTH,
  SNEAT_FIREBASE_ANALYTICS,
} from '@sneat/app-auth';
