# Plan: Decouple `contactus` into a dedicated `sneat-co/contactus` public repo

**Status:** Draft for review — NO code changes until approved.
**Date:** 2026-06-20
**Pattern:** mirror the dedicated-repo layout of `assetus`/`listus`/`debtus`/`calendarius`/`eventus`
(`backend/` + `frontend/` + `firebase.json` + `LICENSE` + `README.md` + `spec/` + `specscore.yaml`).

## 1. Current state

| Tier | Location today | Notes |
|---|---|---|
| **Backend** | `sneat-core-modules/contactus/` | 68 Go files, part of the single module `github.com/sneat-co/sneat-core-modules` |
| **Frontend** | `sneat-libs/libs/extensions/contactus/{contract,shared,internal}` | already on the tier convention; published to npm at `0.12.0` |

## 2. Target

`github.com/sneat-co/contactus` (public):
- `backend/` → new module `github.com/sneat-co/contactus/backend`, packages `…/contactus/{dal4contactus,dbo4contactus,dto4contactus,facade4contactus,…}`
- `frontend/` → nx workspace holding `@sneat/extension-contactus-{contract,shared,internal}`
- `firebase.json`, `LICENSE`, `README.md`, `spec/`, `specscore.yaml`

## 3. Blast radius (why this is not a leaf extraction)

**Backend consumers of `sneat-core-modules/contactus` — 7 repos / ~130+ files:**
`debtus` (57), `sneat-go-backend` (23), `logistus` (21), `sneat-bots` (10), `sneat-go` (8), `calendarius` (4), and **70 refs inside `sneat-core-modules` itself**.

**Frontend consumers of `@sneat/extension-contactus-*`:**
`sneat-libs` → `calendarius` (24 files), `app` (1), `space` (1); plus **`sneat-apps` (~202 files)**.

## 4. ⛔ The hard blocker — backend module cycle

`contactus` has a **bidirectional** relationship with four sibling core modules:

| contactus depends on | …which imports contactus back |
|---|---|
| `spaceus` (13) | `spaceus → contactus` (4) |
| `linkage` (9) | `linkage → contactus` (4) |
| `userus` (4) | `userus → contactus` (9) |
| `invitus` (1) | `invitus → contactus` (8) |

Today this is legal (one Go module, package graph is acyclic). **After extraction it becomes a module-level cycle** `contactus ↔ sneat-core-modules`. Go tolerates module cycles, but they make releases chicken-and-egg (you can't tag a self-consistent pair) and are a long-term maintenance trap.

**This cycle MUST be broken before (or as part of) the backend extraction.** Options:
- **(B1) Interface inversion** — define the contactus-facing behaviour that `spaceus/linkage/userus/invitus` need as interfaces *they* own (or in a lower shared module), so those modules no longer import concrete contactus. Cleanest; real refactoring across 4 modules.
- **(B2) Extract the cluster together** — move `contactus + spaceus + linkage + userus + invitus` into one repo. But that's "extract half of core-modules," not "decouple contactus."
- **(B3) Accept the cycle** — bidirectional module deps + `replace` directives during dev. Rejected: versioning/release pain, brittle CI.

Recommendation: **B1**, scoped to only the symbols on the back-edges (≈25 files across the 4 modules). This is its own substantial workstream and the critical path for the backend.

## 5. Workstreams

### Workstream A — Frontend (tractable, do first)
1. Create `sneat-co/contactus` repo with the dedicated-repo skeleton (nx frontend mirroring `assetus/frontend`; copy the tier convention + `enforce-module-boundaries` matrix already perfected).
2. Move `libs/extensions/contactus/{contract,shared,internal}` from sneat-libs → `contactus/frontend/libs/extensions/contactus/…` (git history-preserving).
3. In **sneat-libs**: delete the in-repo contactus libs; repoint `calendarius` (24 files), `app` (1), `space` (1) onto the **published** `@sneat/extension-contactus-{contract,shared}` (npm) as installed deps. Drop the workspace path entries. Verify CI green.
4. Wire `contactus/frontend`'s own app/deploy (if contactus ships a standalone app like the others) + `publish-extension.yml` equivalence so the npm packages now publish from the new repo, not sneat-libs.
5. **sneat-apps** (~202 files) already consumes `@sneat/contactus-*`/`@sneat/extension-contactus-*` via npm — no source move, but its dependency versions track the new repo's releases. Covered by the existing deferred sneat-apps migration; no new break.

### Workstream B — Backend (gated on cycle-break)
1. **B1 cycle-break** in `sneat-core-modules`: invert the `spaceus/linkage/userus/invitus → contactus` edges to interfaces; land + tag a core-modules release. (No repo move yet — pure decoupling, verifiable in place.)
2. Create `contactus/backend` module; `git mv` the `contactus/` packages in; module path `github.com/sneat-co/contactus/backend`; it `require`s `sneat-core-modules` (one-directional now) for spaceus/linkage/userus/invitus.
3. Update **all 7 consumer repos'** imports `sneat-core-modules/contactus/…` → `contactus/backend/…` + `go.mod require` + `go mod tidy`; sequence releases (tag contactus/backend first, then bump consumers).
4. Remove `contactus/` from `sneat-core-modules`; tag the core-modules release that no longer ships it.

## 6. Sequencing & release order
1. A1–A3 (frontend move + sneat-libs reroute) — independent, low risk, ship first.
2. B1 (cycle-break in core-modules) — prerequisite, ship + tag.
3. B2 (backend move to new repo) — tag `contactus/backend v…`.
4. B3 (consumer repos repoint, in dependency order: core-modules → sneat-go-backend → debtus/logistus/calendarius/sneat-bots/sneat-go) — one PR per repo.
5. B4 (drop contactus from core-modules) — final, after all consumers cut over.

## 7. Risks
- **Module cycle (Section 4)** — top risk; B1 is mandatory and non-trivial.
- **Coordinated multi-repo release** — 7 backend consumers; mis-sequencing breaks builds. Mitigate with `replace` directives during transition + a tracking checklist.
- **contactus is foundational** — a broken release blocks debtus/logistus/sneat-go-backend simultaneously. Stage behind CI on each repo.
- **Frontend/sneat-apps version skew** — sneat-apps pins versions; bump deliberately.

## 8. Recommendation
Split into **two approved efforts**: (A) frontend decoupling now (self-contained, reuses the proven convention), and (B) backend extraction as a separate, carefully-sequenced project whose **first task is the B1 cycle-break** — without which a clean dedicated backend module is not achievable. Do not start B2–B4 until B1 lands.

## 9. Decisions (resolved 2026-06-20)
- **Full app:** the new repo includes a standalone `contactus-app` + `firebase.json` + e2e + deploy, mirroring `assetus`/`listus` exactly (not libs-only).
- **Cycle-break precedes the move:** B1 (interface inversion) must land + tag in `sneat-core-modules` *before* contactus becomes its own module. No interim bidirectional module cycle.
- **Backend module path:** `github.com/sneat-co/contactus/backend`.
- **Execution order:** start **Workstream A (frontend)** now; Workstream B (backend) is a separate follow-up gated on B1.
