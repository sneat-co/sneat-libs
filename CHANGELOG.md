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

- add wizard, contactus-internal, ext-schedulus-shared, ext-schedulus-main libs ([47d6e46](https://github.com/sneat-co/sneat-libs/commit/47d6e46))

### ❤️ Thank You

- Alexander Trakhimenok
- Claude Sonnet 4.6

## 0.2.0 (2026-03-04)

### 🚀 Features

- add 7 new @sneat/* libs (assetus, schedulus, contactus-services, app, space-components, contactus-shared) ([ea491d9](https://github.com/sneat-co/sneat-libs/commit/ea491d9))

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