# Frontend UX

House UX conventions for Sneat extensions, codified from the live frontends of
**calendarius**, **contactus**, and **listus**. Each rule cites a real example so
you can see it in context.

These are conventions, not a framework: extensions use **native Ionic** building
blocks (`ion-card`, `ion-list`, `ion-item`, `ion-button`) directly — there is no
custom card/button wrapper component. Consistency comes from following these
patterns, not from a shared widget.

## Principles

1. **Wrap content in cards.** A page is a stack of `ion-card`s, each grouping a
   coherent block of content.
2. **Actions live in the header, end-aligned.** Put action buttons in
   `<ion-buttons slot="end">` of the card/section header.
3. **Icon-only by default, label only when it matters.** Header buttons are
   icon-only (`color="medium"`); add a text label only for a primary affordance
   like "Add".
4. **Colour carries meaning.** Use Ionic colours semantically
   (`primary`/`danger`/`success`/`warning`/`medium`) — never decoratively.
5. **Lists belong in cards.** Scrollable collections are `ion-list` inside a card,
   with sliding/grouping patterns as needed.

## Contents

- [`cards.md`](./cards.md) — when and how to use `ion-card`, headers.
- [`card-title-buttons.md`](./card-title-buttons.md) — action buttons in card /
  section headers.
- [`buttons.md`](./buttons.md) — colour, fill, expand, and icon conventions.
- [`lists.md`](./lists.md) — `ion-list`, sliding items, grouped/collapsible lists.

## Where divergences exist

The three surveyed apps mostly agree. Where they differ, these docs **recommend
one convention and note the alternative** — they don't pretend a single style is
universal. Look for the **"Recommended"** callouts.
