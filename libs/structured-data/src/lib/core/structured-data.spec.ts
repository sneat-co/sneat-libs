import { describe, expect, it } from 'vitest';
import { parseJsonText } from './json';
import { parseYamlText } from './yaml';
import { parseViewConfigText, resolveViewRule } from './config';
import { selectRelative, selectViewPath } from './selectors';
import type { HclBody, StructuredNode, ViewRule } from './structured-data.types';

describe('structured text', () => {
  it('keeps exact numeric text and UTF-16 ranges across emoji and CRLF', () => {
    const source = '{"emoji":"😀","large":9007199254740993}\r\n';
    const parsed = parseJsonText(source);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.document.sourceText).toBe(source);
    const large = selectRelative(parsed.document.root, '/large');
    expect(large.found).toBe(true);
    if (!large.found || large.value.kind !== 'number') return;
    expect(large.value.sourceText).toBe('9007199254740993');
    expect(large.value.value).toBeUndefined();
    expect(source.slice(large.value.range?.startOffset, large.value.range?.endOffset)).toBe(large.value.sourceText);
    expect(large.value.range?.start.column).toBe(source.indexOf('9007199254740993'));
    const emoji = selectRelative(parsed.document.root, '/emoji');
    expect(emoji.found).toBe(true);
    if (emoji.found && emoji.value.kind === 'string') expect(emoji.value.value).toBe('😀');
  });

  it('returns diagnostics rather than throwing on deeply nested JSON and YAML', () => {
    const json = '['.repeat(5_000) + '0' + ']'.repeat(5_000);
    expect(() => parseJsonText(json)).not.toThrow();
    expect(parseJsonText(json).ok).toBe(false);
    const yaml = Array.from({ length: 500 }, (_, depth) => `${' '.repeat(depth)}-`).join('\n') + '\n';
    expect(() => parseYamlText(yaml)).not.toThrow();
    expect(parseYamlText(yaml).ok).toBe(false);
  });

  it('preserves YAML order and rejects aliases without evaluating them', () => {
    const source = 'name: GeoNames\ncount: 9007199254740993\nready: false\nempty: null\n';
    const parsed = parseYamlText(source);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok || parsed.document.root.kind !== 'object') return;
    expect(parsed.document.root.entries.map(entry => entry.key)).toEqual(['name', 'count', 'ready', 'empty']);
    const count = selectRelative(parsed.document.root, '/count');
    expect(count.found && count.value.kind === 'number' && count.value.sourceText).toBe('9007199254740993');
    const alias = parseYamlText('base: &base 1\nother: *base\n');
    expect(alias.ok).toBe(false);
    if (!alias.ok) expect(alias.diagnostics[0].code).toBe('unsupported_construct');
  });

  it('distinguishes missing selectors from null, false, and zero', () => {
    const parsed = parseJsonText('{"nil":null,"false":false,"zero":0}');
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(selectRelative(parsed.document.root, '/missing')).toEqual({ found: false });
    expect(selectRelative(parsed.document.root, '/nil')).toMatchObject({ found: true, value: { kind: 'null' } });
    expect(selectRelative(parsed.document.root, '/false')).toMatchObject({ found: true, value: { kind: 'boolean', value: false } });
    expect(selectRelative(parsed.document.root, '/zero')).toMatchObject({ found: true, value: { kind: 'number', sourceText: '0' } });
  });
});

describe('view configuration and resolution', () => {
  const builtIn: ViewRule = { id: 'models', match: 'model/**/*.yaml', parser: 'yaml', sections: [] };

  it('parses JSON/YAML config with the same bounded whitelist and aliases forbidden', () => {
    const source = 'version: 1\nrules:\n  - id: geo\n    match: "model/*.hcl"\n    parser: hcl\n    sections:\n      - id: entities\n        title: Entities\n        kind: blocks\n        path: ""\n        blockType: entity\n';
    expect(parseViewConfigText(source, 'yaml', '.codegrapher/views.yaml').ok).toBe(true);
    expect(parseViewConfigText('{"version":1,"rules":[],"unknown":true}', 'json').ok).toBe(false);
    expect(parseViewConfigText('version: &v 1\nrules: []\ncopy: *v', 'yaml').ok).toBe(false);
  });

  it('resolves root-to-nearest overrides and generic .yml while accepting ordinary dots', () => {
    const rootRule: ViewRule = { id: 'models', match: 'model/**/*.yaml', parser: 'json' };
    const nearestRule: ViewRule = { id: 'models', match: 'model/**/*.yaml', parser: 'yaml' };
    const options = { repositoryPath: 'model/geo.yaml', builtInRules: [builtIn], orderedDocuments: [
      { sourcePath: '.codegrapher/views.yaml', config: { version: 1, rules: [rootRule] } },
      { sourcePath: 'model/.codegrapher/views.yaml', config: { version: 1, rules: [nearestRule] } },
    ] } as const;
    expect(resolveViewRule(options)).toMatchObject({ status: 'matched', parser: 'yaml' });
    expect(resolveViewRule({ repositoryPath: 'model/v1..yml', orderedDocuments: [] }))
      .toMatchObject({ status: 'generic', parser: 'yaml' });
    expect(resolveViewRule({ repositoryPath: 'model/../secret.yml', orderedDocuments: [] }).status).toBe('error');
  });

  it('matches adversarial glob text in bounded time', () => {
    const pattern = '*a'.repeat(50) + 'b';
    const rule: ViewRule = { id: 'adversarial', match: pattern, parser: 'json' };
    const started = performance.now();
    const result = resolveViewRule({ repositoryPath: 'a'.repeat(100) + '.json', builtInRules: [rule], orderedDocuments: [] });
    expect(result.status).toBe('generic');
    expect(performance.now() - started).toBeLessThan(250);
  });

  it('bounds combined rules and total glob work across ancestor documents', () => {
    const rules = (prefix: string, count: number): ViewRule[] => Array.from({ length: count }, (_, index) => ({
      id: `${prefix}${index}`, match: 'unmatched/*.json', parser: 'json',
    }));
    const overCombined = resolveViewRule({ repositoryPath: 'a/file.json', orderedDocuments: [
      { sourcePath: '.codegrapher/views.yaml', config: { version: 1, rules: rules('root', 60) } },
      { sourcePath: 'a/.codegrapher/views.yaml', config: { version: 1, rules: rules('nearest', 60) } },
    ] });
    expect(overCombined).toMatchObject({ status: 'error', diagnostics: [{ code: 'limit_exceeded' }] });

    const expensiveRules: ViewRule[] = rules('cost', 20).map(rule => ({ ...rule, match: '*a'.repeat(100) + 'b' }));
    const overWork = resolveViewRule({ repositoryPath: `${'a'.repeat(4_000)}.json`,
      builtInRules: expensiveRules, orderedDocuments: [] });
    expect(overWork).toMatchObject({ status: 'error', diagnostics: [{ code: 'limit_exceeded' }] });
  });
});

describe('HCL ordered selectors', () => {
  it('addresses repeated blocks and labels without collapsing members', () => {
    const emptyRange = { startOffset: 0, endOffset: 0, start: { line: 0, column: 0 }, end: { line: 0, column: 0 } };
    const block = (label: string) => ({ kind: 'hcl-block' as const, blockType: 'entity', labels: [label],
      body: { kind: 'hcl-body' as const, members: [{ kind: 'hcl-attribute' as const, name: 'name',
        value: { kind: 'string' as const, value: label }, range: emptyRange }], range: emptyRange }, range: emptyRange });
    const body: HclBody = { kind: 'hcl-body', members: [block('first'), block('second')], range: emptyRange };
    expect(selectRelative(body, '/blocks/1/attributes/name')).toMatchObject({ found: true, value: { value: 'second' } });
    const second = selectRelative(body, '/blocks/1');
    expect(second.found && selectViewPath({ node: second.value as StructuredNode, labels: ['second'] }, '$label/0'))
      .toMatchObject({ found: true, value: { value: 'second' } });
  });
});
