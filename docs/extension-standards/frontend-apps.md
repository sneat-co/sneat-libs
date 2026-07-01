# Frontend Apps & Libraries

How an extension's frontend is structured: publishable **tier libraries** plus a
standalone **`<ext-id>-app`** that doubles as the end-to-end test harness.

## Library tiers

Per the
[`extension-library-architecture`](../../spec/features/extension-library-architecture/README.md)
convention, an extension's frontend ships as three Nx libraries:

| Library | Package | Purpose |
| --- | --- | --- |
| Contract | `@sneat/extension-<id>-contract` | Public types/tokens — the TS side of the wire contract. |
| Shared | `@sneat/extension-<id>-shared` | Components/services other apps may reuse. |
| Internal | `@sneat/extension-<id>-internal` | Internals not meant for external reuse. |

Each publishable library needs `"publishConfig": { "access": "public" }` and Nx
release config before its first npm publish — see
[`publish-sneat-extension.md`](https://github.com/sneat-co/backstage/blob/main/docs/howto/publish-sneat-extension.md).

## Registering implementations — one register function per extension

The **`internal`** lib (the extension's implementation lib) MUST expose a single
registration function that binds **every** contract `InjectionToken` to its
concrete implementation in one place:

```ts
// libs/extensions/<id>/internal/src/lib/provide-<id>-internal.ts
export function provide<Name>Internal(): Provider[] {
  return [
    FooService,
    { provide: FOO_SERVICE, useExisting: FooService },
    BarService,
    { provide: BAR_SERVICE, useExisting: BarService },
    // …one binding per contract token — none omitted
  ];
}
```

Why one function that binds *all* tokens (see the
[`extension-library-architecture`](../../spec/features/extension-library-architecture/README.md)
`internal-register-function` REQ):

- **Single wiring call.** The host app enables the whole extension by calling
  `provide<Name>Internal()` once at bootstrap — no per-token wiring scattered
  across the app or across several `provide…` helpers.
- **Single audit site.** "Is every contract token wired?" has one answer: this
  function. A new capability is a new `{ provide: TOKEN, useExisting: Impl }`
  line here — nowhere else.
- **No unbound-token crashes.** Because the token (in `contract`) and its binding
  (here) ship from the same extension, a consumer that injects the token can
  never resolve it to nothing.

Consumers — including sibling extensions — depend only on the `contract` token +
interface and never import the `internal`/`shared` implementation directly (the
[`di-token-inversion`](../../spec/features/extension-library-architecture/README.md)
rule; enforced by nx `enforce-module-boundaries`).

## The standalone app — `<ext-id>-app`

Every extension ships an Nx **application** that hosts the extension in a minimal
Ionic shell. It is named after the extension id:

```
frontend/apps/
├── <ext-id>-app/        # standalone Ionic app (e.g. listus-app)
└── <ext-id>-app-e2e/    # its end-to-end test project (e.g. listus-app-e2e)
```

(Confirmed live: `listus/frontend/apps/listus-app` + `listus-app-e2e`.)

**Why it exists:** the `<ext-id>-app` is the **e2e harness**. It lets the
extension be served and tested in isolation — without depending on a host app —
so end-to-end tests run against a real Ionic shell that mounts only this
extension's libraries.

### Common Nx tasks

```bash
pnpm exec nx serve <ext-id>-app            # run the app locally
pnpm exec nx e2e   <ext-id>-app-e2e        # run end-to-end tests
pnpm exec nx build extension-<id>-shared   # build a publishable tier library
pnpm exec nx run-many -t lint test build
```

## Stack

**Nx 22 · Angular 21 · Ionic 8 · pnpm.** New extensions inherit this by scaffolding
from `sneat-ext-template` — see
[`creating-a-new-extension.md`](./creating-a-new-extension.md).
