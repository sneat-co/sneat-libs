# Buttons in Card / Section Headers

Action buttons that belong to a card or section go in the **header row**,
**end-aligned**, inside `<ion-buttons slot="end">`. This is the most consistent
convention across the surveyed apps.

## The pattern

```html
<ion-item-divider color="light" tappable>
  <ion-label>{{ title }}</ion-label>
  <ion-buttons slot="end">
    <ion-button color="medium" (click)="doSomething()">
      <ion-icon name="create" />
    </ion-button>
  </ion-buttons>
</ion-item-divider>
```

- The action sits in `<ion-buttons slot="end">` so it aligns to the right of the
  header.
- `color="medium"` is the default for these neutral/secondary header actions.

Examples:
- `contactus/.../components/contact-details/contact-details.component.html` —
  edit button (`name="create"`, `color="medium"`) in the card header item.
- `listus/.../pages/lists/lists-page.component.html` — `add` button in an
  `ion-item-divider` header.

## Icon-only by default

Header buttons are **icon-only**. Don't add a text label unless the button is a
**primary affordance** the user is meant to seek out — most commonly "Add":

```html
<ion-buttons slot="end">
  <ion-button routerLink="new-member" (click)="$event.stopPropagation()">
    <ion-icon name="add-outline" slot="start" />
    <ion-label>Add</ion-label>
  </ion-button>
</ion-buttons>
```
*(contactus `members-card-header.component.html` — icon **+** label for the
primary "Add".)*

## Rules of thumb

| Header action | Style |
| --- | --- |
| Edit / secondary / utility | Icon-only, `color="medium"` |
| Primary "Add" (the point of the section) | Icon **+** `Add` label |
| Destructive in a header | Icon-only, `color="danger"` |
| Inside a `tappable` collapsible header | `(click)="$event.stopPropagation()"` so the button doesn't toggle the section |

See [`buttons.md`](./buttons.md) for the full colour/fill semantics.
