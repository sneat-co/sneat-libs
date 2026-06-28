# Sneat Extension Standards

The tech stack, wiring conventions, and UX practices that **Sneat extensions**
follow. Specs and plans link here; 1st-party and 3rd-party / contributor
extension developers build against it.

> A **Sneat extension** is a self-contained vertical (e.g. `eventus`, `listus`,
> `contactus`, `gameboard`) that plugs into the Sneat platform. Its public
> contract surface lives in a `*-ext` repo (see
> [`extension-contract-repo`](../../spec/features/extension-contract-repo/README.md)),
> its Go backend is wired into [`sneat-go`](https://github.com/sneat-co/sneat-go),
> and its Angular/Ionic frontend ships as `@sneat/extension-<id>-*` libraries
> plus a standalone app.

## The three pillars

| Pillar | Standard | Doc |
| --- | --- | --- |
| **Backend** | Go impl in the extension's own `backend/` module, wired into `sneat-go` at fixed injection points | [`backend-wiring.md`](./backend-wiring.md) |
| **Frontend** | Nx + Angular + Ionic; tier libraries + a mandatory `<ext-id>-app` standalone e2e app | [`frontend-apps.md`](./frontend-apps.md) |
| **UX** | House conventions for cards, buttons, lists, page layout, forms, modals, and states (in `sneat-specs`) | [`frontend-ux/`](./frontend-ux/README.md) → [sneat-specs](https://github.com/sneat-co/sneat-specs/blob/main/standards/frontend-ux/README.md) |

## Contents

- [`creating-a-new-extension.md`](./creating-a-new-extension.md) — scaffold a new
  extension from `sneat-ext-template`.
- [`tech-stack.md`](./tech-stack.md) — the full stack at a glance (backend,
  frontend, TypeSpec contract).
- [`backend-wiring.md`](./backend-wiring.md) — how to wire an extension backend
  into `sneat-go`, with the exact injection points.
- [`frontend-apps.md`](./frontend-apps.md) — Nx library tiers and the
  `<ext-id>-app` e2e harness.
- [`frontend-ux/`](./frontend-ux/README.md) — UX standards (now in `sneat-specs`):
  cards, buttons, lists, page layout, forms, modals, and loading/empty/error states.

## Related conventions (in this repo)

- [`extension-contract-repo`](../../spec/features/extension-contract-repo/README.md)
  — the frozen cross-repo contract surface (`*-ext`).
- [`extension-library-architecture`](../../spec/features/extension-library-architecture/README.md)
  — the `contract` / `shared` / `internal` library tiers.
- [`docs/howto/publish-sneat-extension.md`](https://github.com/sneat-co/backstage/blob/main/docs/howto/publish-sneat-extension.md)
  (backstage) — publishing an extension library to npm.
