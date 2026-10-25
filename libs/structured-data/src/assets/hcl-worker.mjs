import { Parser, Language } from './web-tree-sitter.js';

let initialized;
function initialize() {
  initialized ??= (async () => {
    await Parser.init({ locateFile: () => new URL('./web-tree-sitter.wasm', import.meta.url).href });
    return Language.load(new URL('./tree-sitter-hcl.wasm', import.meta.url).href);
  })();
  return initialized;
}

function range(node) {
  return {
    startOffset: node.startIndex,
    endOffset: node.endIndex,
    start: { line: node.startPosition.row, column: node.startPosition.column },
    end: { line: node.endPosition.row, column: node.endPosition.column },
  };
}

self.onmessage = async ({ data }) => {
  const { id, sourceText, limits } = data;
  let parser;
  let tree;
  try {
    const language = await initialize();
    parser = new Parser();
    parser.setLanguage(language);
    const started = performance.now();
    tree = parser.parse(sourceText, undefined, {
      progressCallback: () => performance.now() - started > limits.timeoutMs,
    });
    if (!tree) throw new Error('HCL parsing exceeded its deadline');
    let visited = 0;
    const visit = (depth) => {
      if (++visited > limits.maxNodes || depth > limits.maxDepth) throw new Error('HCL node or depth limit exceeded');
    };
    const slice = (node) => sourceText.slice(node.startIndex, node.endIndex);
    const first = (node, type) => node.namedChildren.find(child => child.type === type);

    if (tree.rootNode.hasError) {
      const errors = [];
      const collect = (node, depth) => {
        visit(depth);
        if (node.type === 'ERROR' || node.isMissing) {
          errors.push({ code: 'invalid_syntax', message: node.isMissing ? `Missing ${node.type}` : 'Invalid HCL syntax',
            severity: 'error', range: range(node) });
        }
        for (const child of node.children) collect(child, depth + 1);
      };
      collect(tree.rootNode, 0);
      self.postMessage({ id, ok: false, diagnostics: errors.length ? errors
        : [{ code: 'invalid_syntax', message: 'Invalid HCL syntax', severity: 'error' }] });
      return;
    }

    const expression = (node, depth) => {
      visit(depth);
      const raw = slice(node);
      const inner = node.type === 'expression' ? node.namedChildren[0] : node;
      const literal = inner?.type === 'literal_value' ? inner.namedChildren[0] : inner;
      if (literal?.type === 'bool_lit') return { kind: 'boolean', value: raw === 'true', range: range(node) };
      if (literal?.type === 'null_lit') return { kind: 'null', range: range(node) };
      if (literal?.type === 'numeric_lit') {
        const numeric = Number(raw);
        return { kind: 'number', sourceText: raw,
          ...(Number.isFinite(numeric) && (!Number.isInteger(numeric) || Number.isSafeInteger(numeric)) ? { value: numeric } : {}),
          range: range(node) };
      }
      if (literal?.type === 'string_lit' && !raw.includes('${') && !raw.includes('%{')) {
        try { return { kind: 'string', value: JSON.parse(raw), range: range(node) }; }
        catch { /* Preserve unfamiliar HCL escapes as unevaluated source. */ }
      }
      const collection = inner?.type === 'collection_value' ? inner.namedChildren[0] : inner;
      if (collection?.type === 'tuple') {
        const items = collection.namedChildren.filter(child => child.type === 'expression')
          .map(child => expression(child, depth + 1));
        return { kind: 'array', items, range: range(node) };
      }
      return { kind: 'expression', sourceText: raw, range: range(node) };
    };

    const body = (node, depth) => {
      visit(depth);
      const members = [];
      const attributes = new Set();
      for (const child of node.namedChildren) {
        if (child.type === 'comment') continue;
        if (child.type === 'attribute') {
          const nameNode = first(child, 'identifier');
          const valueNode = first(child, 'expression');
          if (!nameNode || !valueNode) throw new Error('Unsupported HCL attribute');
          const name = slice(nameNode);
          if (attributes.has(name)) throw new Error(`Duplicate HCL attribute: ${name}`);
          attributes.add(name);
          members.push({ kind: 'hcl-attribute', name, value: expression(valueNode, depth + 1), range: range(child) });
        } else if (child.type === 'block') {
          visit(depth + 1);
          const header = child.namedChildren.filter(part => part.type === 'identifier' || part.type === 'string_lit');
          if (!header.length || header[0].type !== 'identifier') throw new Error('Unsupported HCL block header');
          const labels = header.slice(1).map(part => {
            if (part.type === 'identifier') return slice(part);
            const raw = slice(part);
            if (raw.includes('${') || raw.includes('%{')) throw new Error('Dynamic HCL block label is unsupported');
            try { return JSON.parse(raw); }
            catch { throw new Error('Unsupported HCL block label escape'); }
          });
          const innerBody = first(child, 'body');
          members.push({ kind: 'hcl-block', blockType: slice(header[0]), labels,
            body: innerBody ? body(innerBody, depth + 1) : { kind: 'hcl-body', members: [], range: range(child) },
            range: range(child) });
        } else {
          throw new Error(`Unsupported HCL body item: ${child.type}`);
        }
      }
      return { kind: 'hcl-body', members, range: range(node) };
    };

    const rootBody = first(tree.rootNode, 'body');
    const normalized = rootBody ? body(rootBody, 0)
      : { kind: 'hcl-body', members: [], range: range(tree.rootNode) };
    self.postMessage({ id, ok: true, root: { ...normalized, range: {
      startOffset: 0, endOffset: sourceText.length, start: { line: 0, column: 0 }, end: range(tree.rootNode).end,
    } } });
  } catch (error) {
    const message = String(error);
    self.postMessage({ id, ok: false, diagnostics: [{
      code: /deadline|limit/i.test(message) ? 'limit_exceeded' : 'unsupported_construct',
      message, severity: 'error',
    }] });
  } finally {
    tree?.delete();
    parser?.delete();
  }
};
