---
format: https://specscore.md/plan-specification
status: Approved
---
# Plan: Extension Library Architecture Calendarius

**Status:** Implemented
**Source Feature:** extension-library-architecture
**Date:** 2026-06-20
**Owner:** alexandertrakhimenok
**Supersedes:** —

## Summary

Applies the (now Stable) extension library-architecture convention to the **calendarius** extension — the second reference implementation, mirroring the contactus reshape. Splits `ext-calendarius-{core,main,shared}` into `extension-calendarius-{contract,shared,internal}`, tokenizes the one cross-extension service (`ScheduleNavService`, the sole symbol `contactus-shared` imports from calendarius), reroutes that consumer onto the token, and then **removes the `ext:calendarius` transitional allowance** from the `enforce-module-boundaries` matrix. The nx tag taxonomy + boundary rule already exist (landed by the contactus plan), so this plan starts at lib scaffolding.

## Approach

Same hard-cutover model as the contactus plan: move, never copy; one definition per symbol; old lib dropped as it empties; tier tasks sequential because consumer files overlap. The cross-extension surface is tiny — only `contactus-shared` consumes calendarius, and only `ScheduleNavService` — so the contract tier defines a single `SCHEDULE_NAV_SERVICE` token and the consumer-reroute is one symbol. Sequence: scaffold three libs → contract cutover (types + token) → internal cutover (services/pages, provide token) → shared cutover (reusable components) → reroute `contactus-shared` + drop the `ext:calendarius` allowance → verify CI → final sweep.

**Execution model (subagent-driven, worktree-isolated):** each task runs as a dispatched subagent; tasks editing shared workspace files (`tsconfig.base.json`, `eslint.config.js`) or overlapping consumer files are serialized. Per-task cleanup is mandatory: on completion, merge the task's worktree branch into the plan branch, then remove the worktree and delete the task branch. The final task is a reconciling sweep.

**Dependency note:** `contactus-shared` currently imports `ScheduleNavService` from `@sneat/extension-calendarius-core`. Until calendarius exposes the `SCHEDULE_NAV_SERVICE` token (Task 2) and `contactus-shared` is rerouted (Task 5), the `ext:calendarius` allowance must stay; Task 5 removes it only after the reroute lands.

**Package-name collision (calendarius-specific):** unlike contactus, the *old* calendarius shared lib already owns the target package name `@sneat/extension-calendarius-shared`. To avoid a collision during migration, the new shared-tier lib is scaffolded at dir `libs/extensions/calendarius/ui` with a **temporary** package name `@sneat/extension-calendarius-shared-new`; the old lib keeps `@sneat/extension-calendarius-shared` until its content is moved (Task 4) and it is deleted. Task 7 then renames the new lib to the clean `@sneat/extension-calendarius-shared` (package + tsconfig path; optionally dir `ui` → `shared`).

## Tasks

### Task 1: Scaffold the three calendarius libs

**Verifies:** extension-library-architecture#ac:three-lib-decomposition, extension-library-architecture#ac:lib-naming, extension-library-architecture#ac:internal-not-in-tsconfig-paths
**Depends-On:** —
**Status:** complete

Scaffold empty `@sneat/extension-calendarius-contract`, `@sneat/extension-calendarius-shared`, and `@sneat/extension-calendarius-internal` libs under `libs/extensions/calendarius/`, mirroring the contactus tier libs (project.json with tier + `ext:calendarius` tags, package.json, index). Add `paths` entries for `-contract` and `-shared` only; deliberately omit `-internal` from `tsconfig.base.json` `paths`.

**Notes:** Edits `tsconfig.base.json` — run solo.

### Task 2: Contract cutover — move types + define ScheduleNavService token

**Verifies:** extension-library-architecture#ac:contract-lib-runtime-light, extension-library-architecture#ac:di-token-inversion
**Depends-On:** 1
**Status:** complete

Move calendarius pure types/interfaces/enums/DTOs (the bulk of `ext-calendarius-core`) into `extension-calendarius-contract`, keeping it runtime-light. Define `SCHEDULE_NAV_SERVICE` + `IScheduleNavService` (interface derived from how `contactus-shared` uses `ScheduleNavService`) and any other token needed for a genuinely cross-extension service. Repoint every reference repo-wide to the contract import; delete the moved symbols from `ext-calendarius-core`.

**Notes:** Broad type-import repoint; run solo.

### Task 3: Internal cutover — move services/pages, provide tokens

**Verifies:** extension-library-architecture#ac:internal-lib-private, extension-library-architecture#ac:di-token-inversion, extension-library-architecture#ac:internal-register-function
**Depends-On:** 2
**Status:** complete

Move calendarius services (incl. `ScheduleNavService`), pages, dialogs, and private components into `extension-calendarius-internal`; bind each contract token to its concrete provider via a `provideCalendariusInternal(): Provider[]` factory (wired by the app at bootstrap). Drop the emptied `ext-calendarius-core`/`-main` libs as their contents migrate. No other extension imports this lib.

**Notes:** Edits overlapping consumer files — run after Task 2, before Task 4.

### Task 4: Shared cutover — move reusable components

**Verifies:** extension-library-architecture#ac:internal-lib-private, extension-library-architecture#ac:shared-lib-no-internal
**Depends-On:** 3
**Status:** complete

Move calendarius reusable components/pipes/modules (old `ext-calendarius-shared`, ~71 files — calendar, happening cards, slot components, etc.) into the new shared-tier lib (`ext-calendarius-shared-new`, dir `ui`, package `@sneat/extension-calendarius-shared-new`), refactoring any service access to contract tokens (zero `-internal` imports). Repoint intra-calendarius and consumer component imports to `@sneat/extension-calendarius-shared-new`; drop the emptied old `ext-calendarius-shared` lib (dir `shared`) and its `@sneat/extension-calendarius-shared` path entry.

**Notes:** Touches overlapping consumer files — run after Task 3.

### Task 5: Reroute contactus-shared + remove ext:calendarius allowance

**Verifies:** extension-library-architecture#ac:di-token-inversion, extension-library-architecture#ac:shared-lib-no-internal
**Depends-On:** 4
**Status:** complete

Reroute `contactus-shared`'s single calendarius dependency (`ScheduleNavService`) to inject `SCHEDULE_NAV_SERVICE` from `@sneat/extension-calendarius-contract` instead of importing `@sneat/extension-calendarius-core`. Then remove the `ext:calendarius` transitional allowance from the `type:shared` and `type:internal` constraints in `eslint.config.js`, so cross-extension calendarius coupling is only permitted through its contract.

**Notes:** Edits `eslint.config.js` — run solo.

### Task 6: Verify CI green + violation fails

**Verifies:** extension-library-architecture#ac:nx-tag-enforcement, extension-library-architecture#ac:shared-lib-no-internal, extension-library-architecture#ac:internal-not-in-tsconfig-paths
**Depends-On:** 5
**Status:** complete

Run the full `sneat-libs` CI (lint, build, test) and confirm green with zero cross-extension `-internal` imports and zero use of the removed `ext:calendarius` allowance. Confirm a deliberate forbidden edge (e.g. `extension-calendarius-contract` importing a `type:shared` lib, or `contactus-shared` importing `extension-calendarius-internal`) correctly fails lint.

**Notes:** Touches no source — verification only.

### Task 7: Final lib removal + worktree/branch sweep

**Verifies:** extension-library-architecture#ac:three-lib-decomposition
**Depends-On:** 6
**Status:** complete

Confirm the old `ext-calendarius-core`/`-main`/`-shared` libs and their `project.json`/`tsconfig` `paths` entries are gone (remove residue). **Rename the temporary shared lib to the clean name:** package `@sneat/extension-calendarius-shared-new` → `@sneat/extension-calendarius-shared`, its tsconfig path key, project name `ext-calendarius-shared-new` → `ext-calendarius-shared`, and (optionally) dir `ui` → `shared`; repoint the consumers that import `-shared-new`. Reconciling sweep: confirm every per-task worktree was removed and its branch deleted; prune stragglers, leaving only the plan branch.

## Open Questions

- Does calendarius import any contactus `-internal` (vs `-contract`/`-shared`)? Inventory during Task 2; if so, route via the contactus contract tokens already defined.
- Are there cross-extension calendarius services beyond `ScheduleNavService` (e.g. consumed by a future app wiring)? Confirm during the contract cutover; add tokens as needed.

---
*This document follows the https://specscore.md/plan-specification*
