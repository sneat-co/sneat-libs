# Handover — contactus-ext Plan, Task 2 (backend `contactusmodels` relocation)

**Date:** 2026-06-23
**Author session:** specstudio:implement run on the contactus-ext Plan
**Status:** ✅ Option A executed (2026-06-23). Consumer/core working-tree changes rolled back; the `contactus-ext` backend relocation kept & committed. **Next: revise the Feature + Plan (publish-first sequencing) before continuing Task 2.** See "## Option A — executed" below.

> Read this top-to-bottom before resuming. The headline: **Task 2 as written in the Plan is not buildable as a local-`replace` operation across these 7 published Go modules. The cutover is fundamentally publish-first.** The Plan/Feature must be re-sequenced before the consumer repoint is attempted again.

---

## Where the Plan stands

Plan: `~/projects/sneat-co/sneat-libs/spec/plans/contactus-ext.md` (Status: `Executing`)
Source Feature: `spec/features/contactus-ext/README.md` (Approved)
Convention Feature: `spec/features/extension-contract-repo/README.md` (Approved)

| Task | What | Status |
|---|---|---|
| 1 | Stand up `sneat-co/contactus-ext` repo | **done** (repo `1b39377`) |
| 4 | Frontend contract lib relocation | **done & committed** (see below) |
| 2 | Backend `contactusmodels` relocation + repoint | **pending** (half-applied in working trees, NOT committed) |
| 3 | Classify/re-home contributor interfaces | pending |
| 5 | Release contract-first (tag Go module + publish npm) | pending |
| 6 | Repoint remaining consumers, flip replace→require | pending |

### Task 4 (already shipped — context only)
Committed, **not pushed**, all carry `Verifies: contactus-ext#ac:relocate-frontend-contract`:
- `contactus-ext` `a21f691` on branch `feat/frontend-contract-relocation` (lib at `frontend/libs/extensions/contactus/contract` + new nx workspace)
- `contactus` `ca01ec4` on branch `feat/contactus-app-e2e` (lib removed + tsconfig path entry removed)
- `sneat-libs` `58aea74` on branch `docs/contactus-legacy-retirement-plan` (Plan Task 4 → done + sidekick seed)

Sidekick seed captured (Task 6 frontend gap): `spec/ideas/seeds/task-6-must-repoint-the-contactus-main-repo-s-own-frontend.md` — Task 6's frontend-consumer list omits the contactus main repo's own frontend (internal+shared, ~105 importers).

---

## Task 2 — the discovery that changes everything

### Ground truth (differs from the Plan)
- The "siblings" `invitus`/`spaceus`/`userus`/`linkage` are **packages inside the single `sneat-core-modules` module**, not separate repos. Repointing them = import-string rewrite within one module (no require/replace).
- The two moved packages are cleanly relocatable: `const4contactus` → only `sneat-go-core/coretypes`; `briefs4contactus` → `const4contactus` + `sneat-go-core/*`. So **`contactus-ext/backend` requires only `sneat-go-core` — no edge back to `sneat-core-modules`. No module cycle.** Invariant holds.
- **Real blast radius = 7 Go modules / ~107 files** (Plan only anticipated core-modules + contactus main):

| Module | go.mod path | files | module path |
|---|---|---|---|
| sneat-core-modules | `sneat-core-modules/go.mod` | 27→25 | `github.com/sneat-co/sneat-core-modules` |
| contactus | `contactus/backend/go.mod` | 26 | `github.com/sneat-co/contactus/backend` |
| debtus ⚠️ | `debtus/backend/go.mod` | 22 | `github.com/sneat-co/debtus/backend` |
| sneat-go-backend ⚠️ | `sneat-go-backend/go.mod` | 12 | `github.com/sneat-co/sneat-go-backend` |
| logistus ⚠️ | `logistus/backend/go.mod` | 9 | `github.com/sneat-co/logistus/backend` |
| sneat-bots ⚠️ | `sneat-bots/go.mod` | 7 | `github.com/sneat-co/sneat-bots` |
| sneat-go ⚠️ | `sneat-go/go.mod` | 4 | `github.com/sneat-co/sneat-go` |

⚠️ = consumer the Plan/Feature never enumerated.

### THE ROOT-CAUSE PROBLEM (why "full local cutover now" fails)
Moving `briefs4contactus.ContactBrief`/`ContactBase` from `sneat-core-modules` to `contactus-ext` makes them a **new, distinct type**. Every module in a build must see ONE copy. But:
- `contactus/backend` implements interfaces declared in `sneat-core-modules` (`facade4spaceus.ContactusSpaceContributor.BuildSpaceCreationRecords(... briefs4contactus.ContactBrief ...)`, `facade4invitus.ContactusAccess`, `MemberContact`, `SpaceContactsSession`, `ContactSession`). It resolves `sneat-core-modules` at its **published** version (old type) while its own rewritten code uses the **new** contactus-ext type → they don't unify → compile error.
- `debtus`/`sneat-bots` additionally pull **published** `contactus/backend` (old type) → same clash.

To build locally you'd need a **transitive web of `replace` directives** (`sneat-core-modules` + `contactus/backend` + `contactus-ext` → local paths) in every consumer. **Killer:** those `replace => ../../...` paths only resolve on this machine — **committing them breaks every repo's CI and all other consumers.**

### Conclusion / correct sequencing
The `extension-contract-repo` convention is **publish-first by design** (REQ `independent-release` / `contract-first-release`). Dependency-correct order:
1. **Tag/publish `contactus-ext` Go module** (this is Plan Task 5, Go half) — must happen BEFORE consumer repoint.
2. Repoint + **republish** `sneat-core-modules` requiring the tagged `contactus-ext` (real `require`, no local replace).
3. Repoint + republish `contactus/backend` requiring new `sneat-core-modules` + `contactus-ext`.
4. Repoint the leaves (`debtus`, `logistus`, `sneat-bots`, `sneat-go-backend`, `sneat-go`).

The Plan's ordering (Task 2 relocate+repoint via local `replace`, BEFORE Task 5 publish) works for a single consumer module but NOT across 7 published modules that exchange these types. **The Plan's Task 2/5/6 sequencing needs revision.**

---

## Exact working-tree state (all UNCOMMITTED unless noted)

Run `git -C <repo> status --short` to see each. As of halt:

- **`contactus-ext`** — Phase A, builds ✓. `M backend/go.mod` (go 1.25.0 + require sneat-go-core v0.55.3), `?? backend/contactusmodels/` (moved packages, internal import rewritten), `?? backend/go.sum`. *(Note: Task 4 frontend commit a21f691 is already committed on the feature branch; this backend change is on top, uncommitted.)*
- **`sneat-core-modules`** — Phase B, builds ✓. 25 files repointed to `contactus-ext/backend/contactusmodels`; `contactusmodels/` dir deleted; `go.mod` has transitional `replace github.com/sneat-co/contactus-ext/backend => ../contactus-ext/backend` + auto-added require. (39 changed entries)
- **`contactus`** ⛔ build FAILS — 26 files rewritten + go.mod replace (`../../contactus-ext/backend`), **staged**. Fails in `backend/contactusext/{extension.go,invitus_contributor.go}`.
- **`debtus`** ⛔ build FAILS — 22 files + go.mod replace (`../../contactus-ext/backend`), **staged**. Fails in `debtusdal`, `debtusbot/cmds4debtus/dtb_transfer`.
- **`sneat-bots`** ⛔ build FAILS — 7 files + go.mod replace (`../contactus-ext/backend`), **staged**. Fails in `pkg/bots/botprofiles/anybot/cmds4anybot`.
- **`logistus`** — files rewritten (unstaged); subagent INTERRUPTED before go.mod/tidy/build. **Verify whether `go.mod` got the replace** (likely NOT). (10 entries)
- **`sneat-go-backend`** — files rewritten + `M go.mod`; subagent INTERRUPTED before build completed. (13 entries)
- **`sneat-go`** — 4 test files + go.mod replace (`../contactus-ext/backend`), **staged**, builds ✓.

go.mod replace relative paths used: `contactus`/`debtus`/`logistus` (go.mod under `<repo>/backend/`) → `../../contactus-ext/backend`; `sneat-bots`/`sneat-go-backend`/`sneat-go` (go.mod at repo root) → `../contactus-ext/backend`.

Mechanical rewrite applied everywhere:
`sed 's#github.com/sneat-co/sneat-core-modules/contactusmodels#github.com/sneat-co/contactus-ext/backend/contactusmodels#g'`

---

## Cross-session context — `sneat-apps` branch `refactor/contactus-extension-packages`

A **separate** session is doing the **frontend Task 6 repoint for `sneat-apps`** on branch `refactor/contactus-extension-packages` (commit `97aff91e3` + in-progress files). It switches `sneat-apps` from legacy `@sneat/contactus-{core,services,shared}` to `@sneat/extension-contactus-{contract,shared,internal}`, consumed as **pure published npm versions (`0.12.1`)** — no `file:`/workspace paths, no `contactus-ext` path refs.

**Conflict with this plan: none.** It lives entirely in `sneat-apps` (zero file overlap with our repos; `sneat-apps` is not a Go `contactusmodels` importer). It does **not** affect the backend Task 2 recovery decision — the two tracks are independent and can proceed/merge in any order.

Three things to carry forward (cleanup, not blockers):

1. **Scope mismatch with Task 4.** `sneat-apps` consumes all three (`-contract`, `-shared`, `-internal`), but Task 4 only relocated **`-contract`** into `contactus-ext`. `-shared` and `-internal` still live in and publish from the `contactus` main repo. `sneat-apps` building green depends on those two staying published from `contactus`. The current Plan only extracts `-contract`; if `-shared`/`-internal` are ever meant to move too, that's unscoped work — decide explicitly.
2. **Version timing.** It pins `-contract@0.12.1` (today's published artifact, historically from the `contactus` repo). After Task 5 republishes `-contract` from `contactus-ext` at a new version, `sneat-apps` may later bump — but `0.12.1` works now, so it is not gated on the backend work.
3. **Doc drift.** The branch's `docs/sneat-libs.md` links `-contract` source to `../../contactus/frontend/libs/extensions/contactus/contract` — stale after Task 4 (now under `contactus-ext/frontend/...`). Doc-only fix.

---

## Option A — executed (2026-06-23)

**Done:**
- **Rolled back** (working-tree + staged → HEAD, no untracked files existed) the uncommitted Task 2 changes in **7 repos**: `sneat-core-modules` (source module; `contactusmodels` restored), `contactus` (backend-only restore; Task 4 commit `ca01ec4` left intact), `debtus`, `logistus`, `sneat-bots`, `sneat-go-backend`, `sneat-go`. All 7 verified `0 dirty entries`.
- **Kept & committed** the `contactus-ext` backend relocation: **`417792a`** on branch `feat/frontend-contract-relocation` (`feat(backend): add relocated contactusmodels …`, trailer `Verifies: contactus-ext#ac:relocate-contactusmodels`). `go build ./...` ✓, invariant check ✓. **Not pushed.**

**Resulting intentional state:** `contactusmodels` now exists in **both** `contactus-ext/backend` (committed, the new home, not yet published) **and** `sneat-core-modules` (restored, still published) — this duplication is the correct contract-first intermediate: stand up + publish the new home first; the old copy is removed and consumers repointed only after the tag, in dependency order.

**`contactus-ext` branch `feat/frontend-contract-relocation` now holds 3 commits (none pushed):** `1b39377` skeleton → `a21f691` frontend lib + nx workspace (Task 4) → `417792a` backend contactusmodels relocation (Task 2 relocation portion).

**Next steps (NOT yet done — a fresh session should do these):**
1. **Revise the Feature** `spec/features/contactus-ext/README.md` via `specstudio:specify`: enumerate the true backend consumer set (`debtus`, `logistus`, `sneat-bots`, `sneat-go-backend`, `sneat-go`) in REQ `relocate-contactusmodels`/`repoint-consumers`; state that consumer repoint uses **published `require`**, not committed local `replace`; make the ordering **publish-first**.
2. **Revise the Plan** `spec/plans/contactus-ext.md` via `specstudio:plan`: split Task 2 into "relocate into contactus-ext" (DONE — `417792a`) vs. the publish (Task 5) and ordered consumer-repoint+republish (sneat-core-modules → contactus/backend → leaves). Reflect that the `replace`-during-transition bridge does not work across these 7 published modules.
3. Only then resume implementation (publish `contactus-ext` tag first).

---

## Scope correction — BACKEND-ONLY (2026-06-24)

This session is **backend-only**. A separate **frontend session** owns the contactus frontend extraction: publishing the `@sneat/extension-contactus-*` npm packages and rewiring frontend apps. Evidence: `contactus` main has already had the contract lib removed and `0.12.x` published (PRs #6–#8); `sneat-apps` is on `migrate/contactus-extension-packages`; `calendarius` on `refactor/b3-repoint-contactus-backend`.

**Frontend work this session had done (per the original "do Task 4 first" instruction) was reverted/dropped:**
- `contactus-ext` frontend commit `a21f691` (lib + nx workspace) — **dropped**; old branch `feat/frontend-contract-relocation` deleted.
- `contactus` `ca01ec4` (lib removal) — never on main, its local branch already gone (the frontend session removed the lib on main independently). **Do NOT restore the lib in `contactus`** — that would undo their work.

**Backend work re-homed onto a backend-named branch** `contactus-ext` `feat/backend-contract-extraction` (off `main`/`1b39377`):
- `ab58163` — relocate `contactusmodels` (was `417792a`)
- `cc40195` — declare re-homed contributor interfaces (was `8ae534d`)
- (SHAs changed because commits were cherry-picked off the frontend commit. `contactus-ext` builds, invariant holds.)

**Ownership split for remaining tasks:** backend session = `contactus-ext` backend module (Tasks 2,4 ✓), Go-module tag (Task 5 Go half), backend consumer repoint (Tasks 6,7, Go part of 8). Frontend session = Task 3, npm-publish half of Task 5, frontend-consumer part of Task 8.

---

## Recovery options (chosen: **A** — see "Option A — executed" above)

1. **Roll back everything except `contactus-ext`, then keep & commit the `contactus-ext` relocation** (recommended). Precisely:
   - **Roll back (discard UNCOMMITTED Task 2 working-tree changes only — never committed history) in 7 repos:** `sneat-core-modules` (the relocated-FROM source module) plus the 6 cross-module consumers `contactus`, `debtus`, `logistus`, `sneat-bots`, `sneat-go-backend`, `sneat-go`. For each: `git restore` (and `git restore --staged` where staged) the rewritten `.go` files + `go.mod`/`go.sum`.
   - **⚠️ `contactus` special case:** it carries the **committed Task 4** frontend change (`ca01ec4`) AND **uncommitted Task 2** backend changes. Roll back ONLY the uncommitted backend Task 2 edits (`backend/**` `.go` + `go.mod`); the Task 4 commit stays intact. Do not run a blanket `git reset --hard` here.
   - **Keep & commit:** only `contactus-ext` — the `backend/contactusmodels` relocation + `backend/go.mod`/`go.sum` (builds green standalone; it's the contract-first artifact).
   - Then revise the Plan so consumer repoint follows Task 5 publish in dependency order.
2. **Roll back ALL of Task 2**: restore every repo incl. `contactus-ext/backend` to clean; revise Plan sequencing before any code moves.
3. **Keep as-is** (current state): inspect diffs/errors first.
4. **Local-replace web** (verification only, NOT committable): add transitive replaces so it all builds locally — proves the cutover but cannot be committed (breaks CI).

### Recommended next concrete steps when resuming
- Decide recovery option (likely #1).
- **Revise the contactus-ext Feature + Plan** to: (a) enumerate the true consumer set (debtus, logistus, sneat-bots, sneat-go-backend, sneat-go) in REQ `relocate-contactusmodels` / `repoint-consumers`; (b) re-sequence so Task 5 (publish contactus-ext tag) precedes consumer repoint; (c) reflect that consumer repoint uses real published `require`, not committed local `replace`. Use `specstudio:specify` (Feature) then `specstudio:plan`.
- Only then re-run `specstudio:implement` for the revised Task 2 (= relocate-only) and the publish/repoint tasks.

## Repro commands
```bash
cd ~/projects/sneat-co
for r in contactus-ext sneat-core-modules contactus debtus logistus sneat-bots sneat-go-backend sneat-go; do
  echo "== $r =="; git -C "$r" status --short | head; done
# reproduce a BLOCKED build:
cd ~/projects/sneat-co/contactus/backend && go build ./... 2>&1 | head -30
```

## Key facts
- Local Go toolchain: `go1.26.4`. `contactus-ext/backend` go.mod set to `go 1.25.0` (to avoid forcing a 1.26 toolchain on consumers on 1.25).
- Published versions in play: `sneat-go-core v0.55.3`, `sneat-core-modules v0.38.59`, `contactus/backend v0.1.0` (referenced by debtus/sneat-bots).
- Target import path chosen: `github.com/sneat-co/contactus-ext/backend/contactusmodels/{briefs4contactus,const4contactus}` (matches `contactus-ext/backend/doc.go`).
- Nothing for Task 2 is committed. Task 4 commits are local-only (not pushed). Pushes are HELD pending the coordinated Task 5/6 release.
