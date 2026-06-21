# Plan / Handover: Retire the legacy `@sneat/contactus-*` frontend packages

**Status:** Ready to execute (fresh session recommended — see §7).
**Date:** 2026-06-21.
**Related:** `contactus-repo-extraction-plan.md` (the original split), `sneat-core-modules/spec/adr/0001-extract-contactus-backend.md` (backend).

## 1. Why this exists

The contactus frontend was extracted to the dedicated repo and now publishes
`@sneat/extension-contactus-{contract,shared,internal}` (npm `0.12.1`). `sneat-apps` was
migrated to consume those (PR sneat-co/sneat-apps#3425).

**But the migration is only half done.** Several still-published sibling packages continue to
import the **legacy** `@sneat/contactus-{core,services,shared}` (frozen on npm; no longer built
from any repo). They import it **undeclared** (not in their `package.json` — it only resolves via
app-level hoisting). Because of that, `sneat-apps` must keep the 3 legacy deps installed, so its
bundle currently ships **two parallel contactus frontends** (legacy + new). That means duplicate
`ContactusServicesModule` / `ContactService` / `IMemberBrief` (different classes, DI tokens, TS
types). Not broken today (build + tests green), but a real duplication/fracture to clean up.

**Goal:** migrate every sibling consumer's *source* off `@sneat/contactus-*` onto
`@sneat/extension-contactus-*`, republish them, then drop the 3 legacy deps from `sneat-apps`.
End state: exactly **one** contactus frontend in the bundle.

## 2. Verified symbol → package mapping (reuse exactly)

| Legacy | New | Symbols (examples) |
|---|---|---|
| `@sneat/contactus-core` | `@sneat/extension-contactus-contract` | IMemberBrief, MemberRole, IBy, IContactContext, Member, IContactusSpaceDbo, DTOs |
| `@sneat/contactus-shared` | `@sneat/extension-contactus-shared` | ContactsSelectorInputComponent, SharedWithComponent, MembersShortListCardComponent, PersonWizardComponent |
| `@sneat/contactus-services` | `@sneat/extension-contactus-internal` | ContactusServicesModule, ContactService, ContactusSpaceService, ContactusNavService, MemberService, InviteService |
| `@sneat/contactus-internal` | `@sneat/extension-contactus-internal` | contactusRoutes |

Each symbol resolves to exactly one new package; a single legacy import never needs splitting
(confirmed during the sneat-apps migration). If a symbol seems missing, check the new package's
`src/index.ts` in the contactus repo — do not guess. Note: `@sneat/extension-contactus-shared`
has a runtime peer on `@sneat/extension-calendarius-contract` (SCHEDULE_NAV_SERVICE) — add it if a
consumer pulls shared and the bundle fails to resolve it.

## 3. Repos to migrate (source is small; republish is the real overhead)

Verified source `@sneat/contactus-*` import sites (working trees, 2026-06-21):

| Repo | Files | Path(s) | Publishes |
|---|---|---|---|
| **assetus** | 1 | `frontend/libs/extensions/assetus/shared/src/lib/pages/assets/assets-page.component.ts` | `@sneat/extension-assetus-*` |
| **listus** | 3 | `frontend/libs/extensions/listus/shared/src/lib/{space-menu/listus-space-menu, pages/list/list-page, pages/lists/lists-page}.component.ts` | `@sneat/extension-listus-*` |
| **eventus** | 1 | `frontend/libs/ext-eventus/src/lib/space-menu/eventus-space-menu.component.ts` | `@sneat/extension-eventus-*` |
| **debtus** | 4 | `debtus/frontend/...` (grep to list) | `@sneat/ext-debtus-internal` (verify pkg name) |
| **calendarius** | 0 | source already clean | `@sneat/extension-calendarius-{main,shared,...}` — **republish only** |
| **sneat-libs** (`space-components`) | 0 | source already clean | `@sneat/space-components` — **republish only / verify** |

Per-repo recipe (mirrors sneat-apps#3425 and calendarius #3418):
1. Branch. Repoint the source imports per §2 (sed per file; split into multiple import lines only
   if a single statement's symbols map to >1 new package — rare).
2. `package.json`: add the needed `@sneat/extension-contactus-*@0.12.1`; remove the legacy
   `@sneat/contactus-*` it no longer imports. `pnpm install`.
3. Build + lint + test the affected projects (compiler is the safety net). Grep clean.
4. PR → merge → **publish a new version** (these repos publish via their `release.yml`/`publish.yml`
   on merge to main, or a manual version bump — confirm per repo).

## 4. Final step — drop legacy from sneat-apps

Only after **all** of the above are republished:
1. In `sneat-apps/package.json`, bump the sibling extension deps to the new versions that no longer
   import legacy contactus, and **remove** `@sneat/contactus-{core,services,shared}`.
2. `pnpm install`; `nx run-many --target=build` for sneat-app + sneat-work; tests.
3. Verify the bundle no longer contains legacy: `grep -r "@sneat/contactus-\(core\|services\|shared\)" node_modules/.pnpm/@sneat+extension-*/.../` returns nothing for the *new* sibling versions.

## 5. Ordering

Sibling repos (§3) are independent of each other → migrate in **parallel**. `sneat-apps` is **last**
(§4), gated on every sibling having republished. (Same shape as the backend B3 cascade.)

## 6. Verification (done = true)

- No repo's *source* imports `@sneat/contactus-{core,services,shared,internal}` (grep across all).
- `sneat-apps/package.json` has no `@sneat/contactus-*`; only `@sneat/extension-contactus-*`.
- `sneat-apps` build + tests green; only one `ContactusServicesModule`/`ContactService` in the graph.

## 7. Session / handover notes

- **Fresh session recommended** for execution — the session that produced this is very large.
  This doc is self-contained; nothing else is needed to continue.
- The pattern is identical to the already-merged **sneat-apps#3425** and **calendarius #3418** —
  read those diffs as worked examples.
- Watch-item: these sibling packages import contactus **undeclared**; when migrating, also *declare*
  the new `@sneat/extension-contactus-*` deps in their `package.json` so the hoisting crutch goes away.
- Caution: each republish is a real npm release — coordinate versions and confirm each repo's
  publish mechanism before merging.
