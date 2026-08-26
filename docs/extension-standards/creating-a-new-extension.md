# Creating a New Extension

Every extension is represented by an implementation repository plus a
contract surface. By default the contract is a family inside the shared
`sneat-ext-contracts` monorepo, not its own repository:

- `sneat-co/<id>` — implementation, runtime, optional UI and standalone app,
- `libs/<id>/` (npm) and `<id>/` (Go, once armed) in `sneat-co/sneat-ext-contracts`
  — the frontend/backend contract surface (default home; see
  [Contract repository](#contract-repository) below for the standalone-repo
  exception, `sneat-co/ext-<id>`).

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

**Default: add `<id>` as a new family to `sneat-co/sneat-ext-contracts`.**
Clone that monorepo, add `libs/<id>/` as an Nx project publishing
`@sneat/extension-<id>-contract` (and `<id>/go.mod` for the Go contract, once
the Go leg is armed for new families), add an Nx version plan, and open one
PR there. It is the only publisher of `@sneat/extension-<id>-contract` and
the corresponding Go contract. The implementation repository consumes the
published contract and never mirrors or re-declares it. See that monorepo's
own README for the exact contract-author ritual and
[`ext-contracts-monorepo`](../../spec/features/ext-contracts-monorepo/README.md)
for the full rationale.

Release contract changes first, then bump and release the implementation packages.

### Exception: standalone `ext-<id>` repo

Only when the founder has explicitly decided a standalone repo for this
extension (external collaboration, distinct licensing, or unusual scale),
create `sneat-co/ext-<id>` from `sneat-ext-contract-template` instead. The
repo shape, naming and invariants for that case are frozen in
[`extension-contract-repo`](../../spec/features/extension-contract-repo/README.md).
Absent that explicit decision, use the monorepo default above.

## Naming

- repositories: `<id>` and, only under the standalone exception, `ext-<id>`,
- app projects: `<id>-app` and `<id>-app-e2e`,
- runtime project/package: `ext-<id>-runtime` / `@sneat/extension-<id>`,
- optional UI project/package: `ext-<id>-ui` / `@sneat/extension-<id>-ui`,
- contract project/package: `<id>-contract` (Nx project name in
  `sneat-ext-contracts`, or `ext-<id>-contract` under the standalone
  exception) / `@sneat/extension-<id>-contract` (npm package name unchanged
  either way),
- backend route prefix: `/v0/api4<id>/`.

See [frontend-apps.md](./frontend-apps.md) for boundaries and release checks and
[backend-wiring.md](./backend-wiring.md) for backend integration.
