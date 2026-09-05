# Sneat Extension Standards

The tech stack, wiring conventions, and UX practices that **Sneat extensions**
follow. Specs and plans link here; 1st-party and 3rd-party / contributor
extension developers build against it.

> A **Sneat extension** is a self-contained vertical (e.g. `eventus`, `listus`,
> `contactus`, `gameboard`) that plugs into the Sneat platform. Its public
> contract surface lives in the `sneat-ext-contracts` monorepo by default (see
> [Contract home](#contract-home) below), its Go backend is wired into
> [`sneat-go`](https://github.com/sneat-co/sneat-go), and its Angular/Ionic
> frontend ships as a runtime package, an optional reusable UI package, and a
> standalone app.

## Contract home

**Default: a `libs/<family>/` contract inside the
[`sneat-ext-contracts`](https://github.com/sneat-co/sneat-ext-contracts)
monorepo.** Every `@sneat/extension-<id>-contract` npm package — and, once
armed for that family, the matching Go contract module — lives there as one
sibling among many, versioned independently per family via Nx version plans,
with the Go module kept in lockstep on the same version number as its npm
package. See that repo's own
[README](https://github.com/sneat-co/sneat-ext-contracts/blob/main/README.md)
for the contract-author ritual (clone the monorepo, edit one contract lib,
add an Nx version plan naming that project and its bump, open one PR; CI
enforces boundary rules, peer-range strictness and the tier-coherence check;
merging publishes only the projects named in the merged version plans) and
its module-boundary map (`docs/boundaries.md`). Full rationale and the
phased migration plan live in
[`ext-contracts-monorepo`](../../spec/features/ext-contracts-monorepo/README.md).

### Exception: standalone `ext-<name>` repo — only by explicit founder decision

A dedicated `sneat-co/ext-<id>` repo (polyglot `backend/` Go module +
`frontend/` Nx lib, scaffolded from `sneat-ext-contract-template`) remains an
**allowed** contract home, but only when the founder explicitly decides it —
for example external collaboration on the contract, distinct licensing, or
unusual scale that doesn't fit the monorepo's shared pipeline. Absent that
decision, do not create a new `ext-<id>` repo; the contract goes into
`sneat-ext-contracts` instead. The repo shape, naming, zero-other-extension-
deps invariant and independent-release rules for this exception case are
frozen in
[`extension-contract-repo`](../../spec/features/extension-contract-repo/README.md) —
superseded as the *default* home by `ext-contracts-monorepo`, but retained as
the normative reference for what a standalone contract repo must look like
when the founder chooses that path.

Both homes share the same **ownership test** — a type belongs in the
contract only if its entire signature is expressible in that extension's own
types plus foundational/core types — and the same two **cross-extension
interaction directions** — facade-call-in (the extension implements, the
consumer calls through the contract) and caller-satisfied-callback (the
consumer implements, the extension calls back through the contract). Both
rules apply identically whichever home the contract lives in.

## The three pillars

| Pillar | Standard | Doc |
| --- | --- | --- |
| **Backend** | Go impl in the extension's own `backend/` module, wired into `sneat-go` at fixed injection points | [`backend-wiring.md`](./backend-wiring.md) |
| **Frontend** | Nx + Angular + Ionic; required runtime, optional reusable UI, and a mandatory `<ext-id>-app` standalone e2e app | [`frontend-apps.md`](./frontend-apps.md) |
| **UX** | House conventions for cards, buttons, lists, page layout, forms, modals, and states (in `sneat-specs`) | [`frontend-ux/`](./frontend-ux/README.md) → [sneat-specs](https://github.com/sneat-co/sneat-specs/blob/main/standards/frontend-ux/README.md) |

## Contents

- [`creating-a-new-extension.md`](./creating-a-new-extension.md) — scaffold a new
  extension from `sneat-ext-template`.
- [`tech-stack.md`](./tech-stack.md) — the full stack at a glance (backend,
  frontend, TypeSpec contract).
- [`backend-wiring.md`](./backend-wiring.md) — how to wire an extension backend
  into `sneat-go`, with the exact injection points.
- [`frontend-apps.md`](./frontend-apps.md) — frontend packages, boundaries and the
  `<ext-id>-app` e2e harness.
- [`routing-and-deployment.md`](./routing-and-deployment.md) — the root-mounted
  app + locale-prefixed content URL scheme, edge (Cloudflare Worker) routing,
  and the combined landing+app distribution.
- [`frontend-ux/`](./frontend-ux/README.md) — UX standards (now in `sneat-specs`):
  cards, buttons, lists, page layout, forms, modals, and loading/empty/error states.

## Related conventions (in this repo)

- [`ext-contracts-monorepo`](../../spec/features/ext-contracts-monorepo/README.md)
  — the default contract home: the consolidated `sneat-ext-contracts` repo,
  per-contract independent versioning, and the migration plan off the old
  per-repo convention.
- [`extension-contract-repo`](../../spec/features/extension-contract-repo/README.md)
  — the standalone `ext-<id>` repo shape, retained as the normative reference
  for the explicit-founder-decision exception case.
- [`extension-library-architecture`](../../spec/features/extension-library-architecture/README.md)
  — the required `contract` / `runtime` and optional `ui` package model.
- [`docs/howto/publish-sneat-extension.md`](https://github.com/sneat-co/backstage/blob/main/docs/howto/publish-sneat-extension.md)
  (backstage) — publishing an extension library to npm.
