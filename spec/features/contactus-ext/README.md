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

Move `contactus`'s own contract shapes — `briefs4contactus` and `const4contactus` — out of `sneat-core-modules/contactusmodels` into `contactus-ext/backend` (history-preserving). Repoint every importer (the `contactus` main repo and the sibling modules that consume these shapes) to the new import path, and remove the packages from `sneat-core-modules`.

#### REQ: rehome-passing-contributors

Move each contributor interface whose entire signature is expressible in `contactus`-own plus foundational/core types — `ContactusSpaceContributor` is the proven case — from its sibling facade into `contactus-ext/backend`. The sibling imports the interface down from `contactus-ext`; the `contactus` main repo provides and registers the concrete implementation at bootstrap.

#### REQ: bilateral-stays-consumer-owned

Leave every contributor interface that fails the ownership test in its consumer module, unmoved. `ContactusAccess` (whose signatures reference `facade4invitus.MemberContact`, `dbo4invitus.InviteChannel`, `dbo4spaceus.SpaceEntry`) stays consumer-owned, because relocating it would force `contactus-ext` to import `invitus`/`spaceus` and break the zero-other-extension-deps invariant.

### Frontend extraction

#### REQ: relocate-frontend-contract

Move the `@sneat/extension-contactus-contract` nx lib out of the main repo into `contactus-ext/frontend` (history-preserving), and remove its old in-repo location and workspace path entry. The lib is published from `contactus-ext` going forward.

### Consumer repoint

#### REQ: repoint-consumers

Repoint every consumer of the relocated contract onto the new `contactus-ext` packages: backend siblings (`spaceus`, `linkage`, `userus`, `invitus`) and the `contactus` main repo onto the relocated Go packages; frontend consumers (`calendarius`, `app`, `space-*`, `sneat-apps`) onto the published `@sneat/extension-contactus-contract`. No consumer imports an old location after cutover.

### Release

#### REQ: contract-first-release

Release `contactus-ext` first (tag the Go module + publish the npm package), then bump consumers in dependency order. After cutover, the convention's dependency-invariant check passes on `contactus-ext` — it carries no `@sneat/extension-*` or sibling-module implementation dependency.

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

Scenario: No consumer imports an old contract location
Given the cutover is complete
When the backend siblings, the `contactus` main repo, and the frontend consumers (`calendarius`, `app`, `space-*`, `sneat-apps`) are built
Then each resolves the contract from the `contactus-ext` packages and none imports a pre-extraction location.

### AC: contract-first-release

Scenario: Contract is released before its consumers
Given the release sequence is executed
When versions are published
Then `contactus-ext` is tagged/published first, consumers are bumped onto it in dependency order, and the convention's dependency-invariant check passes on `contactus-ext`.

## Open Questions

- Whether the four backend siblings repoint in a single coordinated release or one PR per repo (the `contactus-repo-extraction-plan` favours one PR per repo, dependency-ordered). Resolved at plan time.
- Whether the frontend relocation reuses the git history move performed (or planned) by `contactus-repo-extraction-plan` Workstream A, or starts from the current in-repo lib. Resolved at plan time.
- Which additional contributor interfaces beyond `ContactusSpaceContributor` pass the ownership test (`ContactusCountryUpdater`, linkage `DboFactory`) — to be classified during backend extraction, per the convention's `ownership-test`.

---
*This document follows the https://specscore.md/feature-specification*
