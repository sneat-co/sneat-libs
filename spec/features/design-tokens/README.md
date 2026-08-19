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

### Token layer is the single source of truth

#### REQ: token-single-source

`@sneat/design-tokens` defines every color/semantic role, spacing step,
radius, typography scale, elevation (shadow) and motion (duration/easing)
value the platform's shared surfaces use, as plain CSS custom properties on
`:root` (or `:where(:root)` where zero-specificity defaults are required, per
the `@sneat/astro` precedent). No component library, app, or adapter defines
a competing color/spacing/radius value outside this package; they consume the
token or override its value, never invent a parallel one.

#### REQ: token-taxonomy

The taxonomy is layered, not a flat color list:

- **Primitive tier** (optional, internal): raw scale values (e.g. a neutral
  ramp) that only the semantic tier may reference.
- **Semantic tier** (the public contract): role-named tokens consumers bind
  to — `--color-bg`, `--color-bg-2`, `--color-surface`, `--color-border`,
  `--color-text`, `--color-text-muted`, `--color-accent`,
  `--color-accent-strong`, `--color-accent-soft`, `--color-accent-text`,
  `--color-danger`, `--color-warning`, `--color-success`, plus
  `--font-sans`/`--font-display`/`--font-body`, `--radius`/`--radius-sm`/
  `--radius-pill`, `--shadow`/`--shadow-sm`, `--ease`/`--duration-*`, and the
  `--space-1`…`--space-6` scale. This tier is deliberately the existing
  `@sneat/astro` `--color-*`/`--font-*`/`--radius*`/`--shadow*`/`--space-*`
  vocabulary, formalised and versioned as its own package rather than
  reinvented — see `## Migration`.
- No third "component" tier ships in this package: a component-shaped token
  (e.g. "button background") is an adapter's concern, not the core's.

#### REQ: token-runtime-neutral

The published package contains CSS custom-property declarations (and
documentation) only. It has no `peerDependencies`, `dependencies`, or runtime
import on Angular, `@ionic/angular`, `@ionic/core`, PrimeNG, or any other UI
runtime. A consumer with zero JavaScript framework (a static `<link>` or a
`.astro` import) can use the token layer standalone, exactly as
`@sneat/astro` sites do today.

### Two thin adapter layers, never one merged theme

#### REQ: two-adapter-packages

Framework binding ships as exactly two adapter packages, each mapping the
semantic tokens onto one target's own variable surface. There is no merged
"Ionic+PrimeNG theme" artifact: a merged theme would force every consumer to
carry both frameworks' mapping logic and would re-couple the two stacks the
founder has explicitly declined to couple.

#### REQ: ionic-adapter

`@sneat/design-tokens-ionic` maps semantic tokens onto Ionic's `--ion-*`
custom properties (`--ion-color-primary(-rgb|-contrast|-contrast-rgb|-shade|
-tint)`, `--ion-background-color`, `--ion-text-color`, `--ion-border-color`,
`--ion-font-family`, etc.), including the derived `-rgb`/`-shade`/`-tint`
variants Ionic's own component internals expect. It replaces, rather than
supplements, the unmodified Ionic starter palette currently checked in at
`libs/components/src/theme/variables.scss`. It is pure CSS (plus a
color-derivation build step, not a runtime dependency), so it applies equally
to Angular Ionic (`sneat-libs`, `@ionic/angular`) and non-Angular Ionic
(`gametable/web`, `@ionic/core` web components).

#### REQ: primeng-adapter-requires-unstyled

`@sneat/design-tokens-primeng` targets PrimeNG's **unstyled-mode**
design-token/CSS-variable surface only, and documents `unstyled: true` (as
Competios already configures via `providePrimeNG({ unstyled: true })` plus
its `PrimeNgExternalBaseStyle` override that suppresses PrimeNG's injected
base `<style>`) as a precondition for using it. Styled-mode PrimeNG ships its
own preset design system (Aura/Lara/etc.) as compiled component CSS that
tokens cannot cleanly override without fighting specificity; unstyled mode is
what makes a token-driven PrimeNG surface tractable at all — every visual
rule becomes a CSS variable or a slot the adapter's stylesheet fills in, so
this package's token values are the only source of PrimeNG's appearance.

#### REQ: primeng-adapter-mapping

`@sneat/design-tokens-primeng` maps semantic tokens onto the PrimeNG
CSS-variable names its unstyled components read (the `--p-*` namespace, e.g.
`--p-primary-color`, `--p-content-background`, `--p-text-color`,
`--p-border-radius`) and supplies the minimal structural CSS unstyled
components need (layout/spacing rules with no baked-in color), analogous to
what Competios currently hand-rolls in `styles.scss` for `.p-hidden-accessible`
/ `.p-overflow-hidden` and its bespoke `--paper-*` values.

### Zero dependency on either UI library in the core package

#### REQ: core-zero-ui-dependency

`@sneat/design-tokens` (the core package) ships zero lines of Ionic- or
PrimeNG-specific code and declares no dependency, `peerDependency`, or
`optionalDependency` on either. This is enforced the same way
`extension-library-architecture`'s `runtime-import-rejected-in-library`
requirement is enforced today: lint fails on any Ionic/PrimeNG import inside
the core package's source, including transitively via `node_modules`.

#### REQ: adapters-separate-published-entry-points

`@sneat/design-tokens-ionic` and `@sneat/design-tokens-primeng` are
independently published packages (or, at minimum, separate `exports` entry
points with independent `peerDependencies`), each declaring exactly one
framework as a peer dependency (`@ionic/angular` / `@ionic/core` for the
Ionic adapter, `primeng` for the PrimeNG adapter). An Ionic-only app's
install never resolves PrimeNG, and vice versa — following the same
contract-only import discipline `sneat-extension-contract-only-imports`
already establishes for extensions.

### Light/dark and per-product brand theming

#### REQ: light-dark-tokens

Every semantic color token has a defined light value and a defined dark
value, switched by a single mechanism (a `data-theme` attribute or
`prefers-color-scheme`, mirroring `@sneat/astro`'s existing dark-mode
approach) applied once at the document root. Adapters do not define their
own separate dark-mode logic; they inherit whichever value the core layer
currently resolves to.

#### REQ: brand-retheme-via-tokens-only

A product (GameTable.space, Competios, Sneat.app, or any future brand) is
re-themed entirely by overriding the semantic token *values* in its own
`:root` block — never by forking, overriding, or `!important`-patching
component-level CSS (Ionic's `.md`/`.ios` mode styles, PrimeNG's per-
component classes, or ad hoc rules like `gametable/web`'s current
`ion-card.table-ion-card { … !important }` block). A brand's palette is a
token file, not a stylesheet fork.

### Coexistence: Ionic and PrimeNG on the same page

#### REQ: coexistence-scoping-strategy

The spec documents a concrete reset/scoping strategy so an Ionic-hosted page
can embed a PrimeNG-Angular subtree (the GameTable venue-page/tournament-
bracket case) without either library's global reset or base styles leaking
into the other's DOM region: which selectors each adapter's base stylesheet
is scoped under (e.g. Ionic's own shadow-DOM encapsulation for `ion-*`
elements vs. a scoping class/host boundary around the PrimeNG-unstyled
subtree), and which global resets (box-sizing, margin resets, focus rings)
are asserted at most once for the whole page rather than by both adapters.

#### REQ: coexistence-specificity-budget

The two adapters' stylesheets are documented to stay within a bounded,
non-overlapping specificity budget (attribute/class selectors only, no ID
selectors, no unscoped element selectors that could match the other
library's elements, no `!important` except where a target framework's own
internals force it and that exception is named). This is what removes the
need for the `!important` fights currently present in `gametable/web`'s
`style.css`.

#### REQ: coexistence-page-layout-ownership

For any page that mixes both stacks, the spec/adapter documentation states
which stack owns page-level layout (the outer shell, safe-area insets,
scroll container) — the founder's forcing case (Ionic shell hosting a
PrimeNG bracket) implies Ionic owns the page chrome and PrimeNG owns only the
embedded subtree's internal layout, but this is documented per-page-pattern,
not hard-coded into either adapter, since the founder may later choose the
opposite composition for a different product.

### Migration: incremental adoption, no big-bang

#### REQ: migration-step-zero

An existing Ionic app (starting with `sneat-libs`'s own `libs/components`
theme) adopts `@sneat/design-tokens` + `@sneat/design-tokens-ionic` as a
drop-in replacement for `libs/components/src/theme/variables.scss`, producing
**pixel-equivalent output** (the current unmodified Ionic starter palette,
reproduced as token values) before any brand value changes. Step zero proves
the plumbing with zero visual regression; rebranding is a separate, later
step of changing token values only.

#### REQ: migration-astro-contract-alignment

`@sneat/astro`'s existing `src/styles/contract.css` is treated as the
reference semantic vocabulary this package formalises, not a second
competing contract. Reconciling the two (whether `@sneat/astro` ends up
depending on `@sneat/design-tokens`, mirrors its token names, or the two stay
independently versioned but name-aligned) is resolved during implementation
planning — see `## Open Questions`.

## Acceptance Criteria

### AC: core-package-has-no-ui-framework-import

Given the published `@sneat/design-tokens` package source and manifest
When its `package.json` and source tree are scanned for Angular, `@ionic/*`,
or `primeng` imports and dependency declarations
Then none are found — the package resolves and can be imported into a plain
`<link rel="stylesheet">` or a non-Angular build with no framework installed.

### AC: ionic-only-app-never-installs-primeng

Given an Ionic-only application that depends on `@sneat/design-tokens` and
`@sneat/design-tokens-ionic` only
When its dependency tree is resolved
Then `primeng` and `@sneat/design-tokens-primeng` do not appear anywhere in
the install, and vice versa for a PrimeNG-only application.

### AC: primeng-adapter-documents-unstyled-precondition

Given a team adopting `@sneat/design-tokens-primeng`
When they read the adapter's setup documentation
Then it states `providePrimeNG({ unstyled: true })` (plus suppressing
PrimeNG's injected base stylesheet, as Competios's
`PrimeNgExternalBaseStyle` does) as a required precondition, and explains
that styled-mode PrimeNG presets are out of scope because their compiled
component CSS cannot be cleanly token-overridden.

### AC: step-zero-no-visual-regression

Given `sneat-libs`'s `libs/components` theme migrated from
`libs/components/src/theme/variables.scss` onto
`@sneat/design-tokens` + `@sneat/design-tokens-ionic`
When the app is rendered before and after the migration with no token value
changes
Then a visual diff of the shared component surfaces shows no pixel
regression — the migration step is plumbing-only.

### AC: brand-reskin-changes-tokens-only

Given three products — GameTable.space, Competios, and Sneat.app — each with
its own brand palette expressed as `@sneat/design-tokens` value overrides
When each product's `:root` token file is swapped for another product's
Then each product visually re-skins correctly with no changes to any
component template, adapter stylesheet, or `!important` override — proving
the brand lives entirely in token values.

### AC: same-page-ionic-primeng-coexistence

Given the GameTable.space venue page rendering an Ionic page shell around an
embedded Competios PrimeNG tournament-bracket component (the founder's
forcing case)
When the composed page is inspected
Then neither library's base reset or component styles bleed into the other's
DOM region, both read the same semantic token values (so colors, radii, and
type match), and no `!important` override is required to keep them from
colliding — replacing the `!important`-laden Ionic overrides currently in
`gametable/web/src/style.css`.

### AC: dark-mode-switches-both-stacks-together

Given a page with both an Ionic surface and a PrimeNG-unstyled surface on
screen, themed via `@sneat/design-tokens`
When the document's dark-mode switch (attribute or `prefers-color-scheme`)
toggles
Then both surfaces switch color together, from the same token update, with no
separate dark-mode logic in either adapter.

### AC: adapter-import-rejected-in-core-lint

Given source inside `@sneat/design-tokens` (core) that imports from
`@ionic/angular`, `@ionic/core`, or `primeng`
When lint runs
Then lint fails, the same way `runtime-import-rejected-in-library` fails
extension packages that import another extension's runtime.

## Open Questions

- **Ionic-vs-PrimeNG primacy is explicitly NOT decided by this spec.** The
  founder has an outstanding architectural decision on which stack is
  primary overall, or whether primacy is assigned per product/surface class.
  This feature is designed to be correct under either outcome — the core
  token layer and both adapters exist regardless of which stack "wins," and
  no requirement here assumes one is more important than the other. Any
  future decision on primacy is the founder's to make and does not require
  re-specifying this feature; it may add requirements (e.g. "new surfaces
  default to stack X") but should not remove either adapter.
- **Should `unstyled: true` become a required platform-wide convention for
  every future PrimeNG consumer**, or does the PrimeNG adapter also need to
  cope with styled-mode PrimeNG for a consumer that can't or won't disable
  presets? Competios already chose unstyled; whether that becomes a fleet
  rule (like the existing contract-only-imports rule) is a founder call, not
  assumed here.
- **Relationship to `@sneat/astro`'s existing `--color-*` contract.** This
  spec treats that contract as the reference vocabulary to formalise, but
  does not decide the mechanics: does `@sneat/astro` come to depend on
  `@sneat/design-tokens` and drop its own `contract.css`, do the two stay
  independently versioned with names kept in sync by convention, or does
  `@sneat/design-tokens` re-export/alias the `@sneat/astro` contract? Left
  for implementation planning; whichever answer is chosen, the ~40 landings
  currently consuming `@sneat/astro` must see no breaking token rename.
- **Publishing/versioning model.** `@sneat/design-tokens` must be consumed by
  at least three different build systems that don't share a release
  cadence: the Nx/Angular workspace (`sneat-libs`), Vite/vanilla
  (`gametable/web`), and Astro (`sneat-astro` sites, transitively). `@sneat/
  astro` was deliberately kept out of `sneat-libs`' lockstep Angular release
  for the same reason. Whether `@sneat/design-tokens` and its adapters live
  in `sneat-libs`' Nx workspace with independent (non-lockstep) versioning,
  or move to their own repo the way `@sneat/astro` did, is not decided here.
- **Full Ionic CSS-variable inventory is unknown until implementation.**
  Ionic components read additional `--ion-*` variables per component beyond
  the documented palette (`-rgb`/`-shade`/`-tint` derivatives, component-
  specific overrides). Whether the v1 Ionic adapter's mapped surface (the
  documented global palette) is sufficient, or a per-component audit is
  needed before `libs/components` can fully retire its current
  `variables.scss`, is to be scoped during planning.

---
*This document follows the https://specscore.md/feature-specification*
