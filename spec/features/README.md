---
format: https://specscore.md/features-index-specification
---

# Features

Feature specifications for this project.

## Index

| Feature | Status | Description |
|---------|--------|-------------|
| [extension-library-architecture](extension-library-architecture/README.md) | Stable | The contract/shared/internal three-lib-per-extension decomposition, cross-extension DI-token rule, and nx module-boundary enforcement that keep the extension dependency graph a DAG. |
| [extension-contract-repo](extension-contract-repo/README.md) | Approved | The convention for extracting each extension's public contract surface into a dedicated, dependency-light <name>-ext repo (polyglot backend/ + frontend/), with the zero-other-extension-deps invariant, the ownership test that decides what lives there, the two cross-extension interaction directions, naming, and enforcement. |
| [contactus-ext](contactus-ext/README.md) | Approved | Apply the extension-contract-repo convention to contactus as the reference implementation: stand up sneat-co/contactus-ext, relocate the backend contactusmodels and the frontend contract lib into it, re-home test-passing contributor interfaces, repoint all consumers, and release contract-first. Iterative — right direction, not one-shot completeness. |

## Open Questions

None at this time.

---
*This document follows the https://specscore.md/features-index-specification*
