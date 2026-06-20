---
format: https://specscore.md/idea-specification
status: Specified
---

# Idea: Cross-extension interaction without circular dependencies

**Status:** Specified
**Date:** 2026-06-19
**Owner:** alexander.trakhimenok
**Promotes To:** extension-library-architecture
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

Adopt one guiding rule: **extensions never depend *sideways* on each other's implementations; each extension exposes a small public *contract*, and other extensions call it only through that contract — which lives in a lib light enough to depend on safely.** Dependencies point at *contracts* (and *shared* public code), never at *internal implementations*, turning the graph into a DAG.

**Recommended decomposition — three libs per extension (`*-contract` + `*-shared` + `*-internal`):**

1. **Split every extension into three libs by two orthogonal axes — *runtime weight* (the fesm wall) and *visibility* (who may import).**
   - **`extension-<name>-contract`** (public, runtime-light): pure TypeScript interfaces, DTO/model types, enums, and the Angular `InjectionToken`s for any behaviour the extension offers — **no** components, **no** service implementations, nothing that drags heavy `@sneat/*` runtime peers. Because it is runtime-light, any other extension can depend on it safely (type-only for the shapes; the token for runtime calls) with **no** prebuilt-bundle peer-resolution wall.
   - **`extension-<name>-shared`** (public, reusable *implementation*): the reusable components, pipes, and services other extensions may consume. It is heavy (real Angular peers), so it is kept separate from `-contract` — a consumer that only needs a token must not be forced to load this bundle. **It may import any `-contract` but never any `-internal`** (see the rule below); when a shared component needs a service, it injects it through a token defined in a `-contract`, not by importing the implementation.
   - **`extension-<name>-internal`** (private): the services, dialogs, pages and components that are this extension's own business. No other extension may import it — only the extension itself and the app (at bootstrap) consume it.
   - Cross-extension references therefore touch only the callee's `-contract` or `-shared`. Example: `extension-assetus-internal` depends on `extension-contactus-contract` (for `IContactSelector` + `CONTACT_SELECTOR`), **never** on `extension-contactus-internal`. The contract libs form their own DAG; there are no `internal → internal` edges, so no cycles and no fesm wall.
   - Naming rationale: `contract` names the runtime-light type/token surface; `shared` names reusable implementation (not UI-only — services live here too) and matches the existing `contactus-shared` dir; `internal` is the private tier and matches the existing `contactus-internal` dir. `shared` is preferred over `public` because `contract` is *also* public, so `public` would be ambiguous. Keeping `contract` separate from `shared` is load-bearing: folding them into one `public` lib reintroduces the fesm peer-resolution wall this whole idea exists to eliminate.
2. **Dependency-inversion for runtime calls — the token lives in the provider's own `*-contract`.** The provider extension owns and publishes the `InjectionToken` + interface for what it offers (e.g. `extension-contactus-contract` exports `CONTACT_SELECTOR` + `IContactSelector`). The provider's `-shared`/`-internal` supplies the concrete implementation, wired by the app at bootstrap; the caller injects the interface and calls `selectContact()` without importing any provider implementation. No cycle, no fesm wall (the heavy dialog is lazy-loaded by the app, where peers resolve). The same inversion applies *within* an extension: a `-shared` component that needs `ContactService` injects it via a `-contract` token rather than importing `-internal`.
3. **Enforce the rule mechanically with nx module-boundary tags.** nx 22 + `@nx/eslint-plugin` are already installed (no tags configured yet — greenfield). Tag every project on two axes: `type:contract` | `type:shared` | `type:internal`, and `ext:<name>`. Then `enforce-module-boundaries` encodes the matrix:
   - `type:contract` → may depend only on `type:contract` + foundational libs.
   - `type:shared` → may depend on `type:contract` + `type:shared` + foundational — **never `type:internal`** (this is the load-bearing rule: shared/public code never imports implementation).
   - `type:internal` → may depend on any public tier + foundational + its own `internal`.
   - Coarse-tag limitation: nx tags cannot natively express "an `internal` may depend only on its *own* extension's `internal`." Close the cross-extension gap structurally by **not exposing `-internal` libs in the tsconfig `paths`** so other extensions cannot resolve the import at all. This turns tribal knowledge into a CI gate.

A typed **extension bus** (mediator in a shared low-level lib) and **route-based invocation** are complementary tools layered on top for many-to-many events and full-page hops respectively — added only when a real need appears.

## Alternatives Considered

- **Single shared contracts lib** (`@sneat/extensions-contracts`) holding *all* cross-extension interfaces/tokens, instead of one `*-contract` per extension: fewer libs, and no extension depends on another at all (everyone depends *down* on the one lib). But ownership blurs — who owns `IContactSelector` when it lives outside contactus? — and the lib tends to grow into a God-lib that everyone must touch and that ripples on every change. Demoted from the original recommendation: kept only as the home for *genuinely cross-cutting* primitives (a base space-item context type, the optional bus), not for an extension's own capabilities.
- **Typed event bus only** (`bus.request('contactus.selectContact', …)`): maximum decoupling and great for events, but weaker compile-time safety (string message names) and harder to navigate. Lost as the *default* — better as a complement for many-to-many/event cases than for known, typed, value-returning calls.
- **Routing-only contract** (navigate to the other extension's page): zero code coupling, but awkward for inline dialogs that must return a value. Kept for page-level flows, not as the general answer.
- **Make the prebuilt bundle's peers resolvable inside `sneat-libs`** (build + map the 8 peer libs for tests): brittle, fights the source-mapped workspace model, and doesn't address the questionable foundational-lib→app-extension dependency. Rejected.
- **Merge everything into one workspace** to dodge published-bundle resolution: throws away the independent-extension/publishing model. Rejected.

## MVP Scope

**Prove the pattern on `contactus` first, then roll out to every extension.** `contactus` is the hub — today calendarius, `app`, and `space-*` all reach straight into its `-core`/`-shared`/`-services` tiers (132 import statements: ~70 are contract-shaped types, ~50 are services like `ContactService`×29 / `ContactusSpaceService`×16, ~9 are reusable components). Reshaping it both fixes the most coupling and produces the reference template the other extensions copy.

Phase 1 — contactus reshape (the reference implementation):

1. Stand up `extension-contactus-contract` (seed from `-core` + the types stranded in `-shared`/`-services`); add the `CONTACT_SELECTOR` token + `IContactSelector` interface, plus tokens for the cross-extension services (`ContactService`, `ContactusSpaceService`).
2. Stand up `extension-contactus-shared` for the ~9 reusable components/pipes; make them inject services via `-contract` tokens (no `-internal` imports).
3. Reroute external consumers (calendarius, `app`, `space-*`) onto `-contract`/`-shared`; refactor the assetus↔contactus link through `CONTACT_SELECTOR`, replacing the tactical in-repo workaround.
4. Collapse the now-private remainder (`-core` remainder + `-services` + `-internal` + non-shared `-shared`) into `extension-contactus-internal`.
5. Land the nx tags + `enforce-module-boundaries` rule and drop `-internal` from tsconfig `paths`; confirm `sneat-libs` CI green with zero cross-extension `-internal` imports.

Phase 2 — apply the same `contract`/`shared`/`internal` split to the remaining extensions (assetus, calendarius, …) incrementally, using the contactus libs as the template.

## Not Doing (and Why)

- A runtime plugin-discovery/registry framework — start with explicit DI tokens
- Rewriting existing extensions in one pass — adopt incrementally, contactus↔assetus first
- A typed extension bus and route-contract conventions — deferred until a real many-to-many / page-hop case needs them; the MVP is the token pattern only

## Key Assumptions to Validate

| Tier | Assumption | How to validate |
|------|------------|-----------------|
| Must-be-true | A `*-contract` lib can hold an extension's interfaces/tokens without depending on any extension *impl* (no new cycle). | Build `contactus-contract`; confirm its only deps are types and Angular DI primitives, and that it imports no `*-impl`. |
| Must-be-true | An extension injecting a token never loads the provider's prebuilt bundle, so the fesm peer-resolution wall and the cycle both vanish. | Refactor assetus↔contactus to the token; confirm `sneat-libs` CI green with zero runtime cross-extension impl imports. |
| Should-be-true | The app layer (sneat-apps and each app) can wire providers once at bootstrap without per-feature plumbing, preserving current behaviour. | Wire `CONTACT_SELECTOR` in sneat-apps; verify the contact-picker flow works identically. |
| Should-be-true | nx module-boundary tags can express "an `*-impl` may depend on any `*-contract`, but never on another extension's `*-impl`". | Prototype the tag rule; confirm it flags a deliberate violating import and passes the compliant one. |
| Might-be-true | Most cross-extension traffic is hub-shaped (everything ↔ contactus), so a handful of tokens covers the bulk. | Inventory current/expected cross-extension calls. |

## SpecScore Integration

- **New Features this would create:** TBD at design time — likely (a) the per-extension `-contract`/`-shared`/`-internal` split + token convention (contactus first as the reference), (b) a small shared lib for genuinely cross-cutting primitives, (c) nx module-boundary enforcement (`type:contract`/`type:shared`/`type:internal` tags + `-internal` excluded from tsconfig `paths`), (d) optional extension bus.
- **Existing Features affected:** the assetus↔contactus integration (currently the tactical type-only workaround).
- **Dependencies:** relates to `sneat-co/assetus#9` (type-only guideline) and `sneat-co/assetus#4` (retirement).

## Open Questions

- Which interaction shapes do we actually have today: (a) open-a-dialog-and-get-a-value, (b) cross-extension data fetch, (c) fire-and-forget events/reactions, (d) navigate-to-another-extension's-page? The mix decides how much of tokens vs bus vs routing we build.
- Is cross-extension traffic mostly a hub (everything ↔ contactus) or a denser web? A hub is much simpler to model with a few tokens.
- Does `contactus` move to its own dedicated repo (like assetus) or stay in `sneat-libs`? Doesn't change the pattern, but changes whether `*-contract`/`*-impl` become published packages vs in-repo libs.
- For *genuinely cross-cutting* primitives (not an extension's own capability — e.g. a base space-item context type, or the optional bus), do they live in a small new shared lib or in an existing low-level one (e.g. `space-models`)?
