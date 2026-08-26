---
format: https://specscore.md/feature-specification
status: Draft
---

# Feature: Extension contracts monorepo

> [SpecScore.**Studio**](https://specscore.studio): | [Explore](https://specscore.studio/app/github.com/sneat-co/sneat-libs/spec/features/ext-contracts-monorepo?op=explore) | [Edit](https://specscore.studio/app/github.com/sneat-co/sneat-libs/spec/features/ext-contracts-monorepo?op=edit) | [Ask question](https://specscore.studio/app/github.com/sneat-co/sneat-libs/spec/features/ext-contracts-monorepo?op=ask) | [Request change](https://specscore.studio/app/github.com/sneat-co/sneat-libs/spec/features/ext-contracts-monorepo?op=request-change) |
**Status:** Draft
**Source Ideas:** —

## Summary

Consolidate every extension contract package into a single `sneat-ext-contracts` repository (working name — see Open Questions) with per-contract independent versioning, superseding the per-extension contract repo convention ([extension-contract-repo](../extension-contract-repo/README.md)). npm package names do not change; only sources and publish pipelines move. Founder decisions recorded 2026-08-26: consolidation approved; per-contract (independent) versioning approved.

## Problem

The approved `ext-<name>` convention produced ~24 live single-contract repos, each with its own publish pipeline needing the same secrets, CI, and guard adoption. A 2026-08-26 fleet audit found the distributed model failing silently in production:

- **5 of 24 live pipelines desynced** — a release tag exists but npm silently kept the previous version — including `@sneat/extension-contactus-contract`, the fleet's most-depended-on package (35 consumers), stuck one version behind its own tag for 5+ weeks (contactus, listus, taxus, schoolus, rsvp-express).
- One documented production incident: a mis-wired secret kept `ext-debtus`/`ext-splitus` unpublished and broke debtus.app deploys for two days (memorialized in `sneat-ext-contract-template`'s publish.yml comment).
- Contract version skew between separately published packages caused most deferrals in the 2026-08-25 renamed-extensions migration wave (stale `^0.9.0` peers, exact-pins on dead package names).
- The ecosystem's own map drifted: `backstage/docs/repository-catalog.md` names a contract repo that does not exist under that name.
- One live dual-source landmine: `@sneat/extension-calendarius-contract` publishes from BOTH sneat-libs (fixed train, currently authoritative at 0.27.0) and the stalled-but-armed `ext-calendarius` (0.24.1); they have already collided on four version numbers (release-repair incident 2026-08-15).

Measurements (2026-08-26): 934 contract import statements fleet-wide, 84% intra-family / 16% cross-family; contactus receives 81 of 148 cross-family imports; 26 of 35 families have zero cross-family consumers; runtime:contract churn asymmetry up to 24× (contracts are mostly frozen). Frozen, uniform, type-only packages are what a monorepo maintains cheaply and ~24 dedicated repos maintain expensively. Nobody is monitoring 24 pipelines; one pipeline matches how this fleet is actually operated.

## Behavior

### End-to-end journeys (observable good results)

**Contract author (usually an AI agent):** clones one repo, edits one contract lib, adds an Nx version plan naming that project and its bump, opens one PR. CI enforces boundary rules, peer ranges, and tier coherence on the PR. On merge, the release pipeline versions and publishes ONLY the projects named in consumed version plans. *Good result: npm shows the new version of exactly that contract, minutes after merge, with correct provenance; no other contract republished.*

**Consumer repo (product repo or app):** nothing changes at adoption time — package names and the npm registry location are identical. On its next routine bump it picks up the new version. *Good result: `pnpm up @sneat/extension-<x>-contract` works before, during, and after the family's source migration, with no consumer-side edit.*

**Migration operator (per family):** imports the contract source into the monorepo, proves API parity against npm latest, publishes the next version from the new home, then disarms the old pipeline and archives the old repo. *Good result: npm latest for that family is now published from the monorepo, the old repo is archived and cannot publish, and an org-wide audit finds no second armed publisher for that npm name.*

### Repo shape

#### REQ: single-contracts-repo

All extension contract packages (`@sneat/extension-<name>-contract`) live as Nx libraries in one dedicated repository. Runtimes, UIs, and backends stay in their product repos. The repo holds contracts only; its name says so.

#### REQ: per-contract-independent-versioning

Nx release runs in independent (per-project) mode driven by version plans. Each contract's version tracks its own evolution; a frozen contract republishes never. Converting to a fixed train later is an acknowledged cheap fallback if guardrails prove insufficient — this is not a one-way door.

#### REQ: version-continuity-from-npm

Each migrated contract's next version derives from the npm registry's actual latest (not from git tags in the old repo). This automatically resolves the five tag-vs-npm desyncs: the phantom tags are abandoned, npm reality wins.

### Dependency rules

#### REQ: explicit-cross-contract-boundaries

Supersedes the old `zero-other-extension-deps` invariant, which fleet reality already violates (148 cross-family contract imports). Contract→contract dependencies ARE permitted, but only when declared in the repo's module-boundary configuration (Nx tags + enforce-module-boundaries), acyclic, and using workspace-internal references that the release process widens automatically (`updateDependents`). Contract→runtime or contract→app dependencies remain forbidden absolutely. The initial boundary map is seeded from the measured import graph (contactus and assetus as the permitted platform-like targets).

#### REQ: ownership-test-carries-over

The [extension-contract-repo](../extension-contract-repo/README.md) ownership test survives unchanged: a type belongs in a contract only if its entire signature is expressible in that extension's own types plus foundational/core types. Both cross-extension interaction directions (facade-call-in, caller-satisfied-callback) also carry over verbatim.

### Pipeline and guards

#### REQ: single-guarded-pipeline

One publish pipeline (workflow_dispatch with dry_run defaulting true, plus release-on-main via version plans), calling the shared `sneat-co/cicd` reusable workflows with every fleet guard enabled from day one: `check-zonejs: true`, `peer-range-strict: true` (no bare `^0.0.x` ranges ever enter this repo), and top-level `permissions: contents: write`.

#### REQ: tier-coherence-check

CI asserts on every PR that the latest version of every contract in the repo installs and type-checks together in one synthetic consumer. This is the guardrail that keeps independent versioning skew-safe.

### Migration plan (full cutover; npm names never change)

Phases execute in order; each family reaches the migration-operator good result before its old repo is archived. Batches of ≤4 parallel lanes.

**Phase 0 — Foundation.** Create the repo, CI, guards, boundary map, release config. Prove the machinery end to end with ONE seed family (taxus — frozen, zero cross-imports, and one of the desynced pipelines, so the seed also proves REQ version-continuity-from-npm). *Gate: seed family's next version live on npm from the new repo; `ext-taxus` archived.*

**Phase 1 — Frozen, zero-cross-import families (~19).** bookius, budgetus, docus (contract), eventius (contract), formius, gameboard, kids-club, localius, remindius, renewon, requoter (contract), rsvp-express, schoolus, sizeus, sneat-team, sourcer, splitus, trackus, work, yardius. Per family: source import with provenance note → `.d.ts` parity vs npm latest → publish next patch from monorepo → disarm + archive old repo.

**Phase 2 — Platform-like contracts.** assetus, contactus (resolving its stuck 0.12.3), sportius, listus, debtus. Adds boundary-map declarations for their cross-family consumers.

**Phase 3 — Never-extracted in-repo contracts.** commitius, communitycentrum, sneatclub, togethered extract directly into the monorepo (skipping the `ext-*` generation); their product repos switch `workspace:*` → published versions. circleus's scaffold stub is either promoted to a real contract or explicitly dropped (task-level decision).

**Phase 4 — calendarius (gated).** Blocked on the dependency-direction and divergence impact analysis (in flight 2026-08-26). Resolves the sneat-libs entanglement (moving genuinely platform-owned types into `@sneat/core` if the analysis finds any), moves the authoritative contract in, disarms `ext-calendarius`, and schedules retirement of sneat-libs's `-internal`/`-shared` copies behind their remaining consumers.

**Phase 5 — Cleanup and proof.** Retire the orphaned `@sneat/extension-eventus-contract` zombie (rsvp-express migrates to eventius names); delete dead `publish.yml` leftovers in the bookius and yardius product repos; correct `backstage/docs/repository-catalog.md`; supersede [extension-contract-repo](../extension-contract-repo/README.md) via `specscore feature change-status`; org-wide audit proving no repo outside the monorepo carries an armed workflow publishing any `@sneat/extension-*-contract` name.

Go `backend/` contract halves are explicitly OUT of scope for these phases pending the Open Question below — the `ext-*` repos are archived only once their Go half's disposition is decided; until then Phase 1/2 disarms their npm pipelines but leaves the repos unarchived if a Go module is present.

## Acceptance Criteria

- Every `@sneat/extension-*-contract` npm package's latest version is published from the contracts monorepo, with per-project version plans, and no other repository in the org holds an armed workflow that can publish any of those names (verified by org-wide workflow audit).
- No consumer repo needed any change to keep installing contracts during the migration (names unchanged; spot-verified on sneat-apps and two product repos mid-migration).
- The five tag-desynced families publish their next versions continuing from npm's actual latest.
- Tier-coherence check and boundary lint run on every PR and are green at cutover completion.
- `extension-contract-repo` is Superseded via specscore CLI status change, referencing this feature.
- Each archived `ext-*` repo's description points to the monorepo.

## Open Questions

- **Repo name** — `sneat-ext-contracts` (recommended: names the contents, blocks runtime scope creep) vs `sneat-extensions` (founder-floated; right only if the repo is ever intended to absorb more than contracts). Blocks Phase 0.
- **Go contract halves** — the superseded convention made `ext-<name>` polyglot (Go `backend/` + npm `frontend/`). Go modules are import-path-addressed, so unlike npm the Go side CANNOT move consumer-invisibly: options are (a) consolidate npm only and keep Go contract modules where they are (splits the pairing; `ext-*` repos live on as Go-only), (b) full polyglot consolidation as a multi-module Go repo with a coordinated import-path rewrite across backend consumers, (c) fold Go contract types into the `sneat-go-core`/core-modules layer. Founder decision; blocks archiving any `ext-*` repo that has a `backend/`, but not the npm phases.
- **Archived repo disposition** — archive read-only (recommended: preserves history and incoming links) vs delete.
- **calendarius cutover steps** — filled in from the impact analysis when it reports (Phase 4 gate).

---
*This document follows the https://specscore.md/feature-specification*
