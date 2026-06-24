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
