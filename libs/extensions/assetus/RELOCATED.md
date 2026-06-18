# ⚠️ Assetus has a new canonical home: `sneat-co/assetus`

Active Assetus development now happens in the dedicated repository
**[`github.com/sneat-co/assetus`](https://github.com/sneat-co/assetus)** (Go backend
space module + Nx/Angular/Ionic frontend in one repo, mirroring the `listus` layout).

That repo implements the approved **Assetus MVP** — the ownership *system of record*.
The frontend there provides the per-Space asset list + create form, asset detail + edit,
soft-archive / hard-delete UI, and the ownership-transfer flow with an append-only
history timeline.

Spec (source of truth):
[`sneat-co/backstage` → `spec/features/assetus-mvp`](https://github.com/sneat-co/backstage/tree/main/spec/features/assetus-mvp).

## Why this code is still here

The MVP in the new repo is a **clean, narrower model** than these legacy `core` /
`components` libraries. The legacy capabilities here — vehicle cards, dwelling/real-estate
editing, mileage dialogs, liabilities, service providers, possession — are **deliberately
deferred** by the MVP Feature's *Not Doing* section and are **not yet ported** to the new
repo. To honour "no functionality lost", this legacy code is **left in place** for now.

## Follow-up before this directory is removed

1. Port the still-wanted legacy UI capabilities into `sneat-co/assetus/frontend` (or
   explicitly retire them).
2. Update every consumer that imports `@sneat/ext-assetus-components` /
   `@sneat/mod-assetus-core` (e.g. `sneat-apps`, `listus`) to the new packages, then
   remove these libs and verify `pnpm install && nx run-many -t lint test build`.

Until then, **do not build new Assetus UI here** — build it in `sneat-co/assetus`.
