# @sneat/datagrid

Angular wrapper around [Tabulator](http://tabulator.info) (`sneat-datagrid`),
used for dense result grids — e.g. DataTug's table/query results page.

## Basic usage

```html
<sneat-datagrid
  [columns]="columns"
  [data]="rows"
  layout="fitColumns"
/>
```

## Cell selection (opt-in)

Cell/range selection is off by default so existing consumers are unaffected.
Set `selectableRange` to enable it, and listen to `cellSelected` for the
currently active cell (fired on a mouse click, and — once `selectableRange`
is on — on keyboard arrow-key navigation between cells too):

```html
<sneat-datagrid
  [columns]="columns"
  [data]="rows"
  [selectableRange]="true"
  (cellSelected)="onCellSelected($event)"
/>
```

```ts
import { IDataGridCellSelectedEvent } from '@sneat/datagrid';

onCellSelected(event: IDataGridCellSelectedEvent): void {
  // event.column.field  — e.g. "CustomerId"
  // event.column.index  — the field's position in the `columns` input
  // event.value         — the cell's current value
  // event.rowData       — the full row's data object
  console.log(event);
}
```

`selectableRange` mirrors Tabulator's own option: `true` for unlimited
ranges, or a number to cap how many ranges can be selected at once. It is
mutually exclusive with row selection (`selectable`) — Tabulator disables
range selection and logs a console warning if both are set.

## Column markers

`columnMarkers` renders a small, unobtrusive badge in a column's header,
keyed by field. The grid applies no semantic meaning to these — it only
renders what the consumer passes (e.g. a semantic-detection layer flagging a
declared or inferred `CustomerId` column):

```html
<sneat-datagrid
  [columns]="columns"
  [data]="rows"
  [columnMarkers]="{ CustomerId: { label: 'PK', title: 'Primary key', kind: 'declared' } }"
/>
```

`kind` is purely presentational (`'declared'` vs `'inferred'` render with a
slightly different style); it carries no behaviour.
