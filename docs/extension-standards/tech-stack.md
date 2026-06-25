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
  dependency graph acyclic (enforced in `*-ext` repos by
  `scripts/check-no-extension-deps.sh`).

## Frontend — Nx · Angular · Ionic

- **Stack:** **Nx 22 · Angular 21 · Ionic 8 · pnpm.**
- **Library tiers** (extension-library-architecture convention):
  - `@sneat/extension-<id>-contract` — the public contract surface (types/tokens).
  - `@sneat/extension-<id>-shared` — shared components/services for the extension.
  - `@sneat/extension-<id>-internal` — internals not meant for reuse.
- **Standalone app:** every extension ships an Nx app named **`<ext-id>-app`**
  (the Ionic shell) plus **`<ext-id>-app-e2e`** for end-to-end tests. See
  [`frontend-apps.md`](./frontend-apps.md).
- **UX:** follow [`frontend-ux/`](./frontend-ux/README.md).

## Contract — TypeSpec

- The `*.tsp` files in the `*-ext` repo's `typespec/` dir are the **frozen wire
  contract and the single source of truth.**
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
| Contract | TypeSpec (`.tsp`, no emitters) | `<ext>-ext/typespec/` |
