# Cards

`ion-card` is the primary content container. A page is a vertical stack of cards,
each grouping one coherent block (a list, a form, a detail section).

## Use a card for each content block

Wrap each logical section — a list, a filter+segment+list combo, a detail
block — in its own `<ion-card>`. Use **native Ionic** cards; there is no custom
card wrapper component.

Examples:
- `listus/.../pages/lists/lists-page.component.html` — list groups wrapped in a card.
- `contactus/.../components/contacts-component/contacts.component.html` — a card
  wraps a filter, an `ion-segment`, and the contact list together.
- `contactus/.../components/contact-details/contact-details.component.html` — a
  detail block in a card.

## Card headers

There are two header styles in use. Pick by whether the header carries actions or
collapses.

### Recommended: `ion-item-divider` for actionable / collapsible headers

When the header has buttons or toggles a collapsible section, use an
`ion-item-divider` (or an `ion-item`) as the header row, with actions in
`slot="end"`:

```html
<ion-item-divider color="light" class="with-buttons" tappable>
  <ion-label>{{ listGroup.title }}</ion-label>
  <ion-buttons slot="end">
    <ion-button color="medium" (click)="addTo($event, listGroup.type)">
      <ion-icon name="add" />
    </ion-button>
  </ion-buttons>
</ion-item-divider>
```
*(listus `lists-page.component.html`)*

This is the dominant pattern for headers that **do** something (add, edit,
expand/collapse).

### Acceptable: `ion-card-header` for static titles

A plain `ion-card-header` + `ion-card-title` is fine for a **purely static**
title with no actions (as some contactus cards do). If you later add a button,
prefer switching to the `ion-item` / `ion-item-divider` form so the action sits
cleanly in `slot="end"`.

## Summary

- One `ion-card` per content block; native Ionic only.
- Header with actions/collapse → `ion-item-divider` (or `ion-item`), actions in
  `slot="end"`. **Recommended.**
- Static title, no actions → `ion-card-header` is acceptable.
