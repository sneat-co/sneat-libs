---
format: https://specscore.md/feature-specification
status: Stable
---

# Feature: Extension library architecture convention

> [SpecScore.**Studio**](https://specscore.studio): | [Explore](https://specscore.studio/app/github.com/sneat-co/sneat-libs/spec/features/extension-library-architecture?op=explore) | [Edit](https://specscore.studio/app/github.com/sneat-co/sneat-libs/spec/features/extension-library-architecture?op=edit) | [Ask question](https://specscore.studio/app/github.com/sneat-co/sneat-libs/spec/features/extension-library-architecture?op=ask) | [Request change](https://specscore.studio/app/github.com/sneat-co/sneat-libs/spec/features/extension-library-architecture?op=request-change) |
**Status:** Stable
**Source Ideas:** cross-extension-interaction

## Summary

The contract/shared/internal three-lib-per-extension decomposition, cross-extension DI-token rule, and nx module-boundary enforcement that keep the extension dependency graph a DAG.

## Problem

Extensions today import each other's runtime implementations sideways (e.g. `contactus` reached into the published `@sneat/extension-assetus`), which produces two failures: circular dependencies between extensions, and the prebuilt-bundle peer-resolution wall (a published Angular library's `fesm2022` bundle cannot resolve its `@sneat/*` peers when those peers are workspace *source* libs in `sneat-libs`). There is no sanctioned, reusable pattern for one extension to call another's behaviour, so each cross-extension need is solved with an ad-hoc workaround. This Feature defines the **convention** — a reusable standard — that any extension follows; it does not itself reshape any existing extension (that is a separate implementation Feature).

## Behavior

### Library decomposition

#### REQ: three-lib-decomposition

Every extension is decomposed into three libraries along two orthogonal axes — *runtime weight* and *visibility*: a public runtime-light `contract`, a public reusable-implementation `shared`, and a private `internal`. The load-bearing rule is *public contract/shared vs private internal*; a finer internal layering is permitted but not required.

#### REQ: contract-lib-runtime-light

The `contract` lib contains only TypeScript interfaces, DTO/model types, enums, and Angular `InjectionToken`s. It contains no components and no service implementations, and it must not pull heavy `@sneat/*` runtime peers — so any other extension can depend on it (type-only for shapes, the token for runtime calls) without triggering the prebuilt-bundle peer-resolution wall.

#### REQ: shared-lib-no-internal

The `shared` lib holds reusable implementation (components, pipes, and services) that other extensions may consume. It may depend on any `contract` lib and on other `shared` libs, but it must never import any `internal` lib. When a `shared` unit needs a service, it obtains it through a `contract`-defined `InjectionToken`, not by importing the implementation.

#### REQ: internal-lib-private

The `internal` lib holds the extension's private services, dialogs, pages, and components. No other extension may import it; only the extension itself and the app (at bootstrap) consume it.

### Cross-extension invocation

#### REQ: di-token-inversion

A cross-extension runtime call is made through dependency inversion: the provider extension owns an `InjectionToken` plus interface in its own `contract` lib; the provider's `shared`/`internal` supplies the concrete implementation, wired by the app at bootstrap; the caller injects the interface and invokes it without importing any of the provider's `shared` or `internal` code. The contract libs therefore form a DAG with no `internal → internal` edges.

### Naming

#### REQ: lib-naming

Each extension's libs are named `extension-<name>-contract`, `extension-<name>-shared`, and `extension-<name>-internal` (npm scope `@sneat/`), so the tier is legible from the package name and a non-compliant import is visually obvious.

### Enforcement

#### REQ: nx-tag-enforcement

Every project carries two nx tags — a tier tag (`type:contract` | `type:shared` | `type:internal`) and an extension tag (`ext:<name>`) — and `@nx/eslint-plugin`'s `enforce-module-boundaries` encodes the dependency matrix: `type:contract` may depend only on `type:contract` and foundational libs; `type:shared` may depend on `type:contract`, `type:shared`, and foundational libs but never `type:internal`; `type:internal` may depend on any public tier plus foundational and internal libs. A violating import fails lint.

#### REQ: internal-not-in-tsconfig-paths

Because nx tags cannot express "an `internal` may depend only on its *own* extension's `internal`", each `internal` lib is excluded from the workspace tsconfig `paths`, so another extension cannot resolve an import of it at all.

## Acceptance Criteria

### AC: three-lib-decomposition

Scenario: A compliant extension exposes exactly the three tiers
Given an extension that follows this convention
When its libraries are listed
Then there is one `*-contract`, one `*-shared`, and one `*-internal` lib, and every source file belongs to exactly one of them.

### AC: contract-lib-runtime-light

Scenario: Contract lib stays free of heavy peers
Given an `extension-<name>-contract` lib
When its sources and dependency graph are inspected
Then it declares no component or service implementation and pulls no heavy `@sneat/*` runtime peer, so importing it does not load any prebuilt extension bundle.

### AC: shared-lib-no-internal

Scenario: Shared importing internal is rejected
Given a `type:shared` lib with an import from any `type:internal` lib
When `enforce-module-boundaries` lint runs
Then the import is reported as an error and the build fails.

Scenario: Shared importing contract is allowed
Given a `type:shared` lib that imports only `type:contract` and foundational libs
When lint runs
Then no module-boundary violation is reported.

### AC: internal-lib-private

Scenario: Another extension cannot resolve a private internal lib
Given extension A attempts to import from extension B's `internal` lib
When the workspace resolves the import
Then resolution fails because B's `internal` lib is absent from the tsconfig `paths`.

### AC: di-token-inversion

Scenario: Cross-extension call uses a contract token, not the provider impl
Given a consumer extension that needs a provider extension's behaviour
When the consumer is built
Then it imports only the provider's `contract` (the `InjectionToken` + interface) and contains no import of the provider's `shared` or `internal`, and the call resolves at runtime via the app-wired provider.

### AC: lib-naming

Scenario: Lib names encode their tier
Given the three libs of an extension named `<name>`
When their package names are read
Then they are exactly `@sneat/extension-<name>-contract`, `@sneat/extension-<name>-shared`, and `@sneat/extension-<name>-internal`.

### AC: nx-tag-enforcement

Scenario: Every extension lib is tagged on both axes
Given any extension lib project
When its nx project tags are read
Then it carries exactly one tier tag (`type:contract` | `type:shared` | `type:internal`) and one `ext:<name>` tag, and `enforce-module-boundaries` is configured with the tier dependency matrix.

### AC: internal-not-in-tsconfig-paths

Scenario: Internal libs are not path-mapped
Given the workspace tsconfig `paths` map
When it is inspected
Then no `*-internal` lib has an entry, while every `*-contract` and `*-shared` lib does.

## Open Questions

- Where do *genuinely cross-cutting* primitives (a base space-item context type, the optional extension bus) live — a small new shared lib, or an existing low-level lib such as `space-models`? (Deferred; does not block the convention.)
- Does the typed extension bus and route-based invocation become part of this convention later, or stay separate complementary patterns? (Deferred until a real many-to-many / page-hop case appears.)

---
*This document follows the https://specscore.md/feature-specification*
