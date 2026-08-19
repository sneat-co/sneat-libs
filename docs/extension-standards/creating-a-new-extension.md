# Creating a New Extension

Every extension is represented by two repositories:

- `sneat-co/<id>` — implementation, runtime, optional UI and standalone app,
- `sneat-co/ext-<id>` — the frozen frontend/backend contract surface.

## Implementation repository

Create `sneat-co/<id>` from `sneat-ext-template`, then run:

```bash
./customize.sh <id>
pnpm install
pnpm nx run-many -t lint test build
pnpm nx e2e <id>-app-e2e
```

The template contains:

- `<id>-app` and `<id>-app-e2e`,
- `@sneat/extension-<id>` as the required runtime package,
- no duplicate contract source,
- no UI package by default.

Add `libs/extensions/<id>/ui` and publish
`@sneat/extension-<id>-ui` only when an external source library has a concrete
reusable-UI requirement.

## Contract repository

Create `sneat-co/ext-<id>` from `sneat-ext-contract-template`. It is the only publisher of
`@sneat/extension-<id>-contract` and the corresponding Go contract. The
implementation repository consumes the published contract and never mirrors or
re-declares it.

Release contract changes first, then bump and release the implementation packages.

## Naming

- repositories: `<id>` and `ext-<id>`,
- app projects: `<id>-app` and `<id>-app-e2e`,
- runtime project/package: `ext-<id>-runtime` / `@sneat/extension-<id>`,
- optional UI project/package: `ext-<id>-ui` / `@sneat/extension-<id>-ui`,
- contract project/package: `ext-<id>-contract` / `@sneat/extension-<id>-contract`,
- backend route prefix: `/v0/api4<id>/`.

See [frontend-apps.md](./frontend-apps.md) for boundaries and release checks and
[backend-wiring.md](./backend-wiring.md) for backend integration.
