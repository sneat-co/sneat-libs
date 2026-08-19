---
format: https://specscore.md/feature-specification
status: Stable
---

# Feature: Extension frontend package architecture

> [SpecScore.**Studio**](https://specscore.studio): | [Explore](https://specscore.studio/app/github.com/sneat-co/sneat-libs/spec/features/extension-library-architecture?op=explore) | [Edit](https://specscore.studio/app/github.com/sneat-co/sneat-libs/spec/features/extension-library-architecture?op=edit) | [Ask question](https://specscore.studio/app/github.com/sneat-co/sneat-libs/spec/features/extension-library-architecture?op=ask) | [Request change](https://specscore.studio/app/github.com/sneat-co/sneat-libs/spec/features/extension-library-architecture?op=request-change) |
**Status:** Stable
**Source Ideas:** cross-extension-interaction

## Summary

Every frontend extension has an independently released contract and one host-facing runtime package. An additional UI package exists only when another extension or app reuses implementation-level UI. Angular DI tokens keep behavioural dependencies on the contract, while Nx boundaries and package-aware linting protect both workspace and cross-repository imports.

## Behavior

### Required contract package

#### REQ: single-contract-owner

`@sneat/extension-<name>-contract` is published only by `sneat-co/ext-<name>`.
The implementation repository contains no second contract project or package.

#### REQ: contract-runtime-light

The contract contains interfaces, DTO/model types, enums, pure helpers and Angular
`InjectionToken`s. It contains no components, routes, pages or service
implementations and depends only on foundational packages, never another extension.

### Required runtime package

#### REQ: one-runtime-package

The implementation repository publishes `@sneat/extension-<name>` from
`libs/extensions/<name>/runtime`. It contains routes, pages, private components and
service implementations. Its supported public API is intentionally small: provider
registration, route definitions and documented host-integration metadata.

#### REQ: runtime-host-only

Only application composition roots and application routing may import another
extension's runtime package. Extension libraries call behaviour through the
provider's contract tokens and never import its concrete services, modules or
routes.

#### REQ: runtime-register-function

The runtime exposes `provide<Name>(): Provider[]`, which binds every always-on
contract token in one auditable location. Heavy route-only capabilities use
route-scoped providers exported through the runtime's routes.

### Optional reusable UI package

#### REQ: ui-package-is-demand-driven

`@sneat/extension-<name>-ui` exists only when at least one source library outside
the extension consumes a reusable component, pipe or UI-specific service. Extensions
without such a consumer keep their UI and pages in the runtime package.

#### REQ: ui-never-imports-runtime

The UI package may depend on contracts, foundational UI packages and explicitly
approved UI packages. It never imports any runtime package. Behaviour required by
reusable UI is obtained through contract-defined tokens.

#### REQ: explicit-public-api

The UI and runtime entrypoints explicitly export supported symbols. Recursive
wildcard barrels and exports of private base classes, page internals or concrete
behavioural services are not allowed.

### Naming and project layout

#### REQ: package-naming

The artifacts are named:

- contract repo: `sneat-co/ext-<name>`
- contract package: `@sneat/extension-<name>-contract`
- runtime package: `@sneat/extension-<name>`
- optional UI package: `@sneat/extension-<name>-ui`

Nx project directories are `contract`, `runtime` and optional `ui`; project names
use `ext-<name>-contract`, `ext-<name>-runtime` and `ext-<name>-ui`.

### Enforcement

#### REQ: nx-two-axis-tags

Projects carry `domain:<name>` and one `layer:contract|ui|runtime|app|e2e` tag.
Nx module boundaries enforce local workspace edges: contract to foundation only;
UI to contracts/foundation/approved UI; runtime to its contract, its UI and
foundation; app to every tier as the composition root.

#### REQ: cross-repository-import-enforcement

Library source is checked with package-pattern restrictions because installed npm
packages are invisible to the consumer's Nx graph. Imports matching another
extension's runtime package, legacy `*-internal` packages or legacy concrete service
packages fail lint outside app composition/routing files.

#### REQ: published-manifest-verification

CI builds and packs every publishable package, verifies that all emitted external
imports are declared in `dependencies` or `peerDependencies`, installs the tarballs
in a clean Angular consumer, and builds that consumer. Test tools are dev
dependencies and never published peers.

### Release model

#### REQ: release-groups

The contract repository versions independently. Runtime and optional UI packages in
the implementation repository are a fixed release group and share a version.

## Acceptance Criteria

### AC: lean-extension

Given an extension with no external UI consumer
When its publishable frontend projects are listed
Then it has one contract package in `ext-<name>` and one runtime package in the
implementation repository, with no empty or speculative UI package.

### AC: reusable-ui-extension

Given an extension whose UI is consumed by another source library
When its packages are listed
Then it additionally publishes `@sneat/extension-<name>-ui`, and that UI package
contains no import from any runtime package.

### AC: single-contract-home

Given any `@sneat/extension-<name>-contract` package name
When package manifests across Sneat repositories are scanned
Then exactly one publishable manifest owns it and that manifest is in `ext-<name>`.

### AC: runtime-import-rejected-in-library

Given extension library source importing another extension's runtime or a legacy
`*-internal` package
When lint runs
Then lint fails even when the imported package comes from `node_modules` rather than
the local Nx workspace.

### AC: runtime-import-allowed-at-composition-root

Given an app bootstrap or app routing file importing provider registration or routes
from a runtime package
When lint runs
Then the import is allowed.

### AC: packed-package-smoke-test

Given a release candidate for a contract, runtime or UI package
When CI packs and installs it in the clean consumer fixture
Then dependency resolution, TypeScript compilation and the Angular production build
all succeed without undeclared peer imports.

## Migration

Legacy package names map as follows:

- `@sneat/extension-<name>-internal` -> `@sneat/extension-<name>`
- `@sneat/extension-<name>-shared` -> `@sneat/extension-<name>-ui` when reusable,
  otherwise merge into `@sneat/extension-<name>`

Migration is complete only after concrete cross-extension service/module imports
have moved to contract tokens and obsolete package names are absent from source and
manifests.

## Open Questions

None. The remaining work is rollout sequencing, not a change to the package model.
