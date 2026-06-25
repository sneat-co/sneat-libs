# Creating a New Extension

New Sneat extensions start from the **`sneat-ext-template`** repo — a ready-made
Nx workspace wired to the house conventions — rather than scaffolding from
scratch.

## What the template gives you

`sneat-ext-template` is an Nx workspace (**Nx 22 · Angular 21 · Ionic 8 · pnpm**)
pre-built with:

- the standalone **`template-app`** (Ionic shell) + its `template-app-e2e` project,
- the three publishable tier libraries
  `@sneat/extension-template-{contract,shared,internal}`
  (see [`frontend-apps.md`](./frontend-apps.md)),
- the extension-library-architecture layout and Nx targets
  (`serve`, `build`, `lint`, `test`, `e2e`).

## Steps

1. **Create the new repo from the template** (`sneat-co/<ext>`), keeping the
   `org/repo` layout.
2. **Rename `template` → `<ext>`** throughout (app names, library packages,
   paths, ids).

   > ⚠️ **Rename script — WIP.** A script to automate the `template → <ext>`
   > rename is being built. Until it lands, the rename is manual. This section
   > will be updated with the script's name and usage once it's ready.

3. **Install & verify:**
   ```bash
   pnpm install
   pnpm exec nx run-many -t lint test build
   pnpm exec nx e2e <ext>-app-e2e
   ```
4. **Add the contract surface** in the `*-ext` repo (TypeSpec `.tsp` + Go/TS
   bindings) — see [`extension-contract-repo`](../../spec/features/extension-contract-repo/README.md).
5. **Wire the backend** into `sneat-go` — see [`backend-wiring.md`](./backend-wiring.md).
6. **Follow the UX conventions** — see [`frontend-ux/`](./frontend-ux/README.md).

## Naming

- Repo: `sneat-co/<ext>` (impl), `sneat-co/<ext>-ext` (contract surface).
- App: `<ext>-app` + `<ext>-app-e2e`.
- Libraries: `@sneat/extension-<ext>-{contract,shared,internal}`.
- Backend route prefix: `/v0/api4<ext>/`.
