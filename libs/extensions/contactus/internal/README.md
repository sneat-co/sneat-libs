# @sneat/extension-contactus-internal

Private implementation of the **contactus** extension: services, pages, dialogs,
and internal components. Per the [extension library-architecture convention](../../../../spec/features/extension-library-architecture/README.md)
this lib is **not** in `tsconfig.base.json` `paths`, so no other extension can
import it. Only the contactus extension itself and the application (at bootstrap)
consume it.

## App bootstrap wiring (required)

Cross-extension consumers (e.g. `calendarius`) inject the contactus services
through the `InjectionToken`s defined in `@sneat/extension-contactus-contract`
(`CONTACT_SERVICE`, `CONTACTUS_SPACE_SERVICE`, `CONTACT_NAV_SERVICE`,
`CONTACTUS_NAV_SERVICE`, `CONTACT_GROUP_SERVICE`, `CONTACT_ROLE_SERVICE`,
`INVITE_SERVICE`). The concrete implementations live here and are bound to those
tokens by `provideContactusInternal()`.

The **application** (the `sneat-apps` super-app, which installs every `@sneat/*`
as a real package) must call this at bootstrap:

```ts
import { provideContactusInternal } from '@sneat/extension-contactus-internal';

bootstrapApplication(AppComponent, {
  providers: [
    ...getStandardSneatProviders(environmentConfig),
    ...provideContactusInternal(),
    // ...other extension providers
  ],
});
```

Without this, injecting a contactus token resolves to nothing at runtime. In
unit tests, provide the token with a mock instead.

> Note: this wiring cannot live in `sneat-libs` itself — `libs/app` may not
> import `-internal` (it is absent from `paths` by design). The composition root
> is the app.
