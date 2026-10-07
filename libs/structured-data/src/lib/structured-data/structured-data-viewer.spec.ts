import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { parseJsonText } from '../core/json';
import type { HclBlock, StructuredDocument, ViewRule } from '../core/structured-data.types';
import { StructuredDataViewerComponent } from './structured-data-viewer.component';

function json(source: string): StructuredDocument {
  const parsed = parseJsonText(source);
  if (!parsed.ok) throw new Error(parsed.diagnostics[0]?.message);
  return parsed.document;
}

function fixture(document: StructuredDocument, view: ViewRule | null = null,
  activeSectionId: string | null = null, maxRows = 2_000) {
  const component = TestBed.createComponent(StructuredDataViewerComponent);
  component.componentInstance.document = document;
  component.componentInstance.view = view;
  component.componentInstance.activeSectionId = activeSectionId;
  component.componentInstance.limits = { maxRows };
  component.detectChanges();
  return component;
}

describe('StructuredDataViewerComponent', () => {
  it('shows safe short scalar lists without quotes and quotes ambiguous values', () => {
    const component = fixture(json('["iso","AD","AE","AF","", "true", "with space"]'));
    const text = (component.nativeElement as HTMLElement).querySelector('.sd-inline-array')?.textContent;
    expect(text).toBe('[iso, AD, AE, AF, "", "true", "with space"]');
    const single = fixture(json('["iso"]'));
    expect((single.nativeElement as HTMLElement).querySelector('.sd-inline-array')?.textContent).toBe('[iso]');
  });

  it('renders a bounded wrappable scalar list with an exact omitted count', () => {
    const document = json(`[${Array.from({ length: 100 }, (_, index) => index).join(',')}]`);
    const component = fixture(document, null, null, 20);
    const root = component.nativeElement as HTMLElement;
    const show = [...root.querySelectorAll('button')].find(button => button.textContent?.includes('Show 100 values'));
    expect(show).toBeTruthy();
    show?.click();
    component.detectChanges();
    expect(root.querySelector('.sd-inline-array')?.textContent?.split(',')).toHaveLength(20);
    expect(root.textContent).toContain('80 more values; inspect Raw source');
    expect(root.querySelector('.sd-inline-array')).toBeTruthy();
  });

  it('uses unique hierarchical IDs and opens the non-first nested section deep link', () => {
    const document = json('{"entities":{"alpha":{"key":"A","properties":{"one":1}},"beta":{"key":"B","properties":{"two":0}}}}');
    const view: ViewRule = { id: 'entities', match: '*.json', parser: 'json', sections: [{
      id: 'entities', title: 'Entities', kind: 'entries', path: '/entities', presentation: 'accordion',
      entry: { heading: '$key', sections: [
        { id: 'key', title: 'Key', kind: 'fields', path: '', fields: [{ label: 'Key', path: '/key' }] },
        { id: 'properties', title: 'Properties', kind: 'entries', path: '/properties', presentation: 'list',
          allowLayoutSwitch: true },
      ] },
    }] };
    const component = fixture(document, view, 'entities/beta/properties');
    component.detectChanges();
    const root = component.nativeElement as HTMLElement;
    const target = root.querySelector('[id="entities/beta/properties"]');
    expect(target).toBeTruthy();
    expect(root.querySelectorAll('[id="entities/alpha/properties"]')).toHaveLength(1);
    expect(root.querySelectorAll('[id="entities/beta/properties"]')).toHaveLength(1);
    expect(root.querySelector('[id="entities/beta"]')).toBeTruthy();
    expect(root.querySelector('[id="entities"]')).toBeTruthy();
    expect(globalThis.document.activeElement).toBe(target);
    expect(root.querySelector('button[aria-pressed="false"]')).toBeTruthy();

    const section = view.sections?.[0];
    expect(section).toBeTruthy();
    if (!section) return;
    const parent = component.componentInstance.rootContext;
    expect(parent).toBeTruthy();
    if (!parent) return;
    const rows = component.componentInstance.rowsFor(section, parent);
    expect(rows.map(row => row.pathId)).toEqual(['entities/alpha', 'entities/beta']);
    expect(component.componentInstance.expandedValues(section, parent, rows)).toContain('beta');
    const nested = view.sections?.[0]?.kind === 'entries' ? view.sections[0].entry?.sections?.[1] : undefined;
    expect(nested).toBeTruthy();
    if (!nested) return;
    component.componentInstance.setLayout(nested, rows[1], 'accordion');
    expect(component.componentInstance.layoutFor(nested, rows[1])).toBe('accordion');
    expect(component.componentInstance.layoutFor(nested, rows[0])).toBe('list');
    const alphaProperties = component.componentInstance.rowsFor(nested, rows[0]);
    const betaProperties = component.componentInstance.rowsFor(nested, rows[1]);
    component.componentInstance.setExpandedValues(nested, rows[1], ['two']);
    expect(component.componentInstance.expandedValues(nested, rows[1], betaProperties)).toEqual(['two']);
    expect(component.componentInstance.expandedValues(nested, rows[0], alphaProperties)).toEqual([]);
    component.destroy();

    const reloaded = fixture(document, view, 'entities/beta/properties');
    reloaded.detectChanges();
    expect((reloaded.nativeElement as HTMLElement).querySelector('[id="entities/beta/properties"]')).toBeTruthy();
  });

  it('caps every other-field display and preserves typed false, zero, null, and empty values', () => {
    const pairs = Array.from({ length: 100 }, (_, index) => `"extra${index}":${index}`);
    const document = json(`{"known":false,"zero":0,"nil":null,"empty":{},${pairs.join(',')}}`);
    const view: ViewRule = { id: 'fields', match: '*.json', parser: 'json', sections: [{
      id: 'known', title: 'Known', kind: 'fields', path: '', fields: [
        { label: 'Known', path: '/known' }, { label: 'Zero', path: '/zero' },
        { label: 'Nil', path: '/nil' }, { label: 'Empty', path: '/empty' },
      ],
    }] };
    const component = fixture(document, view, null, 10);
    const root = component.nativeElement as HTMLElement;
    expect(root.textContent).toContain('false');
    expect(root.textContent).toContain('null');
    expect(root.textContent).toContain('Empty object');
    expect(root.querySelectorAll('.sd-field').length).toBeLessThanOrEqual(20);
    expect(root.textContent).toContain('90 more fields; inspect Raw source');
  });

  it('keeps unconfigured table-row data discoverable with a bounded disclosure', () => {
    const document = json('{"rows":[{"id":"AD","name":"Andorra","extra":false,"more":null}]}');
    const view: ViewRule = { id: 'countries', match: '*.json', parser: 'json', sections: [{
      id: 'countries', title: 'Countries', kind: 'table', path: '/rows', rows: 'list',
      columns: [{ label: 'Code', path: '/id' }, { label: 'Name', path: '/name' }],
    }] };
    const component = fixture(document, view, null, 1);
    const root = component.nativeElement as HTMLElement;
    expect(root.querySelector('table')).toBeTruthy();
    expect(root.textContent).toContain('Other fields (2)');
    expect(root.textContent).toContain('1 more fields; inspect Raw source');
    expect(root.querySelector('[id="countries/0"]')).toBeTruthy();
  });

  it('keeps unknown HCL attributes in a table-row disclosure', () => {
    const range = { startOffset: 0, endOffset: 0, start: { line: 0, column: 0 }, end: { line: 0, column: 0 } };
    const row: HclBlock = { kind: 'hcl-block', blockType: 'property', labels: ['iso'], range,
      body: { kind: 'hcl-body', range, members: [
        { kind: 'hcl-attribute', name: 'type', value: { kind: 'string', value: 'string' }, range },
        { kind: 'hcl-attribute', name: 'extra', value: { kind: 'boolean', value: false }, range },
      ] } };
    const section: ViewRule['sections'] = [{ id: 'properties', title: 'Properties', kind: 'table',
      path: '', rows: 'blocks', blockType: 'property', columns: [{ label: 'Type', path: '/attributes/type' }] }];
    const component = fixture({ format: 'hcl', root: { kind: 'hcl-body', members: [row], range }, sourceText: '' });
    expect(component.componentInstance.tableOtherFields(row, section[0])).toMatchObject([
      { label: 'extra', node: { kind: 'hcl-attribute', name: 'extra' } },
    ]);
  });
});
