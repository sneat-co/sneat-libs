---
format: https://specscore.md/idea-specification
status: Draft
---

# Idea: Cross-extension interaction without circular dependencies

**Status:** Draft
**Date:** 2026-06-19
**Owner:** alexander.trakhimenok
**Promotes To:** —
**Supersedes:** —
**Related Ideas:** —

## Problem Statement

How might we let one extension invoke another's behaviour (e.g. open a contact-picker dialog and get a result) without the two extensions importing each other, creating circular dependencies or the prebuilt-bundle peer-resolution wall?

## Context

Triggering observation: during the legacy-assetus frontend retirement (tracking `sneat-co/assetus#4`), `contactus` (a library in `sneat-libs`) imported the **runtime** `AssetService` / `AssetusCoreServicesModule` from the published `@sneat/extension-assetus`. That broke `sneat-libs` CI:

```
Error: Cannot find package '.../@sneat/space-models/index.js'
  imported from '.../@sneat/extension-assetus/fesm2022/sneat-extension-assetus.mjs'
```

Two distinct problems were exposed by that single import:

1. **Circular dependency.** `@sneat/extension-assetus` peer-depends on `@sneat/contactus-services`, while `contactus` reached back into assetus — the assetus↔contactus cycle the retirement plan's §5-B explicitly warned to avoid.
2. **Prebuilt-bundle peer-resolution wall.** A published Angular library ships a prebuilt `fesm2022/*.mjs` whose peer imports (`import '@sneat/space-models'`, …) must resolve to *installed* packages. In `sneat-libs` those peers are workspace **source** libs, not installed packages, so the bundle can't load at runtime/test. (The super-app `sneat-apps` is fine — it installs all `@sneat/*` as real packages.)

The retirement was unblocked with a tactical fix (documented in `sneat-co/assetus#9`): make `contactus` import `IAssetContext` as a **type only** (erased at compile time → bundle never loads) and re-implement the asset-watch with an in-repo service. That works, but it is a workaround for a missing, reusable pattern. This idea proposes the durable design so the next cross-extension call (open a dialog, fetch data, react to an event) has a sanctioned path.

Prior art: classic ports-and-adapters / dependency-inversion, Angular `InjectionToken` providers, and nx module-boundary tags.

## Recommended Direction

Adopt one guiding rule: **extensions never depend *sideways* on each other's implementations; they share *types* freely and call each other's *behaviour* through abstractions that live in a neutral layer below them.** Dependencies always point "down" to shared layers, turning the graph into a DAG.

Three reinforcing mechanisms:

1. **Layer every extension into tiers** — `*-core` (types/DTOs/enums, no Angular), `*-services` (data access), `*-ui`/`*-components` (dialogs, pages). Cross-extension references may touch only `*-core`, and only as `import type`. (This is the user's "core contactus vs extended contactus" instinct; `contactus` already partly has `-core`/`-services`/`-shared`/`-internal`.)
2. **Dependency-inversion via injection tokens for runtime calls.** Put the contract (interface + `InjectionToken`) in a neutral low-level lib both sides depend *down* on (e.g. `@sneat/extensions-contracts`). The provider extension supplies the concrete implementation at app bootstrap; the caller injects the interface and never imports the provider. Example: a `CONTACT_SELECTOR` token + `IContactSelector` interface; `contactus-ui` provides the dialog, `assetus` injects and calls `selectContact()`. No cycle, no fesm wall (the heavy dialog is wired and lazy-loaded by the app, where peers resolve).
3. **Enforce the rule mechanically with nx module-boundary tags** — a `scope:extension` project may `import type` from another `scope:extension`, but any *runtime* cross-extension import is a lint error unless it goes through `scope:contracts`. This turns tribal knowledge into a CI gate.

A typed **extension bus** (mediator in the neutral lib) and **route-based invocation** are complementary tools layered on top for many-to-many events and full-page hops respectively — added only when a real need appears.

## Alternatives Considered

- **Typed event bus only** (`bus.request('contactus.selectContact', …)`): maximum decoupling and great for events, but weaker compile-time safety (string message names) and harder to navigate. Lost as the *default* — better as a complement for many-to-many/event cases than for known, typed, value-returning calls.
- **Routing-only contract** (navigate to the other extension's page): zero code coupling, but awkward for inline dialogs that must return a value. Kept for page-level flows, not as the general answer.
- **Make the prebuilt bundle's peers resolvable inside `sneat-libs`** (build + map the 8 peer libs for tests): brittle, fights the source-mapped workspace model, and doesn't address the questionable foundational-lib→app-extension dependency. Rejected.
- **Merge everything into one workspace** to dodge published-bundle resolution: throws away the independent-extension/publishing model. Rejected.

## MVP Scope

Prove the pattern end-to-end on the one real case we just touched: create `@sneat/extensions-contracts` holding a `CONTACT_SELECTOR` injection token + `IContactSelector` interface, have `contactus-ui` provide the concrete picker, and refactor the assetus↔contactus link to call it through the token (replacing the tactical in-repo workaround). One capability, one provider, one consumer, wired by the app — enough to validate that the cycle and the fesm wall both disappear and that DI + tests stay clean. Layering cleanup and the nx lint rule follow once the pattern is proven.

## Not Doing (and Why)

- A runtime plugin-discovery/registry framework — start with explicit DI tokens
- Rewriting existing extensions in one pass — adopt incrementally, contactus↔assetus first
- A typed extension bus and route-contract conventions — deferred until a real many-to-many / page-hop case needs them; the MVP is the token pattern only

## Key Assumptions to Validate

| Tier | Assumption | How to validate |
|------|------------|-----------------|
| Must-be-true | A neutral `extensions-contracts` lib can hold the interfaces/tokens without itself depending on any extension (no new cycle). | Build the lib; confirm its only deps are `@sneat/*-core`/types and Angular DI primitives. |
| Must-be-true | An extension injecting a token never loads the provider's prebuilt bundle, so the fesm peer-resolution wall and the cycle both vanish. | Refactor assetus↔contactus to the token; confirm `sneat-libs` CI green with zero runtime cross-extension imports. |
| Should-be-true | The app layer (sneat-apps and each app) can wire providers once at bootstrap without per-feature plumbing, preserving current behaviour. | Wire `CONTACT_SELECTOR` in sneat-apps; verify the contact-picker flow works identically. |
| Should-be-true | nx module-boundary tags can express "type-only across extensions, runtime only via contracts". | Prototype the tag rule; confirm it flags a deliberate violating import and passes the compliant one. |
| Might-be-true | Most cross-extension traffic is hub-shaped (everything ↔ contactus), so a handful of tokens covers the bulk. | Inventory current/expected cross-extension calls. |

## SpecScore Integration

- **New Features this would create:** TBD at design time — likely (a) `extensions-contracts` neutral lib + token convention, (b) extension-tier layering rules, (c) nx module-boundary enforcement, (d) optional extension bus.
- **Existing Features affected:** the assetus↔contactus integration (currently the tactical type-only workaround).
- **Dependencies:** relates to `sneat-co/assetus#9` (type-only guideline) and `sneat-co/assetus#4` (retirement).

## Open Questions

- Which interaction shapes do we actually have today: (a) open-a-dialog-and-get-a-value, (b) cross-extension data fetch, (c) fire-and-forget events/reactions, (d) navigate-to-another-extension's-page? The mix decides how much of tokens vs bus vs routing we build.
- Is cross-extension traffic mostly a hub (everything ↔ contactus) or a denser web? A hub is much simpler to model with a few tokens.
- Does `contactus` move to its own dedicated repo (like assetus) or stay in `sneat-libs`? Doesn't change the pattern, but changes whether the tiers become published packages vs in-repo libs.
- Where does the neutral contracts lib live — a new `@sneat/extensions-contracts`, or an existing low-level lib (e.g. `space-models`)?
