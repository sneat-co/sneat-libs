---
format: https://specscore.md/feature-specification
status: Approved
---

# Feature: Per-extension contract repo (`ext-<name>`) convention

> [SpecScore.**Studio**](https://specscore.studio): | [Explore](https://specscore.studio/app/github.com/sneat-co/sneat-libs/spec/features/extension-contract-repo?op=explore) | [Edit](https://specscore.studio/app/github.com/sneat-co/sneat-libs/spec/features/extension-contract-repo?op=edit) | [Ask question](https://specscore.studio/app/github.com/sneat-co/sneat-libs/spec/features/extension-contract-repo?op=ask) | [Request change](https://specscore.studio/app/github.com/sneat-co/sneat-libs/spec/features/extension-contract-repo?op=request-change) |
**Status:** Approved
**Source Ideas:** per-extension-contract-repo

## Summary

The convention for extracting each extension's public contract surface into a dedicated, dependency-light `ext-<name>` repo (polyglot `backend/` + `frontend/`), with the zero-other-extension-deps invariant, the ownership test that decides what lives there, the two cross-extension interaction directions, naming, and enforcement.

## Problem

`extension-library-architecture` separates a lightweight contract from the
implementation runtime, but the contract must also have an independent release
home. Otherwise consumers pin to the main repository's release cadence, drag a
full implementation dependency tree for a type or token, and risk module-level
cycles. This Feature defines the sanctioned contract home; it does not itself
extract an extension.

## Behavior

### Repo shape

#### REQ: dedicated-contract-repo

Each extension's public contract surface lives in a dedicated repo `sneat-co/ext-<name>`, polyglot like the main extension repo: a `backend/` Go module and a `frontend/` nx library. The contract surface is removed from the main extension repo (and, for already-decoupled extensions, gathered from wherever it was scattered) so there is a single per-extension home for it.

### Dependency invariant

#### REQ: zero-other-extension-deps

`ext-<name>` depends only on foundational/core code (e.g. `@sneat/space-models`,
`sneat-go-core`, shared core-model packages) — **never** on another extension.
Its manifests declare no `@sneat/extension-*` dependencies and no
`sneat-co/<sibling>` / `sneat-core-modules/<sibling>` implementation dependency.
This invariant prevents a sibling → contract dependency from forming a cycle.

### Ownership classification

#### REQ: ownership-test

What may live in `ext-<name>` is decided by a single test derived from the invariant: an interface or type belongs in `ext-<name>` only if its **entire signature is expressible in that extension's own types plus foundational/core types**. If any part of a signature references a **consumer's** types, that interface is the consumer's contract, not this extension's — it stays consumer-owned and does not move into `ext-<name>`.

### Cross-extension interaction

#### REQ: facade-call-in

For *calling into* the extension, the facade interface and its DTOs live in `ext-<name>`. The extension's **main repo** provides the concrete implementation, wired by the app at bootstrap (frontend: an Angular `InjectionToken` provider; backend: registration). A consumer imports only `ext-<name>` and invokes the interface; it never imports the extension's implementation.

#### REQ: caller-satisfied-callback

For the inverse direction — the extension needs behaviour or data *from the caller* — the callback interface is also declared in `ext-<name>`, and the **consumer** supplies the implementation and passes it in at call time. Both interaction directions therefore keep all interfaces in `ext-<name>`; only which side provides the implementation differs.

### Naming

#### REQ: repo-and-package-naming

The artifacts of an extension `<name>` are named: repo `sneat-co/ext-<name>`; frontend package `@sneat/extension-<name>-contract` (preserving the established `extension-library-architecture` contract-lib name); backend Go module path `github.com/sneat-co/ext-<name>/backend`. The tier is legible from the name and a non-compliant location is visually obvious.

### Enforcement

#### REQ: invariant-mechanically-checked

The zero-other-extension-deps invariant is enforced mechanically, not by convention alone: a CI check on `ext-<name>` inspects its resolved dependencies and fails the build if any other-extension dependency is present. A compliant `ext-<name>` (only foundational/core deps) passes.

### Independent release

#### REQ: independent-release

`ext-<name>` is versioned and released independently of the main extension repo. The main repo, sibling extensions, and the apps depend on `ext-<name>`'s **published** artifacts (npm package + Go module), and a contract change is released contract-first, then consumers bump to it — so consumers track a small, stable surface rather than the main repo's churn.

## Acceptance Criteria

### AC: dedicated-contract-repo

Scenario: The contract surface has one per-extension home
Given an extension `<name>` that follows this convention
When its public contract surface is located
Then it resides in the dedicated repo `sneat-co/ext-<name>` (a `backend/` Go module plus a `frontend/` nx lib) and not inside the main extension repo or scattered across shared/sibling locations.

### AC: zero-other-extension-deps

Scenario: Contract repo declares no other-extension dependency
Given `ext-<name>`'s `go.mod` and `package.json`
When their dependencies are inspected
Then they list only foundational/core dependencies and no other extension (`@sneat/extension-*`, `sneat-co/<sibling>`, or `sneat-core-modules/<sibling>` implementation).

Scenario: Depending on the contract repo introduces no cycle
Given a sibling extension that adds a dependency on `ext-<name>`
When the dependency graph is recomputed
Then no cycle appears, because `ext-<name>` has no dependency edge back to that sibling.

### AC: ownership-test

Scenario: An own-types-only interface belongs in the contract repo
Given an interface whose entire signature uses only `<name>`'s own types plus foundational/core types
When it is classified by the ownership test
Then it is placed in `ext-<name>`.

Scenario: An interface referencing a consumer's types stays consumer-owned
Given an interface whose signature references a consumer extension's types
When it is classified by the ownership test
Then it is not placed in `ext-<name>` and remains owned by the consumer.

### AC: facade-call-in

Scenario: A consumer calls into the extension via the contract only
Given a consumer that needs the extension's behaviour
When the consumer is built
Then it imports only `ext-<name>` (the facade interface + DTOs), contains no import of the extension's implementation, and the call resolves at runtime through the bootstrap-wired provider.

### AC: caller-satisfied-callback

Scenario: A callback signature is declared in the contract and satisfied by the caller
Given an extension facade method that needs behaviour or data from the caller
When the contract is defined
Then the callback interface is declared in `ext-<name>`, and the consumer provides the implementation and passes it in at call time.

### AC: repo-and-package-naming

Scenario: Names encode the contract tier
Given the artifacts of an extension `<name>`
When their names are read
Then the repo is `sneat-co/ext-<name>`, the frontend package is `@sneat/extension-<name>-contract`, and the backend module path is `github.com/sneat-co/ext-<name>/backend`.

### AC: invariant-mechanically-checked

Scenario: A violating dependency fails CI
Given a change that adds an other-extension dependency to `ext-<name>`
When CI runs
Then the dependency-invariant check fails the build.

### AC: independent-release

Scenario: Consumers track the published contract, not the main repo
Given a consumer of extension `<name>`
When it depends on the contract surface
Then it depends on the published `ext-<name>` artifacts (npm + Go module) at a pinned version, independent of the main extension repo's release.

## Open Questions

- The exact CI mechanism for `invariant-mechanically-checked` (a dependency-list assertion script vs. `go list` / `nx` graph assertion vs. a lint rule) is left to the implementation Feature. (Does not block the convention.)
- Backend module path is specified as `github.com/sneat-co/ext-<name>/backend` (mirroring the main repo's `<name>/backend`); a repo-root module remains a possible simplification if a contract repo never grows a second backend package. (Deferred.)

---
*This document follows the https://specscore.md/feature-specification*
