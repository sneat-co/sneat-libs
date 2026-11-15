---
__default__: patch
---

Switch the UI language in place: `@sneat/core` adds `SneatLanguageService` (a `lang` signal resolved from `?lang`, `sneat.lang`, then the browser, with the locale and Ionic button texts) and `provideSneatLanguage()`; `@sneat/ui` adds the `sneat-language-selector` menu; `@sneat/auth-ui`'s sign-in screens and menu item read typed label sets in English, Spanish, German, French, Portuguese (BR) and Russian. Apps stay English until they call `provideSneatLanguage()`.
