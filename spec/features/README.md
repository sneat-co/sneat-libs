---
format: https://specscore.md/features-index-specification
---

# Features

Feature specifications for this project.

## Index

| Feature | Status | Description |
|---------|--------|-------------|
| [Extension frontend package architecture](extension-library-architecture/README.md) | Stable | Every frontend extension has an independently released contract and one host-facing runtime package. An additional UI package exists only when another extension or app reuses implementation-level UI. Angular DI tokens keep behavioural dependencies on the contract, while Nx boundaries and package-aware linting protect both workspace and cross-repository imports. |
| [Per-extension contract repo (`ext-<name>`) convention](extension-contract-repo/README.md) | Approved | The convention for extracting each extension's public contract surface into a dedicated, dependency-light `ext-<name>` repo (polyglot `backend/` + `frontend/`), with the zero-other-extension-deps invariant, the ownership test that decides what lives there, the two cross-extension interaction directions, naming, and enforcement. |
| [contactus reference extraction into `ext-contactus`](contactus-ext/README.md) | Approved | Apply the `extension-contract-repo` convention to `contactus` as the reference implementation: stand up `ext-contactus`, relocate the backend `contactusmodels` and the frontend contract lib into it, re-home test-passing contributor interfaces, repoint all consumers, and release contract-first. Explicitly iterative — the goal is the right direction proven end-to-end on `contactus`, not one-shot completeness. |

## Open Questions

None at this time.

---
*This document follows the https://specscore.md/features-index-specification*
