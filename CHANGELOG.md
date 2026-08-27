## 0.27.4 (2026-08-27)

### 🩹 Fixes

- Avoid Ionic root barrels on Sneat.app bootstrap paths ([8fc7c2f](https://github.com/sneat-co/sneat-libs/commit/8fc7c2f))

### ❤️ Thank You

- Alexander Trakhimenok

## 0.27.3 (2026-08-27)

### 🩹 Fixes

- Defer Firebase session startup and allow local subdomains ([d10da56](https://github.com/sneat-co/sneat-libs/commit/d10da56))

### ❤️ Thank You

- Alexander Trakhimenok

## 0.27.2 (2026-08-26)

### 🩹 Fixes

- fix: correct swapped logError(e, message) arguments so server error details reach the user ([cb555cf](https://github.com/sneat-co/sneat-libs/commit/cb555cf))

### ❤️ Thank You

- Alexander Trakhimenok
- Claude Opus 5

## 0.27.1 (2026-08-26)

### 🚀 Features

- port EventHappening contract (event-happening.ts + happening.ts pricing/planned-slot additions) from the abandoned ext-calendarius 0.24.1 lineage ([e99040f](https://github.com/sneat-co/sneat-libs/commit/e99040f))

### ❤️ Thank You

- Alexander Trakhimenok

## 0.27.0 (2026-08-25)

### ⚠️  Breaking Changes

- remove @angular/fire entirely: breaking removal of getAngularFireProviders/provideFireApp/redirectToLoginIfNotSignedIn/canLoad and the @angular/fire DI tokens ([9d95894](https://github.com/sneat-co/sneat-libs/commit/9d95894))

### ❤️ Thank You

- Alexander Trakhimenok
- Claude Fable 5

## 0.26.6 (2026-08-25)

### 🩹 Fixes

- **testing:** run shared test harness zoneless, drop zone.js ([c9eaf8e](https://github.com/sneat-co/sneat-libs/commit/c9eaf8e))

### ❤️ Thank You

- Alexander Trakhimenok

## 0.26.5 (2026-08-25)

### 🚀 Features

- **app-auth,auth-core:** add @angular/fire-free Firebase providers and auth guard ([a292975](https://github.com/sneat-co/sneat-libs/commit/a292975))

### ❤️ Thank You

- Alexander Trakhimenok
- Claude Fable 5

## 0.26.4 (2026-08-24)

### 🩹 Fixes

- align capacitor peers with supported v8 ([cb3028e](https://github.com/sneat-co/sneat-libs/commit/cb3028e))
- align Capacitor peers with stable 8 line ([693bb40](https://github.com/sneat-co/sneat-libs/commit/693bb40))

### ❤️ Thank You

- Alexander Trakhimenok @trakhimenok

## 0.26.3 (2026-08-24)

### 🩹 Fixes

- **auth:** resolve current Firebase token per request ([#54](https://github.com/sneat-co/sneat-libs/pull/54))
- **demo:** enable zoneless demo bootstrap ([b238798](https://github.com/sneat-co/sneat-libs/commit/b238798))

### ❤️ Thank You

- Alexander Trakhimenok @trakhimenok

## 0.26.2 (2026-08-24)

### 🚀 Features

- **app:** enable zoneless standard providers ([ac234cd](https://github.com/sneat-co/sneat-libs/commit/ac234cd))

### ❤️ Thank You

- Alexander Trakhimenok

## 0.26.1 (2026-08-24)

### 🚀 Features

- migrate libraries to Ionic Framework 9 and Angular 22 ([cfcd230](https://github.com/sneat-co/sneat-libs/commit/cfcd230))

### ❤️ Thank You

- Alexander Trakhimenok

## 0.26.0 (2026-08-20)

### 🚀 Features

- **core:** add 'community-center' space type (NoticeBoard.cc) ([#46](https://github.com/sneat-co/sneat-libs/pull/46))

### 🩹 Fixes

- **app:** default authDomain to shared auth.sneat.co (fixes Google sign-in on Cloudflare) ([#47](https://github.com/sneat-co/sneat-libs/pull/47))
- **auth-ui:** show a spinner while authenticating instead of flashing the form ([#48](https://github.com/sneat-co/sneat-libs/pull/48))

### ❤️ Thank You

- Alexander Trakhimenok @trakhimenok
- Claude Opus 4.8

## 0.25.0 (2026-08-15)

### 🚀 Features

- **app:** split public and authenticated bootstrap ([4e9b7f7](https://github.com/sneat-co/sneat-libs/commit/4e9b7f7))

### ❤️ Thank You

- Alexander Trakhimenok

## 0.24.0 (2026-07-28)

### 🚀 Features

- **core:** introduce SpaceType 'personal' for personal/home spaces ([acd5961](https://github.com/sneat-co/sneat-libs/commit/acd5961))
- **core:** support Circleus group spaces ([#39](https://github.com/sneat-co/sneat-libs/pull/39))

### ❤️ Thank You

- Alexander Trakhimenok @trakhimenok
- Claude Opus 4.8

## 0.23.0 (2026-07-14)

### 🚀 Features

- **core:** register motorius + yachtius as first-party SneatApp literals ([bfdb7d4](https://github.com/sneat-co/sneat-libs/commit/bfdb7d4))

### 🩹 Fixes

- stop calendar listeners when spaces clear ([e5a0c62](https://github.com/sneat-co/sneat-libs/commit/e5a0c62))

### ❤️ Thank You

- Alexander Trakhimenok
- Claude Opus 4.8 (1M context)

## 0.22.1 (2026-07-12)

This was a version bump only, there were no code changes.

## 0.22.0 (2026-07-07)

### 🚀 Features

- **space-services:** add spaceHomeRedirectGuard(page) factory ([e634507](https://github.com/sneat-co/sneat-libs/commit/e634507))

### ❤️ Thank You

- Alexander Trakhimenok
- Claude Opus 4.8 (1M context)

## 0.21.1 (2026-07-06)

### 🩹 Fixes

- **components:** ship src/assets in the published package (countries.json) ([#35](https://github.com/sneat-co/sneat-libs/pull/35))

### ❤️ Thank You

- Alexander Trakhimenok @trakhimenok
- Claude Opus 4.8

## 0.21.0 (2026-07-06)

### 🚀 Features

- **api:** repoint ecosystem API base URL to api.sneat.cloud ([#34](https://github.com/sneat-co/sneat-libs/pull/34))

### ❤️ Thank You

- Alexander Trakhimenok @trakhimenok
- Claude Opus 4.8

## 0.20.0 (2026-07-05)

### 🚀 Features

- **api:** repoint ecosystem API base URL to api.sneat.co (Cloud Run) ([#33](https://github.com/sneat-co/sneat-libs/pull/33))

### ❤️ Thank You

- Alexander Trakhimenok @trakhimenok
- Claude Opus 4.8

## 0.19.0 (2026-07-04)

### 🚀 Features

- **space-components:** add Sizes space-menu entry + reconcile sizechart app id to sizeus ([#31](https://github.com/sneat-co/sneat-libs/pull/31), [#3444](https://github.com/sneat-co/sneat-libs/issues/3444))

### ❤️ Thank You

- Alexander Trakhimenok @trakhimenok
- Claude Opus 4.8 (1M context)

## 0.18.0 (2026-07-01)

### 🚀 Features

- **space-services:** add spaceHomeRedirectGuard(page) factory ([#30](https://github.com/sneat-co/sneat-libs/pull/30))

### ❤️ Thank You

- Alexander Trakhimenok @trakhimenok
- Claude Opus 4.8 (1M context)

## 0.17.0 (2026-07-01)

### 🚀 Features

- **core:** add isReservedPublicPath + root-mount routing standard ([#28](https://github.com/sneat-co/sneat-libs/pull/28))

### ❤️ Thank You

- Alexander Trakhimenok @trakhimenok
- Claude Opus 4.8 (1M context)

## 0.16.0 (2026-07-01)

### 🚀 Features

- **components:** sneat-country-input inline-list mode + loader error/retry ([#27](https://github.com/sneat-co/sneat-libs/pull/27))

### ❤️ Thank You

- Alexander Trakhimenok @trakhimenok
- Claude Opus 4.8 (1M context)

## 0.15.2 (2026-06-30)

### 🚀 Features

- **calendarius-contract:** add 'event' HappeningKind + IHappeningBase.ext ([#23](https://github.com/sneat-co/sneat-libs/pull/23))

### ❤️ Thank You

- Alexander Trakhimenok @trakhimenok
- Claude Opus 4.8

## 0.15.1 (2026-06-29)

### 🚀 Features

- **libs-demo:** scaffold demo app + Playwright e2e for library components ([98c6b2e](https://github.com/sneat-co/sneat-libs/commit/98c6b2e))

### ❤️ Thank You

- Alexander Trakhimenok
- Claude Opus 4.8

## 0.15.0 (2026-06-29)

### 🚀 Features

- **dto:** spaceless system namespace for global extension records ([2556fb7](https://github.com/sneat-co/sneat-libs/commit/2556fb7))

### ❤️ Thank You

- Alexander Trakhimeno
- Claude Opus 4.8

## 0.14.0 (2026-06-25)

### 🚀 Features

- **app:** treat any *.localhost host as localhost for emulator selection ([70b4688](https://github.com/sneat-co/sneat-libs/commit/70b4688))
- **auth-ui:** show sign-in reason heading + detail on the login page ([ca210f3](https://github.com/sneat-co/sneat-libs/commit/ca210f3))

### ❤️ Thank You

- Alexander Trakhimenok
- Claude Opus 4.8 (1M context)

## 0.13.1 (2026-06-25)

### 🩹 Fixes

- **auth-core:** make login return-path base-href aware ([#20](https://github.com/sneat-co/sneat-libs/pull/20))

### ❤️ Thank You

- Alexander Trakhimenok @trakhimenok
- Claude Opus 4.8 (1M context)

## 0.13.0 (2026-06-25)

### 🚀 Features

- **core:** open SneatApp union to accept any appId ([#18](https://github.com/sneat-co/sneat-libs/pull/18))
- **libs-demo:** scaffold demo app + Playwright e2e for library components ([faeeadf](https://github.com/sneat-co/sneat-libs/commit/faeeadf))

### 🩹 Fixes

- **release:** exclude non-publishable demo apps from nx release ([#19](https://github.com/sneat-co/sneat-libs/pull/19))

### ❤️ Thank You

- Alexander Trakhimenok @trakhimenok
- Claude Opus 4.8
- Claude Opus 4.8 (1M context)

## 0.12.1 (2026-06-20)

This was a version bump only, there were no code changes.

## 0.12.0 (2026-06-20)

### 🚀 Features

- **calendarius:** scaffold extension-calendarius contract/shared/internal libs (Task 1) ([da21b70](https://github.com/sneat-co/sneat-libs/commit/da21b70))
- **calendarius:** contract cutover — types + SCHEDULE_NAV_SERVICE token (Task 2) ([9f21da0](https://github.com/sneat-co/sneat-libs/commit/9f21da0))
- **calendarius:** internal cutover — services/pages + token providers (Task 3) ([6cfde5b](https://github.com/sneat-co/sneat-libs/commit/6cfde5b))
- **calendarius:** shared cutover — relocate to shared-tier lib (Task 4) ([3e867b4](https://github.com/sneat-co/sneat-libs/commit/3e867b4))
- **calendarius:** rename shared lib to clean name + final verify (Tasks 6,7) ([ee6373b](https://github.com/sneat-co/sneat-libs/commit/ee6373b))
- **contactus:** scaffold extension-contactus contract/shared/internal libs (Task 2) ([272d667](https://github.com/sneat-co/sneat-libs/commit/272d667))
- **contactus:** contract cutover — move types + define service tokens (Task 3) ([f1e2847](https://github.com/sneat-co/sneat-libs/commit/f1e2847))
- **contactus:** internal cutover — services to -internal via contract tokens (Task 4) ([80d215a](https://github.com/sneat-co/sneat-libs/commit/80d215a))
- **contactus:** shared cutover — relocate to extension-contactus-shared (Task 5) ([fed01aa](https://github.com/sneat-co/sneat-libs/commit/fed01aa))
- **logging:** shared ChunkLoadErrorHandler reused by all apps ([#11](https://github.com/sneat-co/sneat-libs/pull/11))
- **nx:** tag projects + extension-library tier boundary matrix (Task 1) ([7fbf268](https://github.com/sneat-co/sneat-libs/commit/7fbf268))
- **nx:** flip boundary matrix to error + document bootstrap wiring (Task 6) ([6dfc753](https://github.com/sneat-co/sneat-libs/commit/6dfc753))
- **nx:** remove ext:calendarius transitional boundary allowance (Task 5) ([f331b7a](https://github.com/sneat-co/sneat-libs/commit/f331b7a))

### 🩹 Fixes

- **release:** use fixed versioning with v{version} tag pattern ([7cfb518](https://github.com/sneat-co/sneat-libs/commit/7cfb518))

### ❤️ Thank You

- Alexander Trakhimenok @trakhimenok
- Claude Opus 4.8

## 0.11.0 (2026-06-19)

### 🚀 Features

- **space-components:** add Eventus item to space menu ([ea0093f](https://github.com/sneat-co/sneat-libs/commit/ea0093f))

### ❤️ Thank You

- Alexander Trakhimenok
- Claude Opus 4.8

## 0.10.0 (2026-06-19)

### 🚀 Features

- **core:** add 'eventus' to SneatApp union ([67fb9c8](https://github.com/sneat-co/sneat-libs/commit/67fb9c8))

### ❤️ Thank You

- Alexander Trakhimenok
- Claude Opus 4.8

## 0.9.1 (2026-06-18)

### 🩹 Fixes

- **auth-ui:** provide UserRequiredFieldsService in root (NG0201 on landing pages) ([b90a11c](https://github.com/sneat-co/sneat-libs/commit/b90a11c))

### ❤️ Thank You

- Alexander Trakhimenok
- Claude Opus 4.8

## 0.9.0 (2026-06-18)

### 🚀 Features

- **app,core:** default authDomain to current origin (same-origin auth) ([6c81dfc](https://github.com/sneat-co/sneat-libs/commit/6c81dfc))

### ❤️ Thank You

- Alexander Trakhimenok
- Claude Opus 4.8

## 0.8.0 (2026-06-18)

### 🚀 Features

- **app:** fail-safe runtime env selection to prevent emulator-in-prod ([196bed4](https://github.com/sneat-co/sneat-libs/commit/196bed4))

### ❤️ Thank You

- Alexander Trakhimenok
- Claude Opus 4.8

## 0.7.0 (2026-06-17)

### 🚀 Features

- **app,space:** declarative TitleStrategy + consolidate spaces card onto list ([78260d3](https://github.com/sneat-co/sneat-libs/commit/78260d3))

### ❤️ Thank You

- Alexander Trakhimenok
- Claude Opus 4.8

## 0.6.1 (2026-06-17)

### 🩹 Fixes

- **space-components:** make SpacesCardComponent signal-based so it repaints on record load ([eb9af75](https://github.com/sneat-co/sneat-libs/commit/eb9af75))

### ❤️ Thank You

- Alexander Trakhimenok
- Claude Opus 4.8

## 0.6.0 (2026-06-17)

### 🚀 Features

- **auth-ui:** show "already signed in as X" panel on login page ([7ee7979](https://github.com/sneat-co/sneat-libs/commit/7ee7979))

### ❤️ Thank You

- Alexander Trakhimenok
- Claude Opus 4.8

## 0.5.4 (2026-06-17)

### 🚀 Features

- **auth:** add signInMethod (popup|redirect) to environment config ([e5af38a](https://github.com/sneat-co/sneat-libs/commit/e5af38a))

### ❤️ Thank You

- Alexander Trakhimenok
- Claude Opus 4.8

## 0.5.3 (2026-06-17)

### 🩹 Fixes

- **app:** complete pending signInWithRedirect at startup ([eed04ba](https://github.com/sneat-co/sneat-libs/commit/eed04ba))

### ❤️ Thank You

- Alexander Trakhimenok
- Claude Opus 4.8

## 0.5.2 (2026-06-16)

### 🩹 Fixes

- **app:** forget current space when an authenticated user leaves spaces ([f09a3c2](https://github.com/sneat-co/sneat-libs/commit/f09a3c2))

### ❤️ Thank You

- Alexander Trakhimenok
- Claude Opus 4.8

## 0.5.1 (2026-06-16)

### 🩹 Fixes

- **auth-ui:** restore current space after login ([47fe63a](https://github.com/sneat-co/sneat-libs/commit/47fe63a))

### ❤️ Thank You

- Alexander Trakhimenok
- Claude Opus 4.8

## 0.4.0 (2026-04-08)

This was a version bump only, there were no code changes.

## 0.3.0 (2026-03-04)

### 🚀 Features

- add wizard, contactus-internal, ext-calendarius-shared, ext-calendarius-main libs ([47d6e46](https://github.com/sneat-co/sneat-libs/commit/47d6e46))

### ❤️ Thank You

- Alexander Trakhimenok
- Claude Sonnet 4.6

## 0.2.0 (2026-03-04)

### 🚀 Features

- add 7 new @sneat/* libs (assetus, calendarius, contactus-services, app, space-components, contactus-shared) ([ea491d9](https://github.com/sneat-co/sneat-libs/commit/ea491d9))

### ❤️ Thank You

- Alexander Trakhimenok
- Claude Sonnet 4.6

## 0.1.6 (2026-03-04)

### 🩹 Fixes

- e2e verify fixed CI release pipeline publishes correct dist ([1fb0575](https://github.com/sneat-co/sneat-libs/commit/1fb0575))
- **ci:** remove pre-build step that caused stale cache during release ([7c4267c](https://github.com/sneat-co/sneat-libs/commit/7c4267c))

### ❤️ Thank You

- Alexander Trakhimenok

## 0.1.5 (2026-03-04)

### 🩹 Fixes

- trigger e2e publish verification ([4c13df9](https://github.com/sneat-co/sneat-libs/commit/4c13df9))
- trigger e2e publish verification ([8236ae4](https://github.com/sneat-co/sneat-libs/commit/8236ae4))

### ❤️ Thank You

- Alexander Trakhimenok

## 0.1.4 (2026-03-03)

### 🩹 Fixes

- **build:** use partial compilation mode for publishable libs ([9cfee0f](https://github.com/sneat-co/sneat-libs/commit/9cfee0f))

### ❤️ Thank You

- Alexander Trakhimenok
- Claude Sonnet 4.6

## 0.1.3 (2026-03-03)

### 🩹 Fixes

- **release:** pull --rebase before push to avoid race with concurrent commits ([6abd4d4](https://github.com/sneat-co/sneat-libs/commit/6abd4d4))
- **release:** publish from dist/, add scss assets to components ([4c2bf19](https://github.com/sneat-co/sneat-libs/commit/4c2bf19))

### ❤️ Thank You

- Alexander Trakhimenok
- Claude Sonnet 4.6

## 0.1.2 (2026-03-03)

### 🩹 Fixes

- **logging:** rename anaylytics directory to analytics (typo fix) ([86fcf2f](https://github.com/sneat-co/sneat-libs/commit/86fcf2f))
- **release:** split release steps so git push precedes npm publish ([e405df2](https://github.com/sneat-co/sneat-libs/commit/e405df2))
- **release:** use --skip-publish to ensure git push before npm publish ([0bcfb45](https://github.com/sneat-co/sneat-libs/commit/0bcfb45))
- **release:** --yes and --skip-publish are mutually exclusive, drop --yes ([e3f750a](https://github.com/sneat-co/sneat-libs/commit/e3f750a))
- **release:** configure git push so version tags are pushed after release ([ef79e2a](https://github.com/sneat-co/sneat-libs/commit/ef79e2a))
- **release:** add --git-push flag so version tag is pushed to GitHub ([e90c7c5](https://github.com/sneat-co/sneat-libs/commit/e90c7c5))
- **release:** replace --git-push flag with explicit git push step ([4bf80d1](https://github.com/sneat-co/sneat-libs/commit/4bf80d1))

### ❤️ Thank You

- Alexander Trakhimenok
- Claude Sonnet 4.6