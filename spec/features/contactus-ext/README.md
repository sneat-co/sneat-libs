---
format: https://specscore.md/feature-specification
status: Approved
---

# Feature: contactus reference extraction into `contactus-ext`

> [SpecScore.**Studio**](https://specscore.studio): | [Explore](https://specscore.studio/app/github.com/sneat-co/sneat-libs/spec/features/contactus-ext?op=explore) | [Edit](https://specscore.studio/app/github.com/sneat-co/sneat-libs/spec/features/contactus-ext?op=edit) | [Ask question](https://specscore.studio/app/github.com/sneat-co/sneat-libs/spec/features/contactus-ext?op=ask) | [Request change](https://specscore.studio/app/github.com/sneat-co/sneat-libs/spec/features/contactus-ext?op=request-change) |
**Status:** Approved
**Source Ideas:** per-extension-contract-repo

## Summary

Apply the `extension-contract-repo` convention to `contactus` as the reference implementation: stand up `sneat-co/contactus-ext`, relocate the backend `contactusmodels` and the frontend contract lib into it, re-home test-passing contributor interfaces, repoint all consumers, and release contract-first. Explicitly iterative — the goal is the right direction proven end-to-end on `contactus`, not one-shot completeness.

## Problem

The `extension-contract-repo` convention (Approved) defines *where* an extension's contract should live and *what* may live there, but no extension yet follows it. `contactus`'s contract surface is currently scattered — backend data/const shapes in `sneat-core-modules/contactusmodels`, cross-module contributor interfaces in sibling facades (`facade4spaceus`, `facade4userus`, `facade4invitus`, `facade4linkage`), and the frontend contract lib inside the main repo's frontend. Consumers therefore pin to heavy or wrongly-located packages, and there is no worked example for the other extensions to copy. This Feature makes `contactus` the reference: it consolidates the cleanly-relocatable contract into `contactus-ext` and validates the convention's invariant and ownership test against real code.

## Behavior

### Repo standup

#### REQ: contactus-ext-repo

Create `sneat-co/contactus-ext` following the `extension-contract-repo` convention: a `backend/` Go module at `github.com/sneat-co/contactus-ext/backend` and a `frontend/` nx library published as `@sneat/extension-contactus-contract`. The repo depends only on foundational/core code, never another extension.

### Backend extraction

#### REQ: relocate-contactusmodels

Move `contactus`'s own contract shapes — `briefs4contactus` and `const4contactus` — out of `sneat-core-modules/contactusmodels` into `contactus-ext/backend` (history-preserving). This relocation is done **contract-first**: the packages land in `contactus-ext/backend` (which then depends only on foundational/core code, e.g. `sneat-go-core`) and that module is published *before* importers are repointed — see `contract-first-release`. The removal of the packages from `sneat-core-modules` and the import-path repoint of every consumer happen **after** the publish, via a real pinned Go `require` (never a committed local `replace`), as specified in `repoint-consumers`. Because these shapes are shared across several independently-published Go modules, the relocation cannot be completed as a single local edit — see `repoint-consumers` for why.

#### REQ: rehome-passing-contributors

Move each contributor interface whose entire signature is expressible in `contactus`-own plus foundational/core types — `ContactusSpaceContributor` is the proven case — from its sibling facade into `contactus-ext/backend`. The sibling imports the interface down from `contactus-ext`; the `contactus` main repo provides and registers the concrete implementation at bootstrap.

#### REQ: bilateral-stays-consumer-owned

Leave every contributor interface that fails the ownership test in its consumer module, unmoved. `ContactusAccess` (whose signatures reference `facade4invitus.MemberContact`, `dbo4invitus.InviteChannel`, `dbo4spaceus.SpaceEntry`) stays consumer-owned, because relocating it would force `contactus-ext` to import `invitus`/`spaceus` and break the zero-other-extension-deps invariant.

### Frontend extraction

#### REQ: relocate-frontend-contract

Move the `@sneat/extension-contactus-contract` nx lib out of the main repo into `contactus-ext/frontend` (history-preserving), and remove its old in-repo location and workspace path entry. The lib is published from `contactus-ext` going forward.

### Consumer repoint

#### REQ: repoint-consumers

Repoint every consumer of the relocated contract onto the **published** `contactus-ext` artifacts.

**Backend (Go) — the true consumer set is 7 modules, not the four "siblings".** `invitus`/`spaceus`/`userus`/`linkage` are *packages inside the single `sneat-core-modules` module*, so repointing them is an internal import-path rewrite within that one module, not a separate dependency. The modules that actually consume `briefs4contactus`/`const4contactus` and must each repoint are: `sneat-core-modules` (the relocated-from source), `github.com/sneat-co/contactus/backend`, `github.com/sneat-co/debtus/backend`, `github.com/sneat-co/logistus/backend`, `github.com/sneat-co/sneat-bots`, `github.com/sneat-co/sneat-go-backend`, and `github.com/sneat-co/sneat-go`.

**The backend cutover is publish-first; a local `replace` web is not a valid mechanism.** Once `briefs4contactus`/`const4contactus` move modules, Go treats the old and new copies as *distinct, incompatible types*, so every module in a build must resolve a single copy. A consumer cannot repoint-and-build locally while the interfaces it implements (declared in `sneat-core-modules`) still resolve the published old types — and committed `replace … => ../…` directives only work on one machine and break CI for every module and every other consumer. Therefore each consumer repoints by switching to a **real pinned `require`** on the published `contactus-ext` module (and, transitively, on the republished `sneat-core-modules`/`contactus` that carry the new type), in the dependency order defined by `contract-first-release`.

**Frontend (npm):** consumers (`calendarius`, `app`, `space-*`, `sneat-apps`, and the `contactus` main repo's own `internal`+`shared` frontend tiers) depend on the published `@sneat/extension-contactus-contract` by package name + pinned version.

No consumer imports a pre-extraction location after cutover, and each consumer builds green against published artifacts (no committed local `replace`/path override).

### Release

#### REQ: contract-first-release

Release `contactus-ext` first (tag the Go module + publish the npm package), then repoint+republish consumers in **strict dependency order** — each step pins the previously-published version with a real `require`, never a local `replace`:

1. **Tag/publish `contactus-ext`** (Go module tag + npm `@sneat/extension-contactus-contract`).
2. **`sneat-core-modules`** — rewrite its internal `contactusmodels` imports to the published `contactus-ext`, delete the old packages, `require` the tag, republish.
3. **`github.com/sneat-co/contactus/backend`** — repoint onto the republished `sneat-core-modules` + `contactus-ext`, republish.
4. **Leaf modules** — `debtus/backend`, `logistus/backend`, `sneat-bots`, `sneat-go-backend`, `sneat-go` — repoint onto the published versions and build green.

After cutover, the convention's dependency-invariant check passes on `contactus-ext` — it carries no `@sneat/extension-*` or sibling-module implementation dependency.

## Dependencies

- extension-contract-repo

## Acceptance Criteria

### AC: contactus-ext-repo

Scenario: contactus-ext exists and is dependency-light
Given the extraction is complete
When `sneat-co/contactus-ext` is inspected
Then it has a `backend/` Go module `github.com/sneat-co/contactus-ext/backend` and a `frontend/` lib `@sneat/extension-contactus-contract`, and neither declares a dependency on any other extension.

### AC: relocate-contactusmodels

Scenario: contactusmodels lives in contactus-ext, not core-modules
Given the backend extraction is complete
When `briefs4contactus` and `const4contactus` are located
Then they reside under `contactus-ext/backend`, `sneat-core-modules/contactusmodels` no longer contains them, and every former importer resolves them from the new path.

### AC: rehome-passing-contributors

Scenario: A test-passing contributor interface moves to contactus-ext
Given `ContactusSpaceContributor`, whose signature uses only contactus-own + core types
When the backend extraction is complete
Then its interface is declared in `contactus-ext/backend`, the sibling (`spaceus`) imports it from there, and the `contactus` main repo registers the implementation at bootstrap.

### AC: bilateral-stays-consumer-owned

Scenario: A bilateral interface is not moved
Given `ContactusAccess`, whose signature references invitus/spaceus types
When the extraction is complete
Then it remains in its consumer module and is absent from `contactus-ext`, and `contactus-ext` imports neither `invitus` nor `spaceus`.

### AC: relocate-frontend-contract

Scenario: The frontend contract lib lives in contactus-ext
Given the frontend extraction is complete
When `@sneat/extension-contactus-contract` is located
Then its sources reside under `contactus-ext/frontend`, the old in-repo lib location and its workspace path entry are gone, and the package publishes from `contactus-ext`.

### AC: repoint-consumers

Scenario: Every consumer resolves the published contract, none a pre-extraction location
Given the cutover is complete
When the 7 backend Go modules (`sneat-core-modules`, `contactus/backend`, `debtus/backend`, `logistus/backend`, `sneat-bots`, `sneat-go-backend`, `sneat-go`) and the frontend consumers (`calendarius`, `app`, `space-*`, `sneat-apps`, and the `contactus` main repo's `internal`+`shared` tiers) are built
Then each resolves the contract from the published `contactus-ext` artifacts via a real pinned `require`/dependency (no committed local `replace` or path override), and none imports a pre-extraction location.

### AC: contract-first-release

Scenario: Contract is released before its consumers, in dependency order
Given the release sequence is executed
When versions are published
Then `contactus-ext` is tagged/published first, then consumers are repointed+republished in strict dependency order (`sneat-core-modules` → `contactus/backend` → leaf modules), each pinning the prior published version with a real `require` (never a local `replace`), and the convention's dependency-invariant check passes on `contactus-ext`.

## Open Questions

- Whether the four backend siblings repoint in a single coordinated release or one PR per repo (the `contactus-repo-extraction-plan` favours one PR per repo, dependency-ordered). Resolved at plan time.
- Whether the frontend relocation reuses the git history move performed (or planned) by `contactus-repo-extraction-plan` Workstream A, or starts from the current in-repo lib. Resolved at plan time.
- Which additional contributor interfaces beyond `ContactusSpaceContributor` pass the ownership test (`ContactusCountryUpdater`, linkage `DboFactory`) — to be classified during backend extraction, per the convention's `ownership-test`.

---
*This document follows the https://specscore.md/feature-specification*
