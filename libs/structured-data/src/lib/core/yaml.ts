import { isAlias, isMap, isScalar, isSeq, parseDocument, type Node } from 'yaml';
import type { ParseResult, StructuredLimits, StructuredObjectEntry, StructuredValue, SourceRange } from './structured-data.types';
import { diagnostic, effectiveLimits, exceedsSourceLimit, SourceLocator } from './limits';

export function parseYamlText(sourceText: string, limits?: StructuredLimits): ParseResult {
  let bounded: Required<StructuredLimits>;
  try { bounded = effectiveLimits(limits); }
  catch (error) { return { ok: false, diagnostics: [diagnostic('limit_exceeded', String(error))] }; }
  if (exceedsSourceLimit(sourceText, bounded.maxSourceBytes)) {
    return { ok: false, diagnostics: [diagnostic('limit_exceeded', `YAML source exceeds ${bounded.maxSourceBytes} bytes`)] };
  }
  const locator = new SourceLocator(sourceText);
  let yaml;
  try { yaml = parseDocument(sourceText, { uniqueKeys: true, strict: true }); }
  catch { return { ok: false, diagnostics: [diagnostic('limit_exceeded', 'YAML parser could not process this source safely')] }; }
  if (yaml.errors.length) {
    return { ok: false, diagnostics: yaml.errors.map(error => diagnostic(
      'invalid_syntax', error.message,
      error.pos ? locator.range(error.pos[0], error.pos[1]) : undefined,
    )) };
  }
  let count = 0;
  const rangeOf = (node: Node | null): SourceRange | undefined => node?.range
    ? locator.range(node.range[0], node.range[1]) : undefined;
  try {
    const convert = (node: Node | null, depth: number): StructuredValue => {
      if (++count > bounded.maxNodes || depth > bounded.maxDepth) throw new Error('YAML node or depth limit exceeded');
      if (node === null) return { kind: 'null' };
      if (isAlias(node)) throw new Error('YAML aliases are unsupported in structured view');
      if (node.tag && !node.tag.startsWith('tag:yaml.org,2002:')) throw new Error(`Unsupported YAML tag: ${node.tag}`);
      const range = rangeOf(node);
      if (isScalar(node)) {
        const value = node.value;
        if (value === null || value === undefined) return { kind: 'null', range };
        if (typeof value === 'boolean') return { kind: 'boolean', value, range };
        if (typeof value === 'number') {
          const sourceNumber = range ? sourceText.slice(range.startOffset, range.endOffset) : String(value);
          return { kind: 'number', sourceText: sourceNumber,
            ...(Number.isFinite(value) && (!Number.isInteger(value) || Number.isSafeInteger(value)) ? { value } : {}), range };
        }
        if (typeof value === 'string') return { kind: 'string', value, range };
        throw new Error('Unsupported YAML scalar');
      }
      if (isSeq(node)) return { kind: 'array', items: node.items.map(item => convert(item as Node | null, depth + 1)), range };
      if (isMap(node)) {
        const entries: StructuredObjectEntry[] = [];
        const seen = new Set<string>();
        for (const pair of node.items) {
          if (!isScalar(pair.key) || typeof pair.key.value !== 'string') throw new Error('YAML mapping keys must be strings');
          const key = pair.key.value;
          if (seen.has(key)) throw new Error(`Duplicate YAML key: ${key}`);
          seen.add(key);
          entries.push({ key, value: convert(pair.value as Node | null, depth + 1), range: rangeOf(pair.key) });
        }
        return { kind: 'object', entries, range };
      }
      throw new Error('Unsupported YAML node');
    };
    return { ok: true, document: { format: 'yaml', root: convert(yaml.contents, 0), sourceText }, diagnostics: [] };
  } catch (error) {
    const message = String(error);
    const code = message.includes('limit') ? 'limit_exceeded' : 'unsupported_construct';
    return { ok: false, diagnostics: [diagnostic(code, message)] };
  }
}
