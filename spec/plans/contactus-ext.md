---
format: https://specscore.md/plan-specification
status: Approved
---
# Plan: Contactus Ext

**Status:** Approved
**Source Feature:** contactus-ext
**Date:** 2026-06-21
**Owner:** alexandertrakhimenok
**Supersedes:** —

## Summary

Implements the `contactus-ext` Feature: extracts `contactus`'s public contract surface into the dedicated `sneat-co/contactus-ext` repo (polyglot `backend/` Go module + `frontend/` nx lib), relocating the backend `contactusmodels` out of `sneat-core-modules` and the frontend `@sneat/extension-contactus-contract` lib out of the `contactus` main repo, re-homing the contributor interfaces that pass the convention's ownership test while leaving bilateral ones consumer-owned, repointing every consumer onto the published artifacts, and releasing contract-first. Spans `contactus-ext` (new), `sneat-core-modules`, the `contactus` main repo, the four backend siblings, and the frontend consumers (`calendarius`, `app`, `space-*`, `sneat-apps`).

## Approach

Sequenced linearly by hard dependency: stand up the empty repo first (so there is a home), then cut over the backend tiers (data/const, then contributor interfaces), then the frontend tier, then release contract-first, then repoint the consumers that can only move once the package is published. Each relocation is a **hard cutover** — move the symbol, repoint its direct in-tree importers, delete the old location in the same task — following the proven `extension-library-architecture` cutover discipline. Cross-repo Go importers use `replace` directives during the transition and switch to a real `require` after Task 5 tags the module; npm consumers bump after Task 5 publishes. Current state to account for: commit `442a445` already removed the in-repo `contactus` frontend libs from `sneat-libs` and consumes `@sneat/extension-contactus-*` from npm, and the frontend contract lib currently ships from the `contactus` main repo at `contactus/frontend/libs/extensions/contactus/contract` — so Task 4 moves it from the main repo, not from `sneat-libs`. This Plan is explicitly iterative: it sets the direction and proves it end-to-end on `contactus`; residual reclassification (e.g. additional contributors) is expected follow-up, not a blocker.

## Tasks

### Task 1: Stand up the `contactus-ext` repo skeleton

**Verifies:** contactus-ext#ac:contactus-ext-repo
**Depends-On:** —
**Status:** pending

Create `sneat-co/contactus-ext` per the `extension-contract-repo` convention: a `backend/` Go module `github.com/sneat-co/contactus-ext/backend` and a `frontend/` nx lib published as `@sneat/extension-contactus-contract`, plus the convention's dependency-invariant CI check. The repo starts empty of contract symbols and declares only foundational/core dependencies.

### Task 2: Backend — relocate `contactusmodels` and repoint Go importers

**Verifies:** contactus-ext#ac:relocate-contactusmodels
**Depends-On:** 1
**Status:** pending

Move `briefs4contactus` and `const4contactus` from `sneat-core-modules/contactusmodels` into `contactus-ext/backend` (history-preserving), repoint every Go importer (the `contactus` main repo and the sibling modules that consume these shapes) to the new import path via `replace` during transition, and delete the packages from `sneat-core-modules`.

**Notes:** Touches `sneat-core-modules` and all its contactusmodels importers (invitus, spaceus, …). Hard cutover — no shim left behind.

### Task 3: Backend — classify and re-home contributor interfaces

**Verifies:** contactus-ext#ac:rehome-passing-contributors, contactus-ext#ac:bilateral-stays-consumer-owned
**Depends-On:** 2
**Status:** pending

Classify each contributor interface against the convention's ownership test. Move the passing ones (`ContactusSpaceContributor`, plus `ContactusCountryUpdater` / linkage `DboFactory` if their signatures are contactus-own + core only) into `contactus-ext/backend`, with the sibling importing the interface down and the `contactus` main repo registering the implementation at bootstrap. Explicitly leave the bilateral failing ones (`ContactusAccess`, which speaks `invitus`/`spaceus` types) in their consumer modules, and confirm `contactus-ext` imports neither `invitus` nor `spaceus`.

**Notes:** The leave-behind is load-bearing — moving a bilateral interface would break the zero-other-extension-deps invariant.

### Task 4: Frontend — relocate the contract lib into `contactus-ext`

**Verifies:** contactus-ext#ac:relocate-frontend-contract
**Depends-On:** 1
**Status:** pending

Move the `@sneat/extension-contactus-contract` nx lib from `contactus/frontend/libs/extensions/contactus/contract` into `contactus-ext/frontend` (history-preserving), update the nx project/build config so the package publishes from `contactus-ext`, and remove the old in-repo location and its workspace path entry from the `contactus` main repo.

**Notes:** Independent of the backend tasks (2/3) except for the shared repo skeleton from Task 1; ordered after 1, before the release.

### Task 5: Release `contactus-ext` contract-first

**Verifies:** contactus-ext#ac:contract-first-release
**Depends-On:** 3, 4
**Status:** pending

Tag the `contactus-ext` Go module and publish the `@sneat/extension-contactus-contract` npm package as the first release in the sequence, and confirm the convention's dependency-invariant check passes on `contactus-ext` (no `@sneat/extension-*` or sibling-module implementation dependency). This unblocks consumers to switch from `replace`/old-version to a real pinned dependency.

### Task 6: Repoint remaining consumers and verify no old-location imports

**Verifies:** contactus-ext#ac:repoint-consumers
**Depends-On:** 5
**Status:** pending

Repoint every remaining consumer onto the published `contactus-ext` artifacts: switch the four backend siblings and the `contactus` main repo from `replace` to a real `require` on the tagged module in a **single coordinated bump** (decided 2026-06-21), and bump the frontend consumers (`calendarius`, `app`, `space-*`, `sneat-apps`) onto the published `@sneat/extension-contactus-contract`. Verify repo-wide that no consumer imports a pre-extraction location and that each builds green.

## Open Questions

- Exact mechanism for the dependency-invariant CI check stood up in Task 1 (e.g. a `go list` + `package.json` dependency-list assertion vs. nx/go graph assertion) — deliberately left to Task 1 implementation (decided 2026-06-21); inherited open question from the convention Feature.

---
*This document follows the https://specscore.md/plan-specification*
