import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, forwardRef } from '@angular/core';
import type { HclAttribute, HclBlock, HclBody, SourceRange, StructuredArray, StructuredNode,
  StructuredObject, StructuredValue, ScalarListLayout } from '../core/structured-data.types';

/** Internal recursive, read-only value renderer. The host's source remains authoritative. */
@Component({
  selector: 'sneat-structured-node',
  standalone: true,
  imports: [CommonModule, forwardRef(() => StructuredNodeComponent)],
  template: `
    @if (depth > maxDepth) {
      <span class="sd-limit">Nested value limit reached</span>
    } @else {
      @switch (node.kind) {
        @case ('null') { <span class="sd-scalar sd-null">null</span> }
        @case ('boolean') { <span class="sd-scalar">{{ scalarText(node) }}</span> }
        @case ('number') { <span class="sd-scalar">{{ scalarText(node) }}</span> }
        @case ('string') { <span class="sd-scalar">{{ scalarText(node) }}</span> }
        @case ('expression') {
          <span class="sd-expression" aria-label="Unevaluated HCL expression">{{ scalarText(node) }}</span>
        }
        @case ('array') {
          @if (isInlineArray(node) && (node.items.length <= inlineLimit || expanded)) {
            <span class="sd-inline-array" aria-label="List of {{node.items.length}} values">{{inlineArrayText(node)}}</span>
            @if (node.items.length > maxRows) { <span class="sd-limit">{{node.items.length - maxRows}} more values; inspect Raw source</span> }
          } @else if (isInlineArray(node) && !expanded) {
            <button type="button" class="sd-link" (click)="expanded = true">Show {{node.items.length}} values</button>
          } @else {
            <ol class="sd-list">
              @for (item of limitedArray(node); track $index) {
                <li><sneat-structured-node [node]="item" [depth]="depth + 1" [maxDepth]="maxDepth"
                  [maxRows]="maxRows" (sourcePositionSelected)="sourcePositionSelected.emit($event)" /></li>
              }
            </ol>
            @if (node.items.length > maxRows) { <span class="sd-limit">{{node.items.length - maxRows}} more values; inspect Raw source</span> }
          }
        }
        @case ('object') {
          @if (node.entries.length === 0) { <span class="sd-empty">Empty object</span> }
          @else {
            <dl class="sd-fields">
              @for (entry of limitedEntries(node); track entry.key) {
                <dt>{{entry.key}}</dt>
                <dd><sneat-structured-node [node]="entry.value" [depth]="depth + 1" [maxDepth]="maxDepth"
                  [maxRows]="maxRows" (sourcePositionSelected)="sourcePositionSelected.emit($event)" /></dd>
              }
            </dl>
            @if (node.entries.length > maxRows) { <span class="sd-limit">{{node.entries.length - maxRows}} more fields; inspect Raw source</span> }
          }
        }
        @case ('hcl-body') {
          @if (node.members.length === 0) { <span class="sd-empty">Empty body</span> }
          @for (member of limitedMembers(node); track $index) {
            @if (member.kind === 'hcl-attribute') {
              <div class="sd-hcl-member"><strong>{{member.name}}</strong>:
                <sneat-structured-node [node]="member.value" [depth]="depth + 1" [maxDepth]="maxDepth"
                  [maxRows]="maxRows" (sourcePositionSelected)="sourcePositionSelected.emit($event)" />
                <button type="button" class="sd-source" (click)="sourcePositionSelected.emit(member.range)"
                  [attr.aria-label]="'Open source for ' + member.name">Source</button>
              </div>
            } @else {
              <details class="sd-hcl-block">
                <summary>{{member.blockType}} @for (label of member.labels; track $index) { <span>{{label}} </span> }</summary>
                <sneat-structured-node [node]="member.body" [depth]="depth + 1" [maxDepth]="maxDepth"
                  [maxRows]="maxRows" (sourcePositionSelected)="sourcePositionSelected.emit($event)" />
                <button type="button" class="sd-source" (click)="sourcePositionSelected.emit(member.range)"
                  [attr.aria-label]="'Open source for ' + member.blockType">Source</button>
              </details>
            }
          }
          @if (node.members.length > maxRows) { <span class="sd-limit">{{node.members.length - maxRows}} more members; inspect Raw source</span> }
        }
        @case ('hcl-block') {
          <strong>{{node.blockType}} @for (label of node.labels; track $index) { <span>{{label}} </span> }</strong>
          <sneat-structured-node [node]="node.body" [depth]="depth + 1" [maxDepth]="maxDepth"
            [maxRows]="maxRows" (sourcePositionSelected)="sourcePositionSelected.emit($event)" />
        }
        @case ('hcl-attribute') {
          <strong>{{node.name}}</strong>:
          <sneat-structured-node [node]="node.value" [depth]="depth + 1" [maxDepth]="maxDepth"
            [maxRows]="maxRows" (sourcePositionSelected)="sourcePositionSelected.emit($event)" />
        }
      }
      @if (node.range && node.kind !== 'hcl-body' && node.kind !== 'hcl-block' && node.kind !== 'hcl-attribute') {
        <button type="button" class="sd-source" (click)="sourcePositionSelected.emit(node.range)"
          aria-label="Open source for value">Source</button>
      }
    }
  `,
  styles: [`
    :host { display: inline-block; max-width: 100%; overflow-wrap: anywhere; }
    .sd-inline-array { display: inline-flex; flex-wrap: wrap; gap: .2rem; max-width: 100%; }
    .sd-inline-item { white-space: normal; }
    .sd-fields { display: grid; grid-template-columns: minmax(6rem, auto) minmax(0, 1fr); gap: .3rem .8rem; }
    .sd-fields dt { font-weight: 600; }
    .sd-fields dd { margin: 0; min-width: 0; }
    .sd-list { margin: .2rem 0; padding-inline-start: 1.5rem; }
    .sd-expression { font-family: monospace; }
    .sd-source, .sd-link { border: 0; background: transparent; color: inherit; text-decoration: underline; cursor: pointer; }
    .sd-source { font-size: .75em; margin-inline-start: .5rem; }
    .sd-empty, .sd-null, .sd-limit { opacity: .75; }
    .sd-hcl-member, .sd-hcl-block { display: block; margin-block: .25rem; }
  `],
})
export class StructuredNodeComponent {
  @Input({ required: true }) node!: StructuredNode;
  @Input() depth = 0;
  @Input() maxDepth = 64;
  @Input() maxRows = 2_000;
  @Input() scalarListLayout: ScalarListLayout = 'inline';
  @Output() sourcePositionSelected = new EventEmitter<SourceRange>();

  expanded = false;
  readonly inlineLimit = 12;

  scalarText(node: StructuredNode): string {
    switch (node.kind) {
      case 'null': return 'null';
      case 'boolean': return String(node.value);
      case 'number': return node.sourceText;
      case 'string': return JSON.stringify(node.value);
      case 'expression': return node.sourceText;
      default: return '';
    }
  }

  isInlineArray(node: StructuredNode): node is StructuredArray {
    return node.kind === 'array' && this.scalarListLayout === 'inline'
      && node.items.every(item => ['null', 'boolean', 'number', 'string', 'expression'].includes(item.kind));
  }

  inlineArrayText(node: StructuredArray): string {
    return `[${this.limitedArray(node).map(item => this.inlineScalarText(item)).join(', ')}]`;
  }

  private inlineScalarText(node: StructuredValue): string {
    if (node.kind !== 'string') return this.scalarText(node);
    const safe = /^[\p{L}_][\p{L}\p{N}_.-]*$/u.test(node.value)
      && !['true', 'false', 'null', 'nan', 'infinity'].includes(node.value.toLowerCase());
    return safe ? node.value : JSON.stringify(node.value);
  }

  limitedArray(node: StructuredArray): readonly StructuredValue[] { return node.items.slice(0, this.maxRows); }
  limitedEntries(node: StructuredObject): StructuredObject['entries'] { return node.entries.slice(0, this.maxRows); }
  limitedMembers(node: HclBody): readonly (HclAttribute | HclBlock)[] { return node.members.slice(0, this.maxRows); }
}
