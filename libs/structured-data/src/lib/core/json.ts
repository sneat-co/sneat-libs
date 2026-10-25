import { parseTree, type Node, type ParseError } from 'jsonc-parser';
import type { ParseResult, StructuredObjectEntry, StructuredValue, StructuredLimits } from './structured-data.types';
import { diagnostic, effectiveLimits, exceedsSourceLimit, SourceLocator } from './limits';

export function parseJsonText(sourceText: string, limits?: StructuredLimits): ParseResult {
  let bounded: Required<StructuredLimits>;
  try { bounded = effectiveLimits(limits); }
  catch (error) { return { ok: false, diagnostics: [diagnostic('limit_exceeded', String(error))] }; }
  if (exceedsSourceLimit(sourceText, bounded.maxSourceBytes)) {
    return { ok: false, diagnostics: [diagnostic('limit_exceeded', `JSON source exceeds ${bounded.maxSourceBytes} bytes`)] };
  }
  const errors: ParseError[] = [];
  let root: Node | undefined;
  try { root = parseTree(sourceText, errors, { disallowComments: true, allowTrailingComma: false }); }
  catch { return { ok: false, diagnostics: [diagnostic('limit_exceeded', 'JSON parser could not process this source safely')] }; }
  const locator = new SourceLocator(sourceText);
  if (!root || errors.length) {
    return { ok: false, diagnostics: errors.length
      ? errors.map(error => diagnostic('invalid_syntax', `Invalid JSON (${error.error})`, locator.range(error.offset, error.offset + error.length)))
      : [diagnostic('invalid_syntax', 'JSON document is empty')] };
  }
  let count = 0;
  try {
    const convert = (node: Node, depth: number): StructuredValue => {
      if (++count > bounded.maxNodes || depth > bounded.maxDepth) throw new Error('JSON node or depth limit exceeded');
      const range = locator.range(node.offset, node.offset + node.length);
      switch (node.type) {
        case 'null': return { kind: 'null', range };
        case 'boolean': return { kind: 'boolean', value: node.value as boolean, range };
        case 'string': return { kind: 'string', value: node.value as string, range };
        case 'number': {
          const sourceNumber = sourceText.slice(node.offset, node.offset + node.length);
          const parsedNumber = Number(sourceNumber);
          const losslessInteger = !Number.isInteger(parsedNumber) || Number.isSafeInteger(parsedNumber);
          return { kind: 'number', sourceText: sourceNumber,
            ...(Number.isFinite(parsedNumber) && losslessInteger ? { value: parsedNumber } : {}), range };
        }
        case 'array': return { kind: 'array', items: (node.children ?? []).map(child => convert(child, depth + 1)), range };
        case 'object': {
          const entries: StructuredObjectEntry[] = [];
          const seen = new Set<string>();
          for (const property of node.children ?? []) {
            const keyNode = property.children?.[0];
            const valueNode = property.children?.[1];
            if (!keyNode || !valueNode || typeof keyNode.value !== 'string') throw new Error('Invalid JSON property');
            const key = keyNode.value;
            if (seen.has(key)) throw new Error(`Duplicate JSON key: ${key}`);
            seen.add(key);
            entries.push({ key, value: convert(valueNode, depth + 1), range: locator.range(property.offset, property.offset + property.length) });
          }
          return { kind: 'object', entries, range };
        }
        default: throw new Error(`Unsupported JSON node: ${node.type}`);
      }
    };
    return { ok: true, document: { format: 'json', root: convert(root, 0), sourceText }, diagnostics: [] };
  } catch (error) {
    const message = String(error);
    return { ok: false, diagnostics: [diagnostic(message.includes('limit') ? 'limit_exceeded' : 'invalid_syntax', message)] };
  }
}
