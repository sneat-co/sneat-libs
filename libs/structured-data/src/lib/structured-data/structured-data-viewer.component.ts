import { CommonModule } from '@angular/common';
import { AfterViewChecked, Component, ElementRef, EventEmitter, inject, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { AccordionModule } from 'primeng/accordion';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import type {
  CollectionPresentation, SourceRange, StructuredDiagnostic, StructuredDocument, StructuredLimits,
  StructuredNode, StructuredSectionSelection, ViewEntryLayout, ViewRowContext, ViewRule, ViewSection,
} from '../core/structured-data.types';
import { parseRelativePointer, selectRelative, selectViewPath } from '../core/selectors';
import { StructuredNodeComponent } from './structured-node';

export interface StructuredDisplayRow extends ViewRowContext {
  readonly id: string;
  readonly title: string;
}

@Component({
  selector: 'sneat-structured-data-viewer',
  standalone: true,
  imports: [CommonModule, AccordionModule, ButtonModule, TableModule, StructuredNodeComponent],
  templateUrl: './structured-data-viewer.html',
  styleUrl: './structured-data-viewer.css',
})
export class StructuredDataViewerComponent implements OnChanges, AfterViewChecked {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  @Input() document: StructuredDocument | null = null;
  @Input() view: ViewRule | null = null;
  @Input() activeSectionId: string | null = null;
  @Input() diagnostics: readonly StructuredDiagnostic[] = [];
  @Input() sourceText = '';
  @Input() showRawFallback = false;
  @Input() limits: StructuredLimits = {};
  @Output() sourcePositionSelected = new EventEmitter<SourceRange>();
  @Output() sectionSelected = new EventEmitter<StructuredSectionSelection>();

  private readonly expanded = new Map<string, string[]>();
  private readonly layouts = new Map<string, CollectionPresentation>();
  private lastNavigatedId: string | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['document'] || changes['view']) {
      this.expanded.clear(); this.layouts.clear(); this.lastNavigatedId = null;
    }
  }

  ngAfterViewChecked(): void {
    if (!this.activeSectionId || this.lastNavigatedId === this.activeSectionId || typeof document === 'undefined') return;
    const target = [...this.host.nativeElement.querySelectorAll<HTMLElement>('[id]')]
      .find(element => element.id === this.activeSectionId);
    if (!target) return;
    target.focus({ preventScroll: true });
    target.scrollIntoView?.({ block: 'nearest' });
    this.lastNavigatedId = this.activeSectionId;
  }

  get maxRows(): number { return Math.max(0, Math.min(2_000, this.limits.maxRows ?? 2_000)); }
  get maxDepth(): number { return Math.max(0, Math.min(64, this.limits.maxDepth ?? 64)); }
  get sections(): readonly ViewSection[] { return this.view?.sections ?? []; }
  get rootContext(): ViewRowContext | null { return this.document ? { node: this.document.root, pathId: '' } : null; }
  get rawFallbackText(): string { return this.sourceText || this.document?.sourceText || ''; }

  titleText(): string | null {
    if (!this.document || !this.view?.title) return null;
    const value = selectRelative(this.document.root, this.view.title.path);
    return value.found ? `${this.view.title.label} ${this.shortText(value.value)}` : this.view.title.label;
  }

  selected(context: ViewRowContext, path: string): StructuredNode | null {
    const result = selectViewPath(context, path);
    return result.found ? result.value : null;
  }

  shortText(node: StructuredNode): string {
    switch (node.kind) {
      case 'null': return 'null';
      case 'boolean': return String(node.value);
      case 'number': return node.sourceText;
      case 'string': return node.value;
      case 'expression': return node.sourceText;
      case 'array': return `[${node.items.length} values]`;
      case 'object': return `{${node.entries.length} fields}`;
      case 'hcl-body': return `${node.members.length} members`;
      case 'hcl-attribute': return node.name;
      case 'hcl-block': return `${node.blockType} ${node.labels.join(' ')}`;
    }
  }

  selectSection(sectionId: string): void { this.sectionSelected.emit({ sectionId }); }
  sectionId(section: ViewSection, context: ViewRowContext): string {
    return context.pathId ? `${context.pathId}/${section.id}` : section.id;
  }
  rowActivated(row: StructuredDisplayRow): void { this.selectSection(row.pathId || row.id); }

  private rowPath(section: ViewSection, parent: ViewRowContext, id: string): string {
    return `${this.sectionId(section, parent)}/${id}`;
  }

  rowsFor(section: ViewSection, context: ViewRowContext): StructuredDisplayRow[] {
    const selected = this.selected(context, section.path);
    if (!selected || this.maxRows === 0) return [];
    const rows: StructuredDisplayRow[] = [];
    if (section.kind === 'blocks' || (section.kind === 'table' && section.rows === 'blocks')) {
      const body = selected.kind === 'hcl-block' ? selected.body : selected;
      if (body.kind !== 'hcl-body') return [];
      for (const member of body.members) {
        if (member.kind !== 'hcl-block' || (section.blockType && member.blockType !== section.blockType)) continue;
        const rowContext = { node: member, labels: member.labels };
        const id = `${member.blockType}-${member.range.startOffset}-${encodeURIComponent(member.labels.join('|'))}`;
        rows.push({ ...rowContext, id, pathId: this.rowPath(section, context, id),
          title: this.entryHeading(section.kind === 'blocks' ? section.entry : undefined,
            rowContext, `${member.blockType} ${member.labels.join(' ')}`) });
        if (rows.length >= this.maxRows) break;
      }
    } else if (selected.kind === 'object' && (section.kind === 'entries' || (section.kind === 'table' && section.rows === 'dictionary'))) {
      for (const entry of selected.entries) {
        const rowContext = { node: entry.value, key: entry.key };
        const id = encodeURIComponent(entry.key);
        rows.push({ ...rowContext, id, pathId: this.rowPath(section, context, id),
          title: this.entryHeading(section.kind === 'entries' ? section.entry : undefined, rowContext, entry.key) });
        if (rows.length >= this.maxRows) break;
      }
    } else if (selected.kind === 'array' && (section.kind === 'entries' || (section.kind === 'table' && section.rows === 'list'))) {
      selected.items.slice(0, this.maxRows).forEach((item, index) => {
        const rowContext = { node: item };
        const id = String(index);
        rows.push({ ...rowContext, id, pathId: this.rowPath(section, context, id),
          title: this.entryHeading(section.kind === 'entries' ? section.entry : undefined, rowContext, String(index + 1)) });
      });
    }
    return rows;
  }

  totalRows(section: ViewSection, context: ViewRowContext): number {
    const selected = this.selected(context, section.path);
    if (!selected) return 0;
    if (selected.kind === 'object') return selected.entries.length;
    if (selected.kind === 'array') return selected.items.length;
    const body = selected.kind === 'hcl-block' ? selected.body : selected;
    return body.kind === 'hcl-body' ? body.members.filter(member => member.kind === 'hcl-block'
      && (!('blockType' in section) || !section.blockType || member.blockType === section.blockType)).length : 0;
  }

  rowLimitNotice(section: ViewSection, context: ViewRowContext): string | null {
    const remaining = this.totalRows(section, context) - this.maxRows;
    return remaining > 0 ? `${remaining} more rows; inspect Raw source` : null;
  }

  entryHeading(entry: ViewEntryLayout | undefined, context: ViewRowContext, fallback: string): string {
    if (!entry) return fallback;
    const selected = selectViewPath(context, entry.heading);
    return selected.found ? this.shortText(selected.value) : fallback;
  }

  entrySections(section: ViewSection): readonly ViewSection[] {
    return section.kind === 'entries' || section.kind === 'blocks' ? section.entry?.sections ?? [] : [];
  }

  layoutFor(section: ViewSection, context: ViewRowContext): CollectionPresentation {
    return this.layouts.get(this.sectionId(section, context)) ?? ('presentation' in section ? section.presentation || 'list' : 'list');
  }
  setLayout(section: ViewSection, context: ViewRowContext, layout: CollectionPresentation): void {
    this.layouts.set(this.sectionId(section, context), layout);
  }

  expandedValues(section: ViewSection, context: ViewRowContext, rows: readonly StructuredDisplayRow[]): string[] {
    const pathId = this.sectionId(section, context);
    let current = this.expanded.get(pathId);
    if (!current) {
      const initial = 'initiallyExpanded' in section ? section.initiallyExpanded : undefined;
      current = initial === 'all' ? rows.map(row => row.id) : initial === 'first' && rows.length ? [rows[0].id] : [];
      this.expanded.set(pathId, current);
    }
    if (this.activeSectionId?.startsWith(`${pathId}/`)) {
      const requested = this.activeSectionId.slice(pathId.length + 1).split('/')[0];
      if (rows.some(row => row.id === requested) && !current.includes(requested)) {
        current = [...current, requested];
        this.expanded.set(pathId, current);
      }
    }
    return current;
  }

  setExpandedValues(section: ViewSection, context: ViewRowContext,
    values: string | number | readonly (string | number)[] | null | undefined): void {
    this.expanded.set(this.sectionId(section, context), values == null ? [] : Array.isArray(values) ? values.map(String) : [String(values)]);
  }
  expandAll(section: ViewSection, context: ViewRowContext, rows: readonly StructuredDisplayRow[]): void {
    this.expanded.set(this.sectionId(section, context), rows.map(row => row.id));
  }
  collapseAll(section: ViewSection, context: ViewRowContext): void { this.expanded.set(this.sectionId(section, context), []); }

  limitedFields(fields: readonly { label: string; node: StructuredNode }[]): readonly { label: string; node: StructuredNode }[] {
    return fields.slice(0, this.maxRows);
  }
  omittedFields(fields: readonly { label: string; node: StructuredNode }[]): number {
    return Math.max(0, fields.length - this.maxRows);
  }

  otherFields(node: StructuredNode, sections: readonly ViewSection[]): readonly { label: string; node: StructuredNode }[] {
    const current = node.kind === 'hcl-block' ? node.body : node;
    const paths = sections.flatMap(section => section.kind === 'fields' && section.path === ''
      ? section.fields.map(field => field.path) : [section.path]);
    if (current.kind === 'object') {
      const consumed = new Set(paths.flatMap(path => {
        const segments = parseRelativePointer(path);
        return segments?.length === 1 ? [segments[0]] : [];
      }));
      return current.entries.filter(entry => !consumed.has(entry.key)).map(entry => ({ label: entry.key, node: entry.value }));
    }
    if (current.kind === 'hcl-body') {
      const attributes = new Set(paths.flatMap(path => {
        const segments = parseRelativePointer(path);
        return segments?.length === 2 && segments[0] === 'attributes' ? [segments[1]] : [];
      }));
      const blocks = new Set(sections.flatMap(section => {
        if (section.kind === 'blocks' || (section.kind === 'table' && section.rows === 'blocks')) {
          return section.blockType ? [section.blockType] : [];
        }
        return [];
      }));
      return current.members.filter(member => member.kind === 'hcl-attribute' ? !attributes.has(member.name) : !blocks.has(member.blockType))
        .map(member => ({ label: member.kind === 'hcl-attribute' ? member.name : `${member.blockType} ${member.labels.join(' ')}`, node: member }));
    }
    return [];
  }

  fieldOther(node: StructuredNode, section: ViewSection): readonly { label: string; node: StructuredNode }[] {
    if (section.kind !== 'fields') return [];
    // A root fields section shares its value with the top-level disclosure.
    // Show root leftovers once there; nested row sections retain their own details.
    if (node === this.document?.root) return [];
    return this.otherFields(node, section.fields.map((field, index) => ({ kind: 'value',
      id: `${section.id}-${index}`, title: field.label, path: field.path })));
  }

  tableOtherFields(node: StructuredNode, section: ViewSection): readonly { label: string; node: StructuredNode }[] {
    if (section.kind !== 'table') return [];
    return this.otherFields(node, section.columns.map((column, index) => ({ kind: 'value',
      id: `${section.id}-${index}`, title: column.label, path: column.path })));
  }

  tableFallbackNode(node: StructuredNode): boolean {
    return node.kind !== 'object' && node.kind !== 'hcl-body' && node.kind !== 'hcl-block';
  }
}
