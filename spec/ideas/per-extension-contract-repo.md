---
format: https://specscore.md/idea-specification
status: Specified
---

# Idea: Per-extension contract repo (<name>-ext)

**Status:** Specified
**Date:** 2026-06-21
**Owner:** alexandertrakhimenok
**Promotes To:** contactus-ext, extension-contract-repo
**Supersedes:** —
**Related Ideas:** extends:cross-extension-interaction

## Problem Statement

How might we let one extension (or the app) depend on another extension's contract without inheriting that extension's release cadence, its build/dependency weight, or risking cross-extension dependency cycles?

## Context

Builds on the Stable extension-library-architecture convention (in-repo contract/shared/internal three-lib split) and the contactus repo extraction (contactus-repo-extraction-plan). The backend already pioneered a partial version of this during the contactus cycle-break: contactus's own data/const shapes (briefs4contactus, const4contactus) were placed in the shared sneat-core-modules/contactusmodels package, and cross-module contributor interfaces (ContactusSpaceContributor, ContactusCountryUpdater, ContactusAccess) were left consumer-owned in the sibling facades. There is no sanctioned, uniform convention for where an extension's contract lives once the extension is its own repo, so the contract surface is scattered (some in sneat-core-modules, some in sibling modules, some in the main repo) rather than in one small, stable, per-extension home.

## Recommended Direction

Extract each extension's public contract surface into a dedicated, dependency-light repo sneat-co/<name>-ext, polyglot like the main extension repo (backend/ Go module + frontend/ nx contract lib). The load-bearing invariant: <name>-ext depends only on foundational/core types, never another extension. That invariant doubles as the ownership test deciding what may live there: an interface or type belongs in <name>-ext only if its entire signature is expressible in that extension's own types plus foundational/core types; if a signature references a consumer's types it is the consumer's contract and stays consumer-owned. Two interaction directions, both interfaces living in <name>-ext: call-into-the-extension (facade interface + DTOs; the main repo provides the impl, wired at bootstrap; consumers import down and call) and extension-needs-something-from-the-caller (callback interface; the consumer satisfies it and passes it in).

## Alternatives Considered

- **Keep the contract inside the main extension repo** (the status quo that `contactus-repo-extraction-plan` assumed — `<name>/frontend/libs/.../contract` + a backend contract package in `<name>/backend`). Simplest ownership story, but it leaves all three pains unsolved: consumers pin to the heavy main repo's releases (1), pull its full build/dependency graph to use a type (2), and any `sibling ↔ extension` need still risks a module-level cycle (3). Lost: the whole point is a dependency-light surface that the heavy repo can't be.
- **One shared contracts monorepo for all extensions** (`sneat-ext-contracts`, or the existing `sneat-core-modules` pattern the backend drifted into). One repo to depend on, contracts version together. But ownership blurs (who owns `IContactSelector` when it lives outside contactus?), it grows into a God-lib every change must touch, and it couples unrelated extensions' release cadence. Demoted to: cross-cutting primitives only, which already live in `sneat-libs`/`sneat-core` — not an extension's own capability surface.
- **Hybrid (per-extension repos + a shared cross-cutting repo)** — viable, but a shared *contract* repo is unnecessary today: cross-cutting primitives already have a home. Folded into the recommended direction as "add the shared repo only when a genuinely homeless cross-cutting primitive appears."
- **Literal-100% re-homing** (force every interface, including bilateral ones, into `<name>-ext`). Rejected because a bilateral interface like `ContactusAccess` references the consumers' own types (`facade4invitus.MemberContact`, `dbo4spaceus.SpaceEntry`); moving it would make `<name>-ext` import siblings, breaking the zero-other-extension-deps invariant that the whole idea rests on. The invariant itself is the test that keeps such interfaces consumer-owned.

## MVP Scope

contactus as the reference, explicitly iterative ('right direction', not one-shot completeness): create sneat-co/contactus-ext; relocate contactusmodels out of sneat-core-modules and the frontend extension-contactus-contract lib out of the main repo into it; re-home contributor interfaces that pass the ownership test (ContactusSpaceContributor) while leaving genuinely-bilateral ones (ContactusAccess, which speaks invitus/spaceus types) consumer-owned; repoint siblings, app, and sneat-apps onto the relocated packages; sequence releases so the contract repo tags first.

## Not Doing (and Why)

- Literal-100% re-homing of every interface into <name>-ext — breaks the zero-other-extension-deps invariant for genuinely-bilateral interfaces
- Refactoring bilateral contributor signatures (ContactusAccess) to stop referencing consumer types right now — a separate, deeper refactor
- Rewriting every extension's contract in one pass — adopt incrementally, contactus first as the reference template
- A runtime plugin-discovery/registry framework — keep explicit DI tokens (frontend) and bootstrap registration (backend)
- Moving cross-cutting primitives — they already have a home in sneat-libs/sneat-core and stay there

## Key Assumptions to Validate

| Tier | Assumption | How to validate |
|------|------------|-----------------|
| Must-be-true | An extension's contract surface can be expressed with zero dependencies on any other extension (only its own + foundational/core types), so `<name>-ext` never imports a sibling and `sibling → <name>-ext` is always cycle-free. | Build `contactus-ext` and inspect its module graph: confirm it imports only core (`sneat-go-core`, core-model packages) and its own types, no `@sneat/extension-*` or `sneat-core-modules/<sibling>` impl. |
| Must-be-true | Every interface can be cleanly classified by the ownership test (signature expressible in own+core types → belongs in `<name>-ext`; references a consumer's types → stays consumer-owned), with no large ambiguous middle. | Classify all current contactus contributor interfaces (`ContactusSpaceContributor`, `ContactusCountryUpdater`, `ContactusAccess`, linkage `DboFactory`) against the test; confirm each lands clearly on one side. |
| Should-be-true | The main extension repo and siblings can depend on the published `<name>-ext` (npm package + Go module) without a coordinated big-bang release — release ordering (contract tags first, then consumers) is workable. | Tag `contactus-ext`, bump `contactus` main repo + one sibling onto it, confirm both build green in dependency order. |
| Should-be-true | The app layer (each app + `sneat-apps`) can wire the facade providers once at bootstrap (frontend DI token; backend registration) with no per-feature plumbing, preserving current behaviour. | Wire contactus facade providers from `contactus-ext` interfaces in `sneat-apps`; verify the contact flows work identically. |
| Might-be-true | Most extension contract surface is the cleanly-relocatable kind (own data/const/DTO + facade interfaces), so the consumer-owned bilateral residue stays small. | Inventory contactus: count interfaces/types that pass the test vs. those that stay consumer-owned. |


## SpecScore Integration

- **New Features this would create (proposed, to specify after approval):**
  - (a) **`<name>-ext` contract-repo convention** — the repo shape (polyglot `backend/`+`frontend/`), the zero-other-extension-deps invariant, the ownership test, and the two interaction directions. The cross-repo analogue of `extension-library-architecture`.
  - (b) **contactus reference extraction** — stand up `contactus-ext`, relocate `contactusmodels` + the frontend contract lib, re-home test-passing contributor interfaces, repoint consumers. Proves the convention end-to-end.
- **Existing Features affected:**
  - `extension-library-architecture` (Stable) — this Idea answers its Open Question "Does contactus move to its own dedicated repo … whether `*-contract`/`*-shared` become published packages vs in-repo libs." The contract tier becomes a published, separately-released `<name>-ext` package rather than an in-repo lib. The three-tier split itself is unchanged; only the contract tier's *home* changes.
- **Dependencies / prior art:** `contactus-repo-extraction-plan` (Workstream A frontend move + Workstream B backend cycle-break); the consumer-owned contributor interfaces produced by that cycle-break are the input this Idea reclassifies.
- **Spec home vs work boundary:** the spec lineage lives in `sneat-libs/spec` (continuation of `cross-extension-interaction` → `extension-library-architecture`); the *work* spans `sneat-core-modules`, each `<name>` and new `<name>-ext` repo, and `sneat-apps`.

## Open Questions

- Backend module path for the contract repo: `github.com/sneat-co/<name>-ext/backend` (mirrors the main repo's `<name>/backend`) vs. repo-root module. Frontend keeps the established npm name `@sneat/extension-<name>-contract`.
- Naming: is `<name>-ext` the right repo suffix, or `<name>-contract`? `-ext` reads as "the extension's public face"; `-contract` is more literal but collides with the frontend lib's `-contract` suffix.
- Does `contactusmodels` relocate as-is (package name and import path change only) or get reorganized while it moves? Prefer as-is to keep the move history-preserving and low-risk.
- When the genuinely-bilateral residue (`ContactusAccess`) is eventually cleaned up, does that become its own follow-up Feature, or is it permanently consumer-owned by design? (Deferred; does not block the convention.)
