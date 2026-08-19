# Frontend Apps & Packages

An extension frontend consists of a separately owned contract, one host-facing
runtime package, an optional reusable UI package, and a standalone Ionic app used
as its end-to-end harness.

## Package model

| Artifact | Package | Home | Purpose |
| --- | --- | --- | --- |
| Contract | `@sneat/extension-<id>-contract` | `sneat-co/ext-<id>` | Public types, DTOs, tokens and interfaces. |
| Runtime | `@sneat/extension-<id>` | `<id>/frontend/libs/extensions/<id>/runtime` | Providers, routes, pages and implementations used by host apps. |
| UI | `@sneat/extension-<id>-ui` | `<id>/frontend/libs/extensions/<id>/ui` | Optional components/pipes intentionally reused by other source libraries. |

The contract and runtime are required. Create the UI package only after another
extension or app library needs reusable UI. Otherwise pages and components stay in
runtime; speculative packages are not generated.

Every publishable package has `publishConfig.access=public`. Runtime plus UI form a
fixed Nx release group and share a version. The contract repository releases
independently and first.

## Runtime public API

Although runtime is a public npm package, it is an application integration surface,
not a sibling-extension API. Its root entrypoint exports only:

- `provide<Name>(): Provider[]`,
- the extension route definitions,
- documented host registration metadata when needed.

Concrete services, pages and private components are not exported. Only application
bootstrap and application routing may import another extension's runtime package.
Libraries call extension behaviour through contract tokens.

```ts
// libs/extensions/<id>/runtime/src/lib/provide-<id>.ts
export function provide<Name>(): Provider[] {
  return [
    FooService,
    { provide: FOO_SERVICE, useExisting: FooService },
    BarService,
    { provide: BAR_SERVICE, useExisting: BarService },
  ];
}
```

Heavy route-only capabilities use route-scoped providers so activating an unrelated
route does not instantiate them:

```ts
export const nameRoutes: Route[] = [
  {
    path: 'feature/:id',
    providers: [...provideNameFeature()],
    loadComponent: () =>
      import('./pages/feature/feature-page.component').then(
        (m) => m.FeaturePageComponent,
      ),
  },
];
```

## Optional UI package

UI may depend on foundational UI packages, contracts and explicitly approved UI
packages. It never imports runtime. Behaviour required by reusable components is
injected through contract tokens.

Keep its public API explicit. Do not recursively export folders or expose internal
base classes merely because they are convenient inside the extension.

## Boundary enforcement

Nx tags protect local projects:

- `domain:<id>` identifies ownership,
- `layer:contract|ui|runtime|app|e2e` identifies dependency weight.

Nx does not see the projects behind installed npm packages. Each workspace must also
lint package patterns so library files cannot import:

- another extension's unsuffixed runtime package,
- any legacy `@sneat/extension-*-internal` package,
- legacy concrete service packages such as `@sneat/contactus-services`.

App bootstrap and app route files are the explicit exception.

## Standalone app

Every extension has an Ionic application and Playwright project:

```text
frontend/apps/
├── <id>-app/
└── <id>-app-e2e/
```

The app imports `provide<Name>()` and routes from the runtime and provides the real
contract implementation. It is both a standalone product surface and the extension's
end-to-end harness.

## Release verification

Before publishing, CI must build and pack each package, compare emitted external
imports with the package manifest, install the tarballs in a clean Angular consumer,
and run a production build. This catches dependency metadata errors that a monorepo
source build can hide.

## Common Nx tasks

```bash
pnpm nx serve <id>-app
pnpm nx e2e <id>-app-e2e
pnpm nx build ext-<id>-runtime
pnpm nx build ext-<id>-ui       # when present
pnpm nx run-many -t lint test build
```

New workspaces use Nx 22, Angular 21, Ionic 8 and pnpm.
