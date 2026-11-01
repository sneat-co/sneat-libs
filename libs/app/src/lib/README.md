# Initialization of Firebase

## Optional native integration

`SplashScreen` and `StatusBar` are public Angular injection tokens owned by
`@sneat/app`. A host may supply objects implementing `hide()` and
`styleDefault()` respectively. They are optional: the app initializes without
either provider. The library does not import the legacy Ionic Native packages
and does not require their RxJS 5/6 peer graph. Removing those unused manifest
peers preserves the tokens and supplied-plugin behavior.
