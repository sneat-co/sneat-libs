---
__default__: patch
---

`@sneat/app-auth`: Firebase Analytics now lives in its own module, so an app that composes `provideSneatFirebaseAuth()`/`provideSneatFirestore()` without `provideSneatFirebaseAnalytics()` no longer ships `firebase/analytics` (and `@firebase/installations`) in its bundle. Exports are unchanged; apps using `provideSneatFirebase()`, `provideSneatFirebaseAnalytics()` or `provideSneatAuthenticatedProviders()` keep Firebase Analytics as before.
