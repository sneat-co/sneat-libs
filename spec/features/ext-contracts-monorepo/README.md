---
format: https://specscore.md/feature-specification
status: Draft
---

# Feature: Extension contracts monorepo

> [SpecScore.**Studio**](https://specscore.studio): | [Explore](https://specscore.studio/app/github.com/sneat-co/sneat-libs/spec/features/ext-contracts-monorepo?op=explore) | [Edit](https://specscore.studio/app/github.com/sneat-co/sneat-libs/spec/features/ext-contracts-monorepo?op=edit) | [Ask question](https://specscore.studio/app/github.com/sneat-co/sneat-libs/spec/features/ext-contracts-monorepo?op=ask) | [Request change](https://specscore.studio/app/github.com/sneat-co/sneat-libs/spec/features/ext-contracts-monorepo?op=request-change) |
**Status:** Draft
**Source Ideas:** —

## Summary

Consolidate every extension contract package into a single `sneat-ext-contracts` repository (name decided 2026-08-26) with per-contract independent versioning, superseding the per-extension contract repo convention ([extension-contract-repo](../extension-contract-repo/README.md)). npm package names do not change; only sources and publish pipelines move. Founder decisions recorded 2026-08-26: consolidation approved; per-contract (independent) versioning approved.

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

#### REQ: default-home-with-standalone-exception

`sneat-ext-contracts` is the DEFAULT contract home for every extension. A standalone `sneat-co/ext-<name>` repo remains an ALLOWED contract home, but only by explicit founder decision (e.g. external collaboration, distinct licensing, or unusual scale) — never a routine or unstated choice; absent that decision, a new or migrating extension's contract goes into `sneat-ext-contracts`. When the founder does choose the standalone path, its repo shape, naming, dependency invariant, and independent-release rules are governed by [extension-contract-repo](../extension-contract-repo/README.md) — the convention this feature supersedes as the *default*, while retaining it as the normative reference for that exception case. The ownership test (`ownership-test-carries-over`, below) and both cross-extension interaction directions (facade-call-in, caller-satisfied-callback) apply identically in both homes.

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

**Phase 0 — Foundation. ✅ COMPLETE 2026-08-26 (npm side).** Repo, CI, guards, boundary map, release config all live; cicd `go-module-tags.yml` shipped (PR #23). Taxus seed proved the pipeline: `@sneat/extension-taxus-contract@0.0.3` published from the monorepo (byte-identical `.d.ts` parity, desync resolved), consumer bumped, `ext-taxus` disarmed and ARCHIVED. Seed finding: taxus has no Go module — npm-only families are NORMAL (founder ruling); the Go-tag resolver's `[]` no-op is correct behavior. The Go tagging path is armed but UNPROVEN — its positive proof is pinned to the first Phase 1 family that has a real `backend/` module.

**Phase 1 — Frozen, zero-cross-import families (~19), BATCHED single-merge model (founder-approved 2026-08-26).** bookius, budgetus, docus (contract), eventius (contract), formius, gameboard, kids-club, localius, remindius, renewon, requoter (contract), rsvp-express, schoolus, sizeus, sneat-team, sourcer, splitus, trackus, work, yardius. Parallel EXTRACTION lanes (staggered waves of ~5) each deliver ONLY their family's disjoint paths — `libs/<family>/`, `<family>/` (Go module if one exists), and a version-plan file — parity-proven vs npm latest, and NEVER touch shared files (`contracts.json`, boundary config, `go.work`, tsconfig paths). One MERGER lane owns the shared files (single commit on the integration branch), batches all validated family branches, validates the integrated tree ONCE, and lands ONE merge commit → one CI cycle → one `nx release` run consuming all version plans (independent per-family versions preserved) → one batch `go-module-tags` call with all `{dir, version}` pairs. Riders: a failing family is DROPPED from the batch and joins the next one — never blocks the rest; the first batch must include ≥1 family with a real Go module (proves the tag path). Consumers mostly need no changes (npm names unchanged; caret ranges absorb patch bumps; only exact pins get one-line PRs). Disarm + archive of the old repos follows as a parallel sweep per the taxus recipe.

**Phase 2 — Platform-like contracts.** assetus, contactus (resolving its stuck 0.12.3), sportius, listus, debtus. Adds boundary-map declarations for their cross-family consumers.

**Phase 3 — Never-extracted in-repo contracts.** commitius, communitycentrum, sneatclub, togethered extract directly into the monorepo (skipping the `ext-*` generation); their product repos switch `workspace:*` → published versions. circleus's scaffold stub is either promoted to a real contract or explicitly dropped (task-level decision).

**Phase 4 — calendarius (analysis complete 2026-08-26; founder decision: no special case — calendarius consolidates like every family).** The impact analysis found it CLEANLY EXTRACTABLE: zero sneat-libs code outside `libs/extensions/calendarius/` depends on it (it resided there only as the convention's second reference implementation), so no types move to `@sneat/core`. Steps:
1. ✅ Disarm the dual publisher: `ext-calendarius`'s push-triggered `publish.yml` (the 2026-08-15 collision mechanism) is `disabled_manually` at repo level (2026-08-26); its PR #32 carries the in-file trigger removal, blocked on baseline-red required checks (coverage floor on the doomed frontend) pending an admin merge. sneat-libs is sole interim publisher.
2. EventHappening port decision — OPEN, founder (see Open Questions).
3. Migrate the last `-internal`/`-shared` consumers — assetus (3 apps) and logistus — onto `@sneat/extension-calendarius`(+`-ui`), mirroring sneat-apps PR #3489. Owner: the 0.27.0 fleet wave (after the calendarius product repo republishes with `^0.27.0` peers).
4. Delete `libs/extensions/calendarius/{internal,shared}` from sneat-libs (gated on step 3); drop from the fixed-release projects list and tsconfig paths.
5. Contract migrates to sneat-ext-contracts as a normal family step (source: sneat-libs's copy plus step 2's outcome), version continuing from npm's actual latest; remove `contract` from sneat-libs's release set.
6. Go leg per option (b): `github.com/sneat-co/ext-calendarius/backend` → `sneat-ext-contracts/calendarius`, coordinated rewrite of its direct consumers (calendarius, gameboard, togethered, sneat-bots, sneat-go) and indirect (gametable, communitycentrum, sneat-cli, requoter), old module marked `Deprecated:`, compile sweep proves no mixed paths.
7. Archive `ext-calendarius` once both halves are done; then sweep the ~30 declare-only `-contract` dependents (cargo-culted via `sneat-ext-template` — fix the template first) and the stale sneat-apps calendarius README.

**Phase 5 — Cleanup and proof.** Retire the orphaned `@sneat/extension-eventus-contract` zombie (rsvp-express migrates to eventius names); delete dead `publish.yml` leftovers in the bookius and yardius product repos; correct `backstage/docs/repository-catalog.md`; supersede [extension-contract-repo](../extension-contract-repo/README.md) as the *default* contract-repo convention via `specscore feature change-status` (it remains the normative reference for the standalone-exception shape — see `default-home-with-standalone-exception` — and its Status line does not change outside that CLI-driven transition); org-wide audit proving no repo outside the monorepo carries an armed workflow publishing any `@sneat/extension-*-contract` name.

Go `backend/` contract halves follow option (b) per the Decisions section: each family's Phase 1/2 step gains a Go leg — move the `backend/` module to `<name>/` in the monorepo, rewrite that family's Go consumers in one coordinated step, mark the old module `Deprecated:` in its go.mod, and prove via a compile sweep that no consumer mixes old and new paths. Phase 0 must first deliver the shared cicd per-module tagging workflow; until it exists, families migrate their npm side only and their `ext-*` repos stay unarchived.

## Acceptance Criteria

- Every `@sneat/extension-*-contract` npm package's latest version is published from the contracts monorepo, with per-project version plans, and no other repository in the org holds an armed workflow that can publish any of those names (verified by org-wide workflow audit).
- No consumer repo needed any change to keep installing contracts during the migration (names unchanged; spot-verified on sneat-apps and two product repos mid-migration).
- The five tag-desynced families publish their next versions continuing from npm's actual latest.
- Tier-coherence check and boundary lint run on every PR and are green at cutover completion.
- `extension-contract-repo` is Superseded via specscore CLI status change, referencing this feature.
- Each archived `ext-*` repo's description points to the monorepo.

## Decisions

- **Repo name: `sneat-ext-contracts`** — decided by founder 2026-08-26. Names the contents; blocks runtime scope creep by construction.
- **Archived repo disposition: ARCHIVE read-only first** — founder 2026-08-26; preserves history and incoming links, description points at the monorepo, deletion remains possible later. First applied: `ext-taxus`.
- **Go contract halves: option (b), full polyglot consolidation** — founder selection 2026-08-26, coordinator concurrence, subject to three riders now embedded in Behavior and the migration plan: (1) multi-module layout (one `go.mod` per extension, `github.com/sneat-co/sneat-ext-contracts/<name>`, tagged `<name>/v0.x.y`) for symmetry with per-contract npm versioning; (2) automated per-module tagging lands in the shared `sneat-co/cicd` workflow during Phase 0 — the Go side does not start without it, or manual multi-module tags would recreate the tag-desync disease this feature cures; (3) per-family atomic cutover — old and new import paths are different Go types, so each family's consumer rewrite lands complete in one wave step, the old module immediately gains a go.mod `Deprecated:` notice, and a compile sweep proves no mixed-path usage remains. Accepted cost: Go version history does not carry across a module path change; each contract restarts Go versioning at the new path (cosmetic for frozen type-only modules).

## Open Questions

(The archived-repo disposition moved to Decisions: ARCHIVE first — founder 2026-08-26.)
- **EventHappening port (calendarius, Phase 4 step 2)** — founder decision: `ext-calendarius`'s abandoned 0.24.1 lineage contains ~340–400 lines of shipped, tested contract work absent from the consumed 0.27.0 line (`EventHappeningDto` hierarchy/recurrence contract + happening pricing/planned-slot validation), whose Go backend half is ALREADY LIVE in `calendarius/backend` (facade4calendarius event_happening_*). Port it forward into the consolidated contract (coordinator recommendation — abandoning orphans live server capability with no client contract expressing it), or explicitly abandon the planned-event feature scope.

---
*This document follows the https://specscore.md/feature-specification*
