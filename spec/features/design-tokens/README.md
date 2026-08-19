---
format: https://specscore.md/feature-specification
status: Draft
---

# Feature: Framework-neutral design tokens (@sneat/design-tokens)

> [SpecScore.**Studio**](https://specscore.studio): | [Explore](https://specscore.studio/app/github.com/sneat-co/sneat-libs/spec/features/design-tokens?op=explore) | [Edit](https://specscore.studio/app/github.com/sneat-co/sneat-libs/spec/features/design-tokens?op=edit) | [Ask question](https://specscore.studio/app/github.com/sneat-co/sneat-libs/spec/features/design-tokens?op=ask) | [Request change](https://specscore.studio/app/github.com/sneat-co/sneat-libs/spec/features/design-tokens?op=request-change) |
**Status:** Draft
**Source Ideas:** —

## Summary

A framework-neutral CSS custom-property token layer that both Ionic 8 and PrimeNG 21.1.9 (unstyled mode) consume through thin, separately-published adapters, so a surface reads as one product regardless of which component library rendered it, without pre-empting the founder's open Ionic-vs-PrimeNG primacy decision.

## Problem

The Sneat platform runs two UI component stacks with no chosen primary:

- **Ionic 8** (`@ionic/angular` `^8.7.18` in `sneat-libs`, `@ionic/core` in
  `gametable/web`) is the incumbent with heavy investment across Calendar,
  Contacts, Assets and the mobile shell. The founder: *"there is a lot invested
  into Ionic and I can't simply move out of it"* and *"Ionic mobile feel matters
  more for behind-the-counter use than the theming pain."*
- **PrimeNG 21.1.9** is used by `sneat-co/competios` (`frontend/`, configured
  `providePrimeNG({ unstyled: true })` in `app.config.ts`) where it is more
  powerful — org charts, chat, and complex data surfaces such as tournament
  brackets.

Founder ruling: *"Ionic primary at the moment but that can change. Or Ionic can
be primary for some class of apps and Prime for other."* He asked: *"Maybe we
should have our own design-tokens that adapt to both?"* — that is the question
this feature answers, without pre-empting which stack (or which stack per
product) he eventually chooses as primary.

A concrete forcing case already exists: the public venue page on
GameTable.space (`gametable/web`, Vite + `@ionic/core` web components, no
Angular) must render Competios tournament brackets — a PrimeNG-Angular
surface — inline, and the public and admin views of the same venue must not
diverge into two visual systems.

Auditing the current repos shows the problem is not hypothetical, it is
already three-way divergent:

- `sneat-libs/libs/components/src/theme/variables.scss` still ships the
  **unmodified Ionic starter palette** (`--ion-color-primary: #3880ff`, …) —
  no Sneat brand has ever been layered onto it.
- `sneat-co/competios/frontend/src/styles.scss` defines its own bespoke
  `--paper-*` / `--accent*` vocabulary, mixes it with literal hex fallbacks in
  most component rules, and coexists with PrimeNG's own unstyled-mode
  `--p-*` variables (e.g. `--p-scrollbar-width`) and utility classes
  (`.p-hidden-accessible`, `.p-overflow-hidden`).
- `sneat-co/gametable/web/src/style.css` defines a third, unrelated dark
  vocabulary (`--bg-*`, `--text-*`, `--accent-*`, `--border-*`), and fights
  Ionic's own component styling with `!important` overrides
  (`ion-card.table-ion-card { background: var(--bg-card) !important; … }`)
  instead of mapping into `--ion-*`.
- A fourth, more mature vocabulary already exists outside these apps: the
  `@sneat/astro` package's `src/styles/contract.css` defines a semantic
  `--color-{bg,bg-2,bg-3,surface,soft,border,text,text-muted,text-faint,
  accent,accent-strong,accent-soft,accent-text,danger}` contract (plus
  `--font-*`, `--radius*`, `--shadow*`, `--space-*`), declared at
  `:where(:root)` zero-specificity so any site's own tokens win, and it is
  already the de-facto shared palette for ~40 Sneat landing sites. It is the
  closest thing the platform has to what this feature needs formalised — but
  it lives in a separate, non-Angular repo and was never built to also drive
  Ionic or PrimeNG components.

Without a shared, framework-neutral token layer, every new surface either
forks a fifth palette or hard-codes colours, and a venue page that mixes Ionic
and PrimeNG has no way to look like one product.

## Behavior

TODO: How does this feature work?

## Acceptance Criteria

TODO: Define acceptance criteria.

## Open Questions

None at this time.

---
*This document follows the https://specscore.md/feature-specification*
