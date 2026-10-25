import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
  inject,
  ChangeDetectionStrategy
} from '@angular/core';
import { ErrorLogger, IErrorLogger } from '@sneat/core';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import {
  Tabulator,
  SelectRowModule,
  SelectRangeModule,
  KeybindingsModule,
  MenuModule,
  InteractionModule,
  Module,
  RowContextMenuSignature,
} from 'tabulator-tables';
import type {
  CellComponent,
  Formatter,
  RangeComponent,
} from 'tabulator-tables';
import { IGridColumn } from '@sneat/grid';
import { TabulatorColumn, TabulatorOptions } from '../../tabulator';

class AdvertModule extends Module {
  public static override moduleName = 'advert';

  override initialize() {
    return;
  }
}

Tabulator.registerModule([
  InteractionModule,
  SelectRowModule,
  // SelectRange enables opt-in cell/range selection (selectableRange input).
  // KeybindingsModule wires the arrow-key navigation SelectRange relies on;
  // its default bindings are only *active* when we don't disable them via
  // the `keybindings` table option, which we do unless selectableRange is on
  // (see setTabulatorOptions()) so existing consumers see no behaviour change.
  SelectRangeModule,
  KeybindingsModule,
  AdvertModule,
  MenuModule,
]);

/**
 * A marker rendered unobtrusively in a column's header, e.g. to flag a
 * semantically-recognised field (a declared or inferred `CustomerId`, etc).
 * The grid has no semantic logic of its own — it only renders what the
 * consumer passes here.
 */
export interface IDataGridColumnMarker {
  readonly label: string;
  readonly title?: string;
  readonly kind?: 'declared' | 'inferred';
}

/** Payload emitted by {@link DataGridComponent.cellSelected}. */
export interface IDataGridCellSelectedEvent {
  readonly row: unknown;
  readonly column: { readonly field: string; readonly index: number };
  readonly value: unknown;
  readonly rowData: unknown;
}

// export interface IGridDef {
// 	columns: IGridColumn[],
// 	rows?: unknown[],
// 	groupBy?: string;
// }
//
// export const getTabulatorCols = (cols: IGridColumn[]): any[] => cols.map(c => {
// 	const v = {...c};
// 	delete v.dbType;
// 	return v;
// });
//
// export interface IGridColumn {
// 	field: string;
// 	colName?: string;
// 	dbType: string;
// 	title: string;
// 	tooltip?: (cell: any) => string;
// 	formatter?: any;
// 	hozAlign?: 'left' | 'right';
// 	widthShrink?: number;
// 	widthGrow?: number;
// 	width?: number | string;
// }

/**
 * This is a wrapper class for the tabulator JS library.
 * For more info see http://tabulator.info
 */
@Component({
  selector: 'sneat-datagrid',
  template: `
    <div id="tabulator" #tabulatorDiv></div>
    <p class="ion-margin-start">Rows: {{ data?.length }}</p>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
})
export class DataGridComponent implements AfterViewInit, OnChanges {
  private readonly errorLogger = inject<IErrorLogger>(ErrorLogger);

  // TODO: Skipped for migration because:
  //  Your application code writes to the input. This prevents migration.
  @Input() layout?: 'fitData' | 'fitColumns' = 'fitColumns';
  // TODO: Skipped for migration because:
  //  Your application code writes to the input. This prevents migration.
  @Input() data?: unknown[] = [];
  // TODO: Skipped for migration because:
  //  Your application code writes to the input. This prevents migration.
  @Input() columns?: IGridColumn[] = [];
  // TODO: Skipped for migration because:
  //  Your application code writes to the input. This prevents migration.
  @Input() groupBy?: string;
  // TODO: Skipped for migration because:
  //  Your application code writes to the input. This prevents migration.
  @Input() height?: string;
  // TODO: Skipped for migration because:
  //  Your application code writes to the input. This prevents migration.
  @Input() maxHeight?: string | number;
  // TODO: Skipped for migration because:
  //  Your application code writes to the input. This prevents migration.
  @Input() rowContextMenu?: RowContextMenuSignature;
  @ViewChild('tabulatorDiv', { static: true }) tabulatorDiv?: ElementRef;

  // TODO: Skipped for migration because:
  //  Your application code writes to the input. This prevents migration.
  @Input() rowClick?: (event: Event, row: unknown) => void;

  @Output() readonly rowSelected = new EventEmitter<{
    row: unknown;
    event?: Event;
  }>();

  @Output() readonly rowDeselected = new EventEmitter<{
    row: unknown;
    event?: Event;
  }>();

  /**
   * Enables Tabulator's cell/range selection (opt-in; off by default so
   * existing consumers are unaffected). Mirrors Tabulator's own
   * `selectableRange` option: `true` for unlimited ranges, or a number to
   * cap how many ranges can be selected at once. Mutually exclusive with
   * row selection (`selectable`) — Tabulator disables range selection and
   * logs a console warning if both are set.
   */
  @Input() public selectableRange?: boolean | number;

  /**
   * Small, unobtrusive markers rendered in column headers, keyed by field.
   * The grid applies no semantic meaning to these — it only renders what
   * the consumer passes (e.g. a semantic-detection layer flagging a
   * `CustomerId` column).
   */
  @Input() public columnMarkers?: Record<string, IDataGridColumnMarker>;

  /**
   * Emitted when a single cell becomes the active selection, either via a
   * mouse click (always, regardless of `selectableRange`) or, once
   * `selectableRange` is enabled, via keyboard arrow-key navigation between
   * cells. Not emitted for multi-cell range drag-selection.
   */
  @Output() readonly cellSelected = new EventEmitter<IDataGridCellSelectedEvent>();

  // private tab = document.createElement('div');
  private tabulator?: Tabulator;

  // TODO: Skipped for migration because:
  //  Your application code writes to the input. This prevents migration.
  @Input() public selectable?: boolean | number | 'highlight';

  private tabulatorOptions?: TabulatorOptions;
  private clickEvent?: Event;

  ngOnChanges(changes: SimpleChanges): void {
    try {
      if (
        (changes['data'] && this.data && this.columns) ||
        (changes['columns'] && this.columns) ||
        (changes['rowClick'] && this.rowClick)
      ) {
        this.drawTable();
      } else if (changes['columnMarkers'] && this.tabulator && this.columns) {
        // columnMarkers can arrive after the initial draw (e.g. a semantic
        // layer resolving markers asynchronously) — refresh header markers
        // in place without a full data redraw.
        const columnDefinitions = this.buildColumnDefinitions();
        if (columnDefinitions) {
          this.tabulator.setColumns(columnDefinitions);
        }
      }
    } catch (ex) {
      this.errorLogger.logError(
        ex,
        'Failed to process ngOnChanges in DataGridComponent',
      );
    }
  }

  // ngOnDestroy(): void {
  // console.log('DataGridComponent.ngOnDestroy()', this.tabulator);
  // try { // TODO: destroy Tabulator
  // 	if (this.tabulator?.element) {
  // 		// noinspection TypeScriptValidateJSTypes
  // 		this.tabulator.element.tabulator('destroy');
  // 	}
  // } catch (ex) {
  // 	this.errorLogger.logError(ex, 'Failed to destroy tabulator');
  // }
  // }

  ngAfterViewInit(): void /* Intentionally not ngOnInit */ {
    if (this.tabulator) {
      try {
        this.tabulator.redraw();
      } catch (e) {
        this.errorLogger.logError(e, 'Failed to redraw tabulator', {
          show: false,
          report: false,
        });
      }
    }
  }

  private drawTable(): void {
    if (!this.data || !this.columns) {
      console.warn('drawTable()', 'columns:', this.columns, 'data:', this.data);
      return;
    }
    try {
      if (!this.tabulatorDiv) {
        this.errorLogger.logError(new Error('!this.tabulatorDiv'));
        return;
      }
      if (this.tabulatorOptions) {
        this.tabulatorOptions = { ...this.tabulatorOptions, data: this.data };
        this.tabulator
          ?.setData(this.data)
          .catch(this.errorLogger.logErrorHandler('Failed to set data'));
      } else {
        this.createTabulatorGrid();
      }
      // this.tabulatorDiv.nativeElement.appendChild(this.tab);
      // tabulator.redraw();
    } catch (e) {
      this.errorLogger.logError(e, 'Failed to drawTable');
    }
  }

  private createTabulatorGrid(): void {
    this.setTabulatorOptions();
    if (!this.tabulator) {
      this.tabulatorOptions = {
        ...this.tabulatorOptions,
        // rowClick: function (e, row) {
        // 	console.log('rowClick1', row);
        // },
        // rowSelect: function (row) {
        // 	console.log('rowSelect', row);
        // },
        // rowDeselect: function (row) {
        // 	console.log('rowDeselect', row);
        // }
      };
      this.tabulator = new Tabulator(
        this.tabulatorDiv?.nativeElement,
        this.tabulatorOptions,
      );
      this.tabulator.on('rowClick', (event: Event, row: unknown) => {
        this.clickEvent = event;
        if (this.rowClick) {
          this.rowClick(event, row);
        }
      });
      this.tabulator.on('rowSelected', (row: unknown) =>
        this.rowSelected.emit({ row, event: this.clickEvent }),
      );
      this.tabulator.on('rowDeselected', (row: unknown) =>
        this.rowDeselected.emit({ row, event: this.clickEvent }),
      );
      // Mouse-click selection: fires regardless of selectableRange.
      this.tabulator.on('cellClick', (_event: UIEvent, cell: CellComponent) => {
        this.emitCellSelected(cell);
      });
      // Keyboard-driven selection: only fires once selectableRange is on —
      // the SelectRange module is inert otherwise. A plain click always
      // creates a *new* range (rangeAdded), so listening to rangeChanged
      // (bounds moved on the *existing* range) picks up arrow-key
      // navigation and single-cell drag adjustments without double-firing
      // alongside the cellClick handler above.
      this.tabulator.on('rangeChanged', (range: RangeComponent) => {
        this.handleRangeChanged(range);
      });
    }
  }

  /** column.index is the field's position in the `columns` input array. */
  private emitCellSelected(cell: CellComponent): void {
    const field = cell.getField();
    this.cellSelected.emit({
      row: cell.getRow(),
      column: {
        field,
        index: this.columns?.findIndex((c) => c.field === field) ?? -1,
      },
      value: cell.getValue(),
      rowData: cell.getData(),
    });
  }

  private handleRangeChanged(range: RangeComponent): void {
    const bounds = range.getBounds();
    // Only report single-cell selections; multi-cell range drag-selection
    // is visual-only for now (out of scope for this task).
    if (bounds.start.getElement() === bounds.end.getElement()) {
      this.emitCellSelected(bounds.end);
    }
  }

  private buildColumnDefinitions(): TabulatorColumn[] | undefined {
    return this.columns?.map((c) => {
      const col: TabulatorColumn = {
        // TODO(help-wanted): Use strongly typed Tabulator col def
        field: c.field,
        title: c.title || c.field || c.title,
        // headerTooltip: () =>
        // 	`${c.colName || c.title || c.field}: ${c.dbType}`,
      };
      if (c.colName !== 'Id' && c.colName?.endsWith('Id')) {
        col.formatter = 'link';
        col.formatterParams = {
          url: 'test-url',
        };
        col.cellClick = (e: Event, cell: unknown) => {
          void cell;
          e.preventDefault();
          e.stopPropagation();
        };
      }
      if (c.tooltip) {
        col.tooltip = c.tooltip;
      }
      if (c.formatter) {
        col.formatter = c.formatter;
      }
      if (c.hozAlign) {
        col.hozAlign = c.hozAlign;
      }
      if (c.headerHozAlign) {
        col.headerHozAlign = c.headerHozAlign;
      }
      if (c.widthGrow) {
        col.widthGrow = c.widthGrow;
      }
      if (c.widthShrink) {
        col.widthShrink = c.widthShrink;
      }
      if (c.width !== undefined) {
        col.width = c.width;
      }
      const marker = c.field ? this.columnMarkers?.[c.field] : undefined;
      if (marker) {
        col.titleFormatter = this.buildColumnMarkerTitleFormatter(marker);
      }
      // console.log('col:', col);
      return col;
    });
  }

  /**
   * Renders the column's title text plus an unobtrusive marker badge.
   * Inline styles (rather than a stylesheet) keep this correct regardless
   * of the host app's CSS and Angular's view encapsulation — Tabulator
   * renders headers into plain DOM nodes outside the component's template,
   * which emulated encapsulation would not otherwise scope styles onto.
   */
  private buildColumnMarkerTitleFormatter(
    marker: IDataGridColumnMarker,
  ): Formatter {
    return (cell: CellComponent): HTMLElement => {
      const wrapper = document.createElement('span');
      wrapper.style.display = 'inline-flex';
      wrapper.style.alignItems = 'center';
      wrapper.style.gap = '4px';

      const titleSpan = document.createElement('span');
      titleSpan.textContent = String(cell.getValue() ?? '');
      wrapper.appendChild(titleSpan);

      const markerSpan = document.createElement('span');
      markerSpan.textContent = marker.label;
      markerSpan.style.display = 'inline-block';
      markerSpan.style.fontSize = '0.65em';
      markerSpan.style.fontWeight = '600';
      markerSpan.style.lineHeight = '1.4';
      markerSpan.style.padding = '0 4px';
      markerSpan.style.borderRadius = '3px';
      markerSpan.style.opacity = '0.75';
      markerSpan.style.whiteSpace = 'nowrap';
      markerSpan.style.border =
        marker.kind === 'inferred'
          ? '1px dashed currentColor'
          : '1px solid currentColor';
      if (marker.kind === 'inferred') {
        markerSpan.style.fontStyle = 'italic';
      }
      if (marker.title) {
        markerSpan.title = marker.title;
      }
      wrapper.appendChild(markerSpan);

      return wrapper;
    };
  }

  private setTabulatorOptions(): void {
    this.tabulatorOptions = {
      // tooltipsHeader: true, // enable header tooltips
      // tooltipGenerationMode: 'hover',
      rowContextMenu: this.rowContextMenu,
      selectableRows: this.selectable,
      data: this.data,
      // reactiveData: true, // enable data reactivity
      columns: this.buildColumnDefinitions(),
      layout: this.layout || 'fitColumns',
    };
    if (this.selectableRange) {
      this.tabulatorOptions = {
        ...this.tabulatorOptions,
        selectableRange: this.selectableRange,
      };
    } else {
      // Registering KeybindingsModule activates its default arrow/page/home
      // keybindings table-wide (they only *do* something in modules that
      // subscribe to them, but scrolling/focus side effects are otherwise
      // observable). Explicitly disabling them keeps existing consumers'
      // behaviour identical unless they opt into selectableRange.
      this.tabulatorOptions = {
        ...this.tabulatorOptions,
        keybindings: false,
      };
    }
    if (this.height) {
      this.tabulatorOptions = {
        ...this.tabulatorOptions,
        height: this.height,
      };
    }
    if (this.maxHeight) {
      this.tabulatorOptions = {
        ...this.tabulatorOptions,
        maxHeight: this.maxHeight,
      };
    }
    if (this.groupBy) {
      this.tabulatorOptions = {
        ...this.tabulatorOptions,
        groupBy: this.groupBy,
        groupHeader: (value: unknown, count: number) => {
          // value - the value all members of this group share
          // count - the number of rows in this group
          // data - an array of all the row data objects in this group
          // group - the group component for the group
          // console.log('groupHeader', value);
          return `${
            this.groupBy
          }: ${value} <span class="ion-margin-start">(${count} ${
            count === 1 ? 'record' : 'records'
          })</span>`;
        },
      };
    }
  }
}
