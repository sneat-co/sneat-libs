# logistus frontend migration — scope (DEFERRED, its own project)

**Status:** Deferred 2026-06-24. Surfaced during the contactus-cascade follow-up.
Decision: do NOT attempt inside the contactus cascade — it's a multi-session
platform upgrade, not a contactus repoint.

## Why it's bigger than "repoint contactus"

`logistus/frontend` is a full platform generation behind. It pins **all
`@sneat/*` core libs at `0.3.0`** (api, app, auth-core/models/ui, components,
core, data, datagrid, dto, grid, logging, space-components/models/services, ui,
wizard). The new split extension packages peer-require `@sneat/* ^0.12.0`
(verified: `extension-contactus-shared` peerDeps `@sneat/core ^0.12.0` etc.).

So adopting the new contactus packages forces a **`@sneat/*` 0.3.0 → 0.12.1
upgrade across the whole app** (9 minor versions; expect API breakage in
core/space-services/components/ui). Angular itself is already fine — logistus is
on Angular 21.2 / Nx 22.5.

That upgrade also drags in two more extension migrations, because logistus still
uses the legacy aggregate packages at 0.3.0:

1. **contactus** — `@sneat/contactus-{core,internal,services,shared}` (28 source
   files, 41 import statements). Mapping (same as sneat-apps cascade):
   `core→extension-contactus-contract`, `shared→extension-contactus-shared`,
   `services→extension-contactus-internal`, `internal→extension-contactus-internal`.
   Uses real components/services (`ContactInputComponent`, `ContactsSelectorService`),
   so `logist-app` bootstrap will need `provideContactusInternal()` (NG0201 risk),
   and likely `provideAssetusInternal()` if assetus tokens surface.
2. **assetus** — `@sneat/ext-assetus-components`, `@sneat/mod-assetus-core` →
   `extension-assetus-{contract,internal,shared}` split.
3. **schedulus → calendarius** — `@sneat/extensions-schedulus-{main,shared}`,
   `@sneat/mod-schedulus-core`. schedulus is dead/superseded by calendarius, so
   this is a **semantic migration to a different extension**, not a rename.

## Repo facts
- Published lib: `@sneat/extensions-logist` (`libs/extensions/logist`) — must be
  re-published (version bump) after migration. Everything else is `logist-app`.
- Consumer app: `apps/logist-app`. main.ts has no `provide*Internal()` wiring yet.
- contactus consumed via npm (no tsconfig paths).
- Another session was repointing the logistus **Go backend** to published
  contactus-ext on 2026-06-24 (commits #4/#5) — frontend untouched by that.

## Suggested approach when picked up
1. Branch. Bump all `@sneat/*` 0.3.0 → 0.12.1 (mirror sneat-apps overrides in
   `pnpm-workspace.yaml` if peer dupes appear).
2. Add the new split packages (contactus/assetus contract+internal+shared,
   calendarius contract+internal+shared).
3. Run the proven codemod (`/tmp/sneat_apps_codemod.py` pattern) extended with the
   contactus 4→3 mapping; do schedulus→calendarius by hand (semantic).
4. Build `logist-app` + `@sneat/extensions-logist`; fix breakage from the 0.3→0.12
   jump iteratively.
5. Wire `provideContactusInternal()` (+ assetus/calendarius as needed) in
   `logist-app` main.ts.
6. Verify (build/lint/test/madge) → PR → merge → republish `@sneat/extensions-logist`.

## Fresh-session prompt (copy/paste, absolute paths)

A self-contained prompt to drive this migration in a fresh session.

````text
Task: Update the **logistus frontend** to the latest @sneat/* platform (0.3.0 → 0.12.x) and
migrate it off all legacy aggregate extension packages onto the new split packages. This is a
multi-step platform upgrade — work incrementally, verify at each step, and PAUSE before any
irreversible npm publish.

## Absolute paths
- Repo:              /Users/alexandertrakhimenok/projects/sneat-co/logistus
- Frontend root:     /Users/alexandertrakhimenok/projects/sneat-co/logistus/frontend
- package.json:      /Users/alexandertrakhimenok/projects/sneat-co/logistus/frontend/package.json
- pnpm-workspace:    /Users/alexandertrakhimenok/projects/sneat-co/logistus/frontend/pnpm-workspace.yaml (create if missing)
- tsconfig.base:     /Users/alexandertrakhimenok/projects/sneat-co/logistus/frontend/tsconfig.base.json
- Consumer app:      /Users/alexandertrakhimenok/projects/sneat-co/logistus/frontend/apps/logist-app
  (bootstrap providers: /Users/alexandertrakhimenok/projects/sneat-co/logistus/frontend/apps/logist-app/src/main.ts)
- Published lib:      /Users/alexandertrakhimenok/projects/sneat-co/logistus/frontend/libs/extensions/logist
  (this is @sneat/extensions-logist — must be re-published after migration)
- Reference exemplar (already migrated): /Users/alexandertrakhimenok/projects/sneat-co/sneat-apps
  - version pins to mirror:  /Users/alexandertrakhimenok/projects/sneat-co/sneat-apps/package.json
  - dedupe overrides to copy: /Users/alexandertrakhimenok/projects/sneat-co/sneat-apps/pnpm-workspace.yaml
  - route wiring example:    /Users/alexandertrakhimenok/projects/sneat-co/sneat-apps/libs/space/pages/src/lib/space/space-routing.module.ts
  - DI wiring example:       /Users/alexandertrakhimenok/projects/sneat-co/sneat-apps/apps/sneat-app/src/main.ts
- Scope doc (this file): /Users/alexandertrakhimenok/projects/sneat-co/sneat-libs/spec/research/logistus-frontend-migration-scope.md
- Cascade handover docs: /Users/alexandertrakhimenok/projects/sneat-co/sneat-libs/spec/research/contactus-cascade-handover.md
  and contactus-legacy-frontend-packages-retirement-plan.md (same dir)

## Current state (verified 2026-06-24)
- logistus/frontend pins ALL @sneat/* at 0.3.0; Angular 21.2, Nx 22.5.3 (Angular is fine — only @sneat/* is behind).
- Legacy deps to replace (in package.json):
  - @sneat/contactus-core, -internal, -services, -shared  (28 source files import these)
  - @sneat/ext-assetus-components, @sneat/mod-assetus-core
  - @sneat/extensions-schedulus-main, @sneat/extensions-schedulus-shared, @sneat/mod-schedulus-core
- The logistus **Go backend** was already repointed to published contactus-ext (commits #4/#5) — frontend is the remaining piece.

## Migration mapping
- contactus:  core→@sneat/extension-contactus-contract, shared→@sneat/extension-contactus-shared,
              services→@sneat/extension-contactus-internal, internal→@sneat/extension-contactus-internal
              (services+internal both collapse into -internal; merge those import lines)
- assetus:    @sneat/ext-assetus-components + @sneat/mod-assetus-core →
              @sneat/extension-assetus-{contract,internal,shared}
- schedulus:  @sneat/extensions-schedulus-* + @sneat/mod-schedulus-core → calendarius
              (@sneat/extension-calendarius-{contract,internal,shared}). This is a SEMANTIC migration,
              NOT a rename — schedulus is retired/superseded by calendarius. Do it by hand; use
              sneat-apps as the reference for how calendarius replaced schedulus.

## Target versions (mirror /Users/alexandertrakhimenok/projects/sneat-co/sneat-apps/package.json)
- @sneat/* core libs → 0.12.1
- @sneat/extension-contactus-contract 0.12.1, -internal 0.12.3, -shared 0.12.2
- @sneat/extension-assetus-contract 0.0.5, -internal 0.0.5, -shared 0.0.6
- @sneat/extension-calendarius-contract/-internal/-shared 0.12.1
(confirm each with `npm view <pkg> version` before pinning)

## Recipe
1. cd /Users/alexandertrakhimenok/projects/sneat-co/logistus && git checkout main && git pull.
   Create a branch — pre-push hook REQUIRES prefix feature|fix|perf|chore|refactor|renovate|personal|copilot
   (e.g. refactor/logistus-platform-0.12-and-split-extensions).
2. Edit package.json: bump all @sneat/* to the target versions; remove the 9 legacy packages; add the
   new split packages (contactus/assetus/calendarius contract+internal+shared).
3. Add a pnpm-workspace.yaml `overrides:` block mirroring sneat-apps' (dedupe @sneat/* to 0.12.1 and
   @sneat/extension-contactus-internal to 0.12.3) to avoid DI class-identity fractures from peer dupes.
4. Codemod the 28+ source files for the import remapping above (contactus + assetus). Merge import
   lines where two legacy packages map to the same new package.
5. Do schedulus→calendarius by hand.
6. In /Users/alexandertrakhimenok/projects/sneat-co/logistus/frontend/apps/logist-app/src/main.ts add
   the DI wiring the new split packages need: ...provideContactusInternal(), ...provideAssetusInternal(),
   ...provideCalendariusInternal() (logistus uses ContactInputComponent/ContactsSelectorService which
   inject CONTACT_SERVICE etc. — without these you get NG0201).
7. Install + build + fix breakage from the 0.3→0.12 jump (expect API changes in core/space-services/
   components/ui). Use pnpm v11 DIRECTLY (corepack is broken under Node 26 on this machine):
   /Users/alexandertrakhimenok/Library/pnpm/bin/pnpm install
   /Users/alexandertrakhimenok/Library/pnpm/bin/pnpm nx run-many -t build,lint,test  (and madge: no circular deps)
8. PR (direct main push is blocked; use `gh pr create`, then `gh pr merge <n> --squash --auto --delete-branch`).
9. AFTER merge, republish @sneat/extensions-logist (bump its version first), via the cross-repo workflow:
     gh workflow run publish-extension.yml -R sneat-co/sneat-libs \
       -f repository=sneat-co/logistus -f project=<nx-project-name-of-extensions-logist> \
       -f ref=main -f working-directory=frontend -f pnpm-version=11
   GOTCHAS: the `repository` input MUST be the full `sneat-co/logistus` (not bare `logistus`);
   the project must be in nx.json release.projects with publishConfig.access=public and an independent
   release relationship; first-publish/registry propagation can lag 1–2 min, so verify with
   `curl -s https://registry.npmjs.org/@sneat%2fextensions-logist | python3 -c "import sys,json;print(json.load(sys.stdin).get('dist-tags'))"`.
10. Optional: run the app against Firebase emulators to smoke-test space/contact pages.

Treat every npm publish as irreversible: bump deliberately and verify. Work the build-fix loop until
green before opening the PR.
````
