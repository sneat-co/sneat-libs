---
format: https://specscore.md/feature-specification
status: Approved
---

# Feature: Per-extension contract repo (`<name>-ext`) convention

> [SpecScore.**Studio**](https://specscore.studio): | [Explore](https://specscore.studio/app/github.com/sneat-co/sneat-libs/spec/features/extension-contract-repo?op=explore) | [Edit](https://specscore.studio/app/github.com/sneat-co/sneat-libs/spec/features/extension-contract-repo?op=edit) | [Ask question](https://specscore.studio/app/github.com/sneat-co/sneat-libs/spec/features/extension-contract-repo?op=ask) | [Request change](https://specscore.studio/app/github.com/sneat-co/sneat-libs/spec/features/extension-contract-repo?op=request-change) |
**Status:** Approved
**Source Ideas:** per-extension-contract-repo

## Summary

The convention for extracting each extension's public contract surface into a dedicated, dependency-light `<name>-ext` repo (polyglot `backend/` + `frontend/`), with the zero-other-extension-deps invariant, the ownership test that decides what lives there, the two cross-extension interaction directions, naming, and enforcement.

## Problem

`extension-library-architecture` (Stable) put each extension's `contract`/`shared`/`internal` tiers in one place, but once an extension becomes its own repo the contract tier still ships from the heavy main repo. That leaves three pains for anyone depending on another extension's contract: they pin to the **main repo's release cadence** (heavy, churns on every impl change); they drag the **full build/dependency tree** to use a single type or token; and a `sibling ↔ extension` need still risks a **module-level dependency cycle**. The backend cycle-break for `contactus` worked around this ad-hoc — putting some contract shapes in `sneat-core-modules/contactusmodels` and leaving cross-module interfaces consumer-owned — but there is no sanctioned, uniform convention for *where an extension's contract lives* and *what is allowed to live there*. This Feature defines that convention; it does not itself extract any extension (the `contactus` reference extraction is a separate Feature).

## Behavior

### Repo shape

#### REQ: dedicated-contract-repo

Each extension's public contract surface lives in a dedicated repo `sneat-co/<name>-ext`, polyglot like the main extension repo: a `backend/` Go module and a `frontend/` nx library. The contract surface is removed from the main extension repo (and, for already-decoupled extensions, gathered from wherever it was scattered) so there is a single per-extension home for it.

### Dependency invariant

#### REQ: zero-other-extension-deps

`<name>-ext` depends only on foundational/core code (e.g. `@sneat/space-models`, `sneat-go-core`, shared core-model packages) — **never** on another extension. Its dependency manifests declare no `@sneat/extension-*` (other than nothing) and no `sneat-co/<sibling>` / `sneat-core-modules/<sibling>` implementation dependency. This is the load-bearing invariant: because `<name>-ext` has no back-edge to any sibling, `sibling → <name>-ext` can never form a cycle, and (on the frontend) importing it never triggers the prebuilt-bundle peer-resolution wall.

### Ownership classification

#### REQ: ownership-test

What may live in `<name>-ext` is decided by a single test derived from the invariant: an interface or type belongs in `<name>-ext` only if its **entire signature is expressible in that extension's own types plus foundational/core types**. If any part of a signature references a **consumer's** types, that interface is the consumer's contract, not this extension's — it stays consumer-owned and does not move into `<name>-ext`.

### Cross-extension interaction

#### REQ: facade-call-in

For *calling into* the extension, the facade interface and its DTOs live in `<name>-ext`. The extension's **main repo** provides the concrete implementation, wired by the app at bootstrap (frontend: an Angular `InjectionToken` provider; backend: registration). A consumer imports only `<name>-ext` and invokes the interface; it never imports the extension's implementation.

#### REQ: caller-satisfied-callback

For the inverse direction — the extension needs behaviour or data *from the caller* — the callback interface is also declared in `<name>-ext`, and the **consumer** supplies the implementation and passes it in at call time. Both interaction directions therefore keep all interfaces in `<name>-ext`; only which side provides the implementation differs.

### Naming

#### REQ: repo-and-package-naming

The artifacts of an extension `<name>` are named: repo `sneat-co/<name>-ext`; frontend package `@sneat/extension-<name>-contract` (preserving the established `extension-library-architecture` contract-lib name); backend Go module path `github.com/sneat-co/<name>-ext/backend`. The tier is legible from the name and a non-compliant location is visually obvious.

### Enforcement

#### REQ: invariant-mechanically-checked

The zero-other-extension-deps invariant is enforced mechanically, not by convention alone: a CI check on `<name>-ext` inspects its resolved dependencies and fails the build if any other-extension dependency is present. A compliant `<name>-ext` (only foundational/core deps) passes.

### Independent release

#### REQ: independent-release

`<name>-ext` is versioned and released independently of the main extension repo. The main repo, sibling extensions, and the apps depend on `<name>-ext`'s **published** artifacts (npm package + Go module), and a contract change is released contract-first, then consumers bump to it — so consumers track a small, stable surface rather than the main repo's churn.

## Acceptance Criteria

### AC: dedicated-contract-repo

Scenario: The contract surface has one per-extension home
Given an extension `<name>` that follows this convention
When its public contract surface is located
Then it resides in the dedicated repo `sneat-co/<name>-ext` (a `backend/` Go module plus a `frontend/` nx lib) and not inside the main extension repo or scattered across shared/sibling locations.

### AC: zero-other-extension-deps

Scenario: Contract repo declares no other-extension dependency
Given `<name>-ext`'s `go.mod` and `package.json`
When their dependencies are inspected
Then they list only foundational/core dependencies and no other extension (`@sneat/extension-*`, `sneat-co/<sibling>`, or `sneat-core-modules/<sibling>` implementation).

Scenario: Depending on the contract repo introduces no cycle
Given a sibling extension that adds a dependency on `<name>-ext`
When the dependency graph is recomputed
Then no cycle appears, because `<name>-ext` has no dependency edge back to that sibling.

### AC: ownership-test

Scenario: An own-types-only interface belongs in the contract repo
Given an interface whose entire signature uses only `<name>`'s own types plus foundational/core types
When it is classified by the ownership test
Then it is placed in `<name>-ext`.

Scenario: An interface referencing a consumer's types stays consumer-owned
Given an interface whose signature references a consumer extension's types
When it is classified by the ownership test
Then it is not placed in `<name>-ext` and remains owned by the consumer.

### AC: facade-call-in

Scenario: A consumer calls into the extension via the contract only
Given a consumer that needs the extension's behaviour
When the consumer is built
Then it imports only `<name>-ext` (the facade interface + DTOs), contains no import of the extension's implementation, and the call resolves at runtime through the bootstrap-wired provider.

### AC: caller-satisfied-callback

Scenario: A callback signature is declared in the contract and satisfied by the caller
Given an extension facade method that needs behaviour or data from the caller
When the contract is defined
Then the callback interface is declared in `<name>-ext`, and the consumer provides the implementation and passes it in at call time.

### AC: repo-and-package-naming

Scenario: Names encode the contract tier
Given the artifacts of an extension `<name>`
When their names are read
Then the repo is `sneat-co/<name>-ext`, the frontend package is `@sneat/extension-<name>-contract`, and the backend module path is `github.com/sneat-co/<name>-ext/backend`.

### AC: invariant-mechanically-checked

Scenario: A violating dependency fails CI
Given a change that adds an other-extension dependency to `<name>-ext`
When CI runs
Then the dependency-invariant check fails the build.

### AC: independent-release

Scenario: Consumers track the published contract, not the main repo
Given a consumer of extension `<name>`
When it depends on the contract surface
Then it depends on the published `<name>-ext` artifacts (npm + Go module) at a pinned version, independent of the main extension repo's release.

## Open Questions

- The exact CI mechanism for `invariant-mechanically-checked` (a dependency-list assertion script vs. `go list` / `nx` graph assertion vs. a lint rule) is left to the implementation Feature. (Does not block the convention.)
- Backend module path is specified as `github.com/sneat-co/<name>-ext/backend` (mirroring the main repo's `<name>/backend`); a repo-root module remains a possible simplification if a contract repo never grows a second backend package. (Deferred.)
- Whether the repo suffix stays `-ext` or becomes `-contract` (more literal, but collides with the frontend `-contract` lib suffix). Current convention: `-ext`. (Deferred.)

---
*This document follows the https://specscore.md/feature-specification*
