---
format: https://specscore.md/plan-specification
status: Executing
---
# Plan: Contactus Ext

**Status:** Executing
**Source Feature:** contactus-ext
**Date:** 2026-06-21
**Owner:** alexandertrakhimenok
**Supersedes:** —

## Summary

Implements the `contactus-ext` Feature: extracts `contactus`'s public contract surface into the dedicated `sneat-co/contactus-ext` repo (polyglot `backend/` Go module + `frontend/` nx lib), relocating the backend `contactusmodels` out of `sneat-core-modules` and the frontend `@sneat/extension-contactus-contract` lib out of the `contactus` main repo, re-homing the contributor interfaces that pass the convention's ownership test while leaving bilateral ones consumer-owned, then releasing **contract-first** and repointing every consumer onto the published artifacts. The backend consumer set is the **7 Go modules** that import these shapes — `sneat-core-modules` (source) plus `contactus/backend`, `debtus/backend`, `logistus/backend`, `sneat-bots`, `sneat-go-backend`, `sneat-go` — and the frontend consumers (`calendarius`, `app`, `space-*`, `sneat-apps`, and the `contactus` main repo's own `internal`+`shared` tiers).

## Approach

**Publish-first, not local-replace.** A prior attempt to relocate the backend `contactusmodels` and repoint all consumers in one pass via local `replace` directives failed: once the shapes move modules, Go treats the old and new copies as distinct incompatible types, so every module in a build must resolve a single copy — and committed `replace … => ../…` paths only work on one machine and break CI for every module. The corrected sequence builds the contract into `contactus-ext`, **publishes it**, then repoints consumers in strict dependency order using real pinned `require`s (never a committed `replace`). See `docs/contactus-ext-task2-handover.md` for the full root-cause analysis.

Phases: (A) build the contract into `contactus-ext` — relocate the models [done], relocate the frontend lib [done], declare the re-homed contributor interfaces; (B) **tag/publish** `contactus-ext` (Go module + npm); (C) repoint + republish consumers in dependency order `sneat-core-modules` → `contactus/backend` → leaf modules, plus the frontend consumers, deleting the old packages and wiring contributor implementations as each consumer migrates. Tasks were renumbered from the pre-revision Plan to reflect this ordering. This Plan is explicitly iterative: it proves the direction end-to-end on `contactus`; residual reclassification (e.g. additional contributors) is expected follow-up, not a blocker.

**Split of ownership (two sessions).** The **frontend** half — relocating/publishing the `@sneat/extension-contactus-*` npm packages and rewiring the frontend apps (`sneat-apps`, `calendarius`, `app`, `space-*`, and `contactus`'s own `internal`+`shared` tiers) — is owned by a separate **frontend session** (already in flight: contactus main has had the contract lib removed and `0.12.x` published; `sneat-apps` is on `migrate/contactus-extension-packages`). This backend session owns only: the `contactus-ext` **backend** Go module (Tasks 2, 4), the **Go module tag** half of the release (Task 5), and the **backend** consumer repoint (Tasks 6, 7, and the Go-module part of Task 8). So Task 3, the npm-publish part of Task 5, and the frontend-consumer part of Task 8 are tracked here for completeness but executed by the frontend session.

## Tasks

### Task 1: Stand up the `contactus-ext` repo skeleton

**Verifies:** contactus-ext#ac:contactus-ext-repo
**Depends-On:** —
**Status:** complete

Create `sneat-co/contactus-ext` per the `extension-contract-repo` convention: a `backend/` Go module `github.com/sneat-co/contactus-ext/backend` and a `frontend/` nx lib published as `@sneat/extension-contactus-contract`, plus the convention's dependency-invariant CI check. The repo starts empty of contract symbols and declares only foundational/core dependencies.

**Notes:** Done — repo created (public) and pushed at `sneat-co/contactus-ext@1b39377`: backend Go module skeleton, invariant CI (`scripts/check-no-extension-deps.sh` + `ci.yml`), LICENSE/README/specscore.yaml. The `frontend/` slot's nx workspace + lib land in Task 3.

### Task 2: Backend — relocate `contactusmodels` into `contactus-ext` (relocation-only)

**Verifies:** contactus-ext#ac:relocate-contactusmodels
**Depends-On:** 1
**Status:** complete

Bring `briefs4contactus` and `const4contactus` into `contactus-ext/backend/contactusmodels` so the new module owns them and builds standalone (depends only on `sneat-go-core`; invariant check passes). This is the **relocation half** of `relocate-contactusmodels`; removing the old copy from `sneat-core-modules` and repointing importers happens post-publish in Tasks 6–8.

**Notes:** Done — `contactus-ext@ab58163` on branch `feat/backend-contract-extraction` (`go 1.25.0`, `require sneat-go-core v0.55.3`). The packages also still exist in `sneat-core-modules` (published) so all current consumers keep building until the ordered cutover — the intentional contract-first intermediate state.

### Task 3: Frontend — relocate the contract lib into `contactus-ext`

**Verifies:** contactus-ext#ac:relocate-frontend-contract
**Depends-On:** 1
**Status:** planning

Move the `@sneat/extension-contactus-contract` nx lib from `contactus/frontend/libs/extensions/contactus/contract` into `contactus-ext/frontend` (stand up the nx workspace there), and remove the old in-repo location and its workspace path entry from the `contactus` main repo.

**Notes:** OUT OF BACKEND SCOPE — owned by the separate **frontend session** (contactus frontend publishing + app rewiring). That session has already removed the contract lib from `contactus` main (commits #6–#8, publishing `@sneat/extension-contactus-* 0.12.x`). A prior backend-session attempt (`contactus-ext@a21f691`, `contactus@ca01ec4`) was reverted/dropped to avoid overlap. Leave the contactus-ext/frontend relocation + npm publish to the frontend session.

### Task 4: Backend — classify and declare re-homed contributor interfaces in `contactus-ext`

**Verifies:** contactus-ext#ac:rehome-passing-contributors, contactus-ext#ac:bilateral-stays-consumer-owned
**Depends-On:** 2
**Status:** complete

Classify each contributor interface against the convention's ownership test and **declare** the passing ones (`ContactusSpaceContributor`, plus `ContactusCountryUpdater` / linkage `DboFactory` if their signatures are contactus-own + core only) in `contactus-ext/backend` so they ship in the published contract. Explicitly leave the bilateral failing ones (`ContactusAccess`, which speaks `invitus`/`spaceus` types) in their consumer modules, and confirm `contactus-ext` imports neither `invitus` nor `spaceus`. Wiring the siblings to import these interfaces and `contactus` to register implementations happens during the consumer repoint (Tasks 6–7).

**Notes:** The leave-behind is load-bearing — moving a bilateral interface would break the zero-other-extension-deps invariant. Like the models, the declaration is added to `contactus-ext` before publish while the consumer-side copy remains until the ordered cutover. Done — `contactus-ext@cc40195` (branch `feat/backend-contract-extraction`) declares `ContactusSpaceContributor` + `ContactusCountryUpdater` in `backend/facade4contactus`; deferred (bilateral, consumer-owned): `ContactusAccess`, linkage `RelatedDboFactory`. Build + invariant pass.

### Task 5: Release `contactus-ext` contract-first

**Verifies:** contactus-ext#ac:contract-first-release
**Depends-On:** 2, 3, 4
**Status:** planning

Tag the `contactus-ext` Go module and publish the `@sneat/extension-contactus-contract` npm package as the **first** release in the sequence, and confirm the convention's dependency-invariant check passes on `contactus-ext` (no `@sneat/extension-*` or sibling-module implementation dependency). This unblocks consumers to switch onto a real pinned dependency. Requires repo creation/tagging/npm-publish credentials — coordinate before executing.

**Notes:** Publish-gated: no consumer repoint (Tasks 6–8) can build green until this tag/version exists, because a committed local `replace` is not a valid substitute across these published modules.

### Task 6: Repoint + republish `sneat-core-modules` onto the published contract

**Verifies:** contactus-ext#ac:repoint-consumers, contactus-ext#ac:relocate-contactusmodels, contactus-ext#ac:rehome-passing-contributors
**Depends-On:** 5
**Status:** planning

Rewrite `sneat-core-modules`'s internal `contactusmodels` imports (including the `invitus`/`spaceus`/`userus`/`linkage` packages within it) to the published `contactus-ext`, **delete** the old `contactusmodels` packages, wire the sibling (`spaceus`) to import the re-homed contributor interface from `contactus-ext`, add a real pinned `require` on the tag, and republish `sneat-core-modules`.

**Notes:** First link in the ordered chain. No local `replace` — pins the published `contactus-ext` version.

### Task 7: Repoint + republish `contactus/backend` onto the republished contract

**Verifies:** contactus-ext#ac:repoint-consumers, contactus-ext#ac:rehome-passing-contributors
**Depends-On:** 6
**Status:** planning

Repoint `github.com/sneat-co/contactus/backend` onto the republished `sneat-core-modules` + published `contactus-ext` (real pinned `require`s), register the re-homed contributor implementation(s) at bootstrap, build green, and republish.

**Notes:** Second link; depends on Task 6's republished `sneat-core-modules` carrying the new types.

### Task 8: Repoint leaf backend modules and frontend consumers

**Verifies:** contactus-ext#ac:repoint-consumers
**Depends-On:** 7
**Status:** planning

Repoint the leaf Go modules (`debtus/backend`, `logistus/backend`, `sneat-bots`, `sneat-go-backend`, `sneat-go`) onto the published versions with real pinned `require`s, and bump the frontend consumers (`calendarius`, `app`, `space-*`, `sneat-apps`, and the `contactus` main repo's own `internal`+`shared` tiers) onto the published `@sneat/extension-contactus-contract`. Verify repo-wide that no consumer imports a pre-extraction location and that each builds green.

**Notes:** Frontend `sneat-apps` repoint is already in flight on branch `refactor/contactus-extension-packages` (consumes the published npm packages) — coordinate/merge rather than redo.

## Deferred AC Coverage

(None — every source-Feature AC is covered by at least one task above.)

## Open Questions

- The dependency-invariant CI mechanism (Open Question inherited from the convention) was resolved at Task 1: a `go list` backend scan + `package.json` frontend scan (`scripts/check-no-extension-deps.sh`).
- The earlier "single coordinated bump for the four backend siblings" decision (2026-06-21) is **superseded** by the publish-first ordered chain (Tasks 5→6→7→8); the "siblings" were found to be packages inside `sneat-core-modules`, not separate modules.

---
*This document follows the https://specscore.md/plan-specification*
