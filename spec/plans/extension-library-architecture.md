---
format: https://specscore.md/plan-specification
status: Approved
---
# Plan: Extension Library Architecture

**Status:** Approved
**Source Feature:** extension-library-architecture
**Date:** 2026-06-20
**Owner:** alexandertrakhimenok
**Supersedes:** —

## Summary

Implements the extension library-architecture convention and proves it end-to-end by reshaping `contactus` — the hub extension — into `extension-contactus-contract` / `-shared` / `-internal`. Reroutes every in-repo consumer (`calendarius`, `app`, `space-services`, `space-components`) onto the contract/shared surface, replacing direct service/component imports with `contract`-defined `InjectionToken`s. The `calendarius → contactus` link is the cross-extension proof-of-concept, verified by `sneat-libs` CI. Lands nx two-axis tags + `enforce-module-boundaries` so the rule is a CI gate, and excludes `*-internal` from tsconfig `paths`.

## Approach

Sequenced by hard dependency (`**Depends-On:**` encodes the DAG `specstudio:implement` batches from). The spine is: branch + enforcement scaffold → scaffold the three libs → cut over the contract tier → cut over the internal tier → cut over the shared tier → flip enforcement strict + verify CI → final sweep. The contract tier (types + tokens) lands first so dependency inversion is in place before any service/component is moved.

**Hard cutover — move, never copy, no shims.** Each tier cutover (Tasks 3–5) is atomic: a symbol is created in its new lib, **every reference to it across the repo (contactus internals *and* consumers `calendarius`/`app`/`space-*`) is repointed in the same task**, and it is **deleted from its old location** — including dropping the old contactus lib directory as soon as it is empty. There are no temporary re-export shims and no permanent wrapper libs; the old `contactus-core`/`-shared`/`-services`/`-internal` libs cease to exist as their contents migrate. Invariant: exactly one definition of each symbol exists at every step, and no consumer imports a path that is about to be deleted. Consequence vs the shimmed approach: tier tasks are larger and the same consumer file may be edited by more than one tier task, so the tier tasks run sequentially rather than in parallel.

**Execution model (subagent-driven, worktree-isolated):** each task runs as a dispatched subagent in its own git worktree branched off the plan branch `feat/extension-library-architecture`. Tasks that edit shared workspace files (`nx.json`, `tsconfig.base.json`, `eslint.config.js`) or the same consumer files are serialized to avoid merge conflicts; within a tier task, repointing the four distinct consumers may fan out in parallel. **Per-task cleanup is mandatory:** on a task's completion, merge its worktree branch into `feat/extension-library-architecture`, then remove the worktree and delete the task branch immediately — do not defer cleanup to the end. Task 7 is a final reconciling sweep, not the primary cleanup.

## Tasks

### Task 1: Branch + nx tag taxonomy and enforce-module-boundaries scaffold

**Verifies:** extension-library-architecture#ac:nx-tag-enforcement
**Depends-On:** —
**Status:** pending

Create `feat/extension-library-architecture` off `origin/main`. Define the tier tags (`type:contract` | `type:shared` | `type:internal`), the `ext:<name>` convention, and `scope:foundation` on foundational libs (`core`, `space-models`, `ui`, `components`, …). Add the `@nx/eslint-plugin` `enforce-module-boundaries` rule with the tier dependency matrix in `eslint.config.js`, initially at `warn` so the pre-migration tree still builds.

**Notes:** Touches shared config (`nx.json`, `eslint.config.js`) — run solo, not parallel.

### Task 2: Scaffold the three contactus libs

**Verifies:** extension-library-architecture#ac:three-lib-decomposition, extension-library-architecture#ac:lib-naming, extension-library-architecture#ac:internal-not-in-tsconfig-paths
**Depends-On:** 1
**Status:** pending

Scaffold empty `@sneat/extension-contactus-contract`, `@sneat/extension-contactus-shared`, and `@sneat/extension-contactus-internal` libs (project.json with tier + `ext:contactus` tags, package.json, index). Add `paths` entries for `-contract` and `-shared` only; deliberately omit `-internal` from `tsconfig.base.json` `paths`.

**Notes:** Edits `tsconfig.base.json` — run solo.

### Task 3: Contract cutover — move types + tokens, repoint all references

**Verifies:** extension-library-architecture#ac:contract-lib-runtime-light, extension-library-architecture#ac:di-token-inversion
**Depends-On:** 2
**Status:** pending

Move interfaces/DTOs/enums from `contactus-core` (and types stranded in `-shared`/`-services`, e.g. `PersonTitle`, `MemberGroup`, `IUpdateContactRequest`) into `extension-contactus-contract`, and define the `InjectionToken`s + interfaces for the cross-extension services — at minimum `ContactService` and `ContactusSpaceService` (the ×29 / ×16 consumers) — keeping the lib runtime-light (no heavy `@sneat/*` peers). Repoint every reference repo-wide (contactus internals, `calendarius`, `app`, `space-*`) to the new contract import, and delete the moved symbols from `contactus-core`.

**Notes:** Broad type-import repoint; run solo. The runtime remainder of `contactus-core` (`app.service.ts`, `store.ts`) moves in Task 4.

### Task 4: Internal cutover — move services/pages, provide tokens, repoint consumers

**Verifies:** extension-library-architecture#ac:internal-lib-private, extension-library-architecture#ac:di-token-inversion
**Depends-On:** 3
**Status:** pending

Move services (`ContactService`, `ContactusSpaceService`, `MemberService`, `InviteService`, nav/group services), dialogs, pages, private components, and the runtime remainder of `contactus-core` into `extension-contactus-internal`; bind each contract token to its concrete provider. Repoint consumers (`calendarius`, `app`, `space-*`) to inject the cross-extension services via contract tokens instead of importing them, then drop the emptied `contactus-services` lib (and `-core` remainder). No other extension imports this lib.

**Notes:** Edits the same consumer files as Tasks 3 and 5 — run after Task 3, before Task 5. Per-consumer repoint may fan out within the task.

### Task 5: Shared cutover — move reusable components, repoint consumers

**Verifies:** extension-library-architecture#ac:internal-lib-private, extension-library-architecture#ac:shared-lib-no-internal
**Depends-On:** 4
**Status:** pending

Move the ~9 externally-consumed reusable units (`ContactDetailsComponent`, `PersonWizardComponent`, `ContactsAsBadgesComponent`, `FamilyMembersComponent`, `LocationFormComponent`, `MembersSelectorModule`, `ContactsSelectorModule`, `ContactTitlePipe`, `SelectedContactsPipe`) into `extension-contactus-shared`, refactoring each to obtain services via Task 3 contract tokens (zero `-internal` imports). Repoint consumer component imports to `extension-contactus-shared`, then drop the emptied `contactus-shared` and `contactus-internal` libs. `calendarius → contactus` is the cross-extension PoC: after this task it imports only contactus `-contract` + `-shared`, never `-internal`.

**Notes:** Touches the same consumer files as Task 4 — run after it.

### Task 6: Flip enforcement strict + wire providers + verify CI

**Verifies:** extension-library-architecture#ac:nx-tag-enforcement, extension-library-architecture#ac:shared-lib-no-internal, extension-library-architecture#ac:internal-not-in-tsconfig-paths
**Depends-On:** 5
**Status:** pending

Wire the contract-token providers at app bootstrap. Flip `enforce-module-boundaries` from `warn` to `error`. Run the full `sneat-libs` CI (lint, build, test) and confirm it is green with zero cross-extension `-internal` imports and a deliberate violating import correctly failing lint.

**Notes:** Touches shared config — run solo.

### Task 7: Final lib removal + worktree/branch sweep

**Verifies:** extension-library-architecture#ac:three-lib-decomposition
**Depends-On:** 6
**Status:** pending

Confirm all four old contactus libs (`-core`/`-services`/`-shared`/`-internal`) and their `project.json`/`tsconfig` `paths` entries are gone (remove any residue). Reconciling sweep: confirm every per-task worktree was already removed and its branch deleted; remove stragglers via `git worktree prune` + `git branch -d`, leaving only `feat/extension-library-architecture`.

## Open Questions

None at this time.

---
*This document follows the https://specscore.md/plan-specification*
