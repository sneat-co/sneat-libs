# Tech Stack

The stack every Sneat extension is built on. Three layers: a **Go backend**, an
**Nx/Angular/Ionic frontend**, and a **TypeSpec wire contract** that keeps the
two in agreement.

## Backend — Go

- **Language:** Go. Runs on Google App Engine, Firestore via
  [`dalgo`](https://github.com/dal-go/dalgo), Firebase Authentication.
- **Where the impl lives:** the extension's **own repo**, in a `backend/` Go
  module (e.g. `github.com/sneat-co/eventus/backend/eventus`). The module exposes
  a `NewHandler(...)` constructor and a `Register(mux)` method — it never imports
  `sneat-go`.
- **How it reaches the platform:** a thin adapter in `sneat-go`
  (`pkg/modules/<ext>/module.go`) bridges core facades and mounts the handler.
  See [`backend-wiring.md`](./backend-wiring.md) for the exact injection points.
- **The load-bearing rule:** an extension backend depends **only on
  foundational/core code — never on another extension.** This keeps the
  dependency graph acyclic (enforced for each family's Go contract module in
  `sneat-ext-contracts`, or, under the standalone exception, in its `ext-*`
  repo by `scripts/check-no-extension-deps.sh`).

## Frontend — Nx · Angular · Ionic

- **Stack:** **Nx 22 · Angular 21 · Ionic 8 · pnpm.**
- **Packages** (extension-library-architecture convention):
  - `@sneat/extension-<id>-contract` — types/tokens, published only from one
    home: `libs/<id>/` in `sneat-ext-contracts` by default, or `ext-<id>`
    only by explicit founder decision (see
    [`extension-standards/README.md`](./README.md#contract-home)).
  - `@sneat/extension-<id>` — providers, routes and implementation for host apps.
  - `@sneat/extension-<id>-ui` — optional reusable components/pipes.
- **Standalone app:** every extension ships an Nx app named **`<ext-id>-app`**
  (the Ionic shell) plus **`<ext-id>-app-e2e`** for end-to-end tests. See
  [`frontend-apps.md`](./frontend-apps.md).
- **UX:** follow [`frontend-ux/`](./frontend-ux/README.md).

## Contract — TypeSpec

- The `*.tsp` files, alongside the contract's home, are the **frozen wire
  contract and the single source of truth**: `libs/<id>/typespec/` in
  `sneat-ext-contracts` by default, or `ext-<id>/typespec/` only under the
  standalone-repo exception (see
  [`extension-standards/README.md`](./README.md#contract-home)).
- **No emitters.** The Go (`backend/`) and TS (`frontend/`) sides
  **hand-implement matching types** against the `.tsp`. Parity / shape tests keep
  the two language bindings in agreement with the contract.
- This mirrors the established house convention (`eventus/typespec`,
  `sneat-go/typespec`, `gameboard-ext/typespec`).

## At a glance

| Layer | Tech | Home |
| --- | --- | --- |
| Backend | Go, GAE, Firestore (dalgo), Firebase Auth | `<ext>/backend/` + `sneat-go/pkg/modules/<ext>/` |
| Frontend | Nx 22, Angular 21, Ionic 8, pnpm | `<ext>/frontend/` (libs + `<ext-id>-app`) |
| Contract | TypeSpec (`.tsp`, no emitters) | `sneat-ext-contracts/libs/<id>/typespec/` (default), or `ext-<id>/typespec/` (standalone exception) |
