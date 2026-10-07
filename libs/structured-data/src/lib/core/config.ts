import type {
  BlocksSection, EntriesSection, FieldsSection, ParseResult, ResolveViewOptions, ResolutionResult,
  StructuredLimits, StructuredNode, TableSection, ValidationResult,
  ViewColumn, ViewEntryLayout, ViewField, ViewRule, ViewSection, ViewTitle,
} from './structured-data.types';
import { diagnostic, effectiveLimits, exceedsSourceLimit } from './limits';
import { parseJsonText } from './json';
import { parseRelativePointer } from './selectors';
import { parseYamlText } from './yaml';

type RecordValue = Record<string, unknown>;

function record(value: unknown): RecordValue | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return null;
  for (const property of Object.values(Object.getOwnPropertyDescriptors(value))) {
    if (!('value' in property)) return null;
  }
  return value as RecordValue;
}

function exactKeys(value: RecordValue, allowed: readonly string[]): boolean {
  return Object.keys(value).every(key => allowed.includes(key));
}

function text(value: unknown, max = 256): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= max;
}

function pointer(value: unknown, limits: Required<StructuredLimits>, allowSpecial = false): value is string {
  if (typeof value !== 'string') return false;
  if (allowSpecial && (value === '$key' || /^\$label\/(0|[1-9]\d{0,2})$/.test(value))) return true;
  return parseRelativePointer(value, limits.maxSelectorLength, limits.maxSelectorDepth) !== null;
}

function safeGlob(value: unknown, limits: Required<StructuredLimits>): value is string {
  return text(value, limits.maxSelectorLength) && !value.startsWith('/') && !value.includes('..')
    && /^[A-Za-z0-9_./*?@-]+$/.test(value);
}

function parseTitle(value: unknown, limits: Required<StructuredLimits>): ViewTitle | null {
  const source = record(value);
  if (!source || !exactKeys(source, ['label', 'path']) || !text(source['label']) || !pointer(source['path'], limits)) return null;
  return { label: source['label'], path: source['path'] };
}

function parseFields(value: unknown, limits: Required<StructuredLimits>): readonly ViewField[] | null {
  if (!Array.isArray(value) || value.length > 64) return null;
  const result: ViewField[] = [];
  for (const item of value) {
    const field = record(item);
    if (!field || !exactKeys(field, ['label', 'path', 'scalarListLayout']) || !text(field['label'])
      || !pointer(field['path'], limits) || (field['scalarListLayout'] !== undefined
        && field['scalarListLayout'] !== 'inline' && field['scalarListLayout'] !== 'list')) return null;
    result.push({ label: field['label'], path: field['path'],
      ...(field['scalarListLayout'] ? { scalarListLayout: field['scalarListLayout'] as 'inline' | 'list' } : {}) });
  }
  return result;
}

function parseColumns(value: unknown, limits: Required<StructuredLimits>): readonly ViewColumn[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 64) return null;
  const result: ViewColumn[] = [];
  for (const item of value) {
    const column = record(item);
    if (!column || !exactKeys(column, ['label', 'path']) || !text(column['label'])
      || !pointer(column['path'], limits, true)) return null;
    result.push({ label: column['label'], path: column['path'] });
  }
  return result;
}

function parseSections(value: unknown, limits: Required<StructuredLimits>, counter: { count: number },
  depth = 0): readonly ViewSection[] | null {
  if (!Array.isArray(value) || depth > limits.maxDepth || value.length > limits.maxSections) return null;
  const result: ViewSection[] = [];
  const ids = new Set<string>();
  for (const item of value) {
    if (++counter.count > limits.maxSections) return null;
    const section = record(item);
    if (!section || !text(section['id'], 100) || !/^[A-Za-z0-9_-]+$/.test(section['id'])
      || ids.has(section['id']) || !text(section['title']) || !pointer(section['path'], limits)) return null;
    ids.add(section['id']);
    const base = { id: section['id'], title: section['title'], path: section['path'] };
    if (section['kind'] === 'fields') {
      if (!exactKeys(section, ['id', 'title', 'kind', 'path', 'fields'])) return null;
      const fields = parseFields(section['fields'], limits);
      if (!fields) return null;
      result.push({ ...base, kind: 'fields', fields } as FieldsSection);
      continue;
    }
    if (section['kind'] === 'value') {
      if (!exactKeys(section, ['id', 'title', 'kind', 'path', 'scalarListLayout'])
        || (section['scalarListLayout'] !== undefined && section['scalarListLayout'] !== 'inline'
          && section['scalarListLayout'] !== 'list')) return null;
      result.push({ ...base, kind: 'value',
        ...(section['scalarListLayout'] ? { scalarListLayout: section['scalarListLayout'] } : {}) } as ViewSection);
      continue;
    }
    if (section['kind'] === 'table') {
      if (!exactKeys(section, ['id', 'title', 'kind', 'path', 'rows', 'blockType', 'columns'])
        || !['dictionary', 'list', 'blocks'].includes(String(section['rows']))
        || (section['blockType'] !== undefined && !text(section['blockType'], 100))) return null;
      const columns = parseColumns(section['columns'], limits);
      if (!columns) return null;
      result.push({ ...base, kind: 'table', rows: section['rows'], columns,
        ...(section['blockType'] ? { blockType: section['blockType'] } : {}) } as TableSection);
      continue;
    }
    if (section['kind'] === 'entries' || section['kind'] === 'blocks') {
      const blocks = section['kind'] === 'blocks';
      if (!exactKeys(section, blocks
        ? ['id', 'title', 'kind', 'path', 'blockType', 'presentation', 'allowLayoutSwitch', 'initiallyExpanded', 'entry']
        : ['id', 'title', 'kind', 'path', 'presentation', 'allowLayoutSwitch', 'initiallyExpanded', 'entry'])) return null;
      if (blocks && !text(section['blockType'], 100)) return null;
      if (section['presentation'] !== undefined && section['presentation'] !== 'list' && section['presentation'] !== 'accordion') return null;
      if (section['allowLayoutSwitch'] !== undefined && typeof section['allowLayoutSwitch'] !== 'boolean') return null;
      if (section['initiallyExpanded'] !== undefined && !['first', 'all', 'none'].includes(String(section['initiallyExpanded']))) return null;
      let entry: ViewEntryLayout | undefined;
      if (section['entry'] !== undefined) {
        const rawEntry = record(section['entry']);
        if (!rawEntry || !exactKeys(rawEntry, ['heading', 'sections']) || !text(rawEntry['heading'])
          || !pointer(rawEntry['heading'], limits, true)) return null;
        const nested = rawEntry['sections'] === undefined ? undefined
          : parseSections(rawEntry['sections'], limits, counter, depth + 1);
        if (rawEntry['sections'] !== undefined && !nested) return null;
        entry = { heading: rawEntry['heading'], ...(nested ? { sections: nested } : {}) };
      }
      const common = { ...base,
        ...(section['presentation'] ? { presentation: section['presentation'] } : {}),
        ...(section['allowLayoutSwitch'] !== undefined ? { allowLayoutSwitch: section['allowLayoutSwitch'] } : {}),
        ...(section['initiallyExpanded'] ? { initiallyExpanded: section['initiallyExpanded'] } : {}),
        ...(entry ? { entry } : {}) };
      result.push(blocks ? { ...common, kind: 'blocks', blockType: section['blockType'] } as BlocksSection
        : { ...common, kind: 'entries' } as EntriesSection);
      continue;
    }
    return null;
  }
  return result;
}

export function validateViewConfig(input: unknown, limits?: StructuredLimits): ValidationResult {
  let bounded: Required<StructuredLimits>;
  try { bounded = effectiveLimits(limits); }
  catch (error) { return { ok: false, diagnostics: [diagnostic('limit_exceeded', String(error))] }; }
  const source = record(input);
  if (!source || !exactKeys(source, ['version', 'rules']) || source['version'] !== 1
    || !Array.isArray(source['rules']) || source['rules'].length > bounded.maxRules) {
    return { ok: false, diagnostics: [diagnostic('invalid_config', 'Expected version 1 and a bounded rules array')] };
  }
  const rules: ViewRule[] = [];
  const ids = new Set<string>();
  const counter = { count: 0 };
  for (const item of source['rules']) {
    const rule = record(item);
    if (!rule || !exactKeys(rule, ['id', 'match', 'parser', 'title', 'sections']) || !text(rule['id'], 100)
      || !/^[A-Za-z0-9_-]+$/.test(rule['id']) || ids.has(rule['id'])
      || !safeGlob(rule['match'], bounded) || !['json', 'yaml', 'hcl'].includes(String(rule['parser']))) {
      return { ok: false, diagnostics: [diagnostic('invalid_config', 'Invalid or duplicate view rule')] };
    }
    ids.add(rule['id']);
    const title = rule['title'] === undefined ? undefined : parseTitle(rule['title'], bounded);
    if (rule['title'] !== undefined && !title) return { ok: false, diagnostics: [diagnostic('invalid_config', `Invalid title in ${rule['id']}`)] };
    const sections = rule['sections'] === undefined ? undefined : parseSections(rule['sections'], bounded, counter);
    if (rule['sections'] !== undefined && !sections) return { ok: false, diagnostics: [diagnostic('invalid_config', `Invalid sections in ${rule['id']}`)] };
    rules.push({ id: rule['id'], match: rule['match'], parser: rule['parser'] as ViewRule['parser'],
      ...(title ? { title } : {}), ...(sections ? { sections } : {}) });
  }
  return { ok: true, config: { version: 1, rules } };
}

function plain(node: StructuredNode): unknown {
  switch (node.kind) {
    case 'null': return null;
    case 'boolean': case 'string': return node.value;
    case 'number': return node.value ?? Number(node.sourceText);
    case 'array': return node.items.map(plain);
    case 'object': return Object.fromEntries(node.entries.map(entry => [entry.key, plain(entry.value)]));
    default: throw new Error('Configuration cannot contain HCL or expressions');
  }
}

export function parseViewConfigText(textSource: string, format: 'json' | 'yaml', sourcePath?: string,
  limits?: StructuredLimits): ValidationResult {
  let bounded: Required<StructuredLimits>;
  try { bounded = effectiveLimits(limits); }
  catch (error) { return { ok: false, diagnostics: [diagnostic('limit_exceeded', String(error))] }; }
  if (exceedsSourceLimit(textSource, bounded.maxConfigBytes)) {
    return { ok: false, diagnostics: [diagnostic('limit_exceeded', `View config exceeds ${bounded.maxConfigBytes} bytes`, undefined, sourcePath)] };
  }
  const parsed: ParseResult = format === 'json' ? parseJsonText(textSource, { ...bounded, maxSourceBytes: bounded.maxConfigBytes })
    : parseYamlText(textSource, { ...bounded, maxSourceBytes: bounded.maxConfigBytes });
  if (!parsed.ok) return { ok: false, diagnostics: parsed.diagnostics.map(item => ({ ...item, source: sourcePath })) };
  try { return validateViewConfig(plain(parsed.document.root), bounded); }
  catch (error) { return { ok: false, diagnostics: [diagnostic('invalid_config', String(error), undefined, sourcePath)] }; }
}

function matchGlob(glob: string, path: string): boolean {
  if (path.length > 4_096) return false;
  const width = path.length + 1;
  const table = new Uint8Array((glob.length + 1) * width);
  const at = (pattern: number, position: number): number => table[pattern * width + position];
  table[glob.length * width + path.length] = 1;
  for (let pattern = glob.length - 1; pattern >= 0; pattern--) {
    let consumedDirectory = false;
    for (let position = path.length; position >= 0; position--) {
      const character = glob[pattern];
      const remaining = position < path.length;
      let matches = false;
      if (character === '*' && glob[pattern + 1] === '*' && glob[pattern + 2] === '/') {
        consumedDirectory = remaining && ((path[position] === '/' && !!at(pattern + 3, position + 1)) || consumedDirectory);
        matches = !!at(pattern + 3, position) || consumedDirectory;
      } else if (character === '*' && glob[pattern + 1] === '*') {
        matches = !!at(pattern + 2, position) || (remaining && !!at(pattern, position + 1));
      } else if (character === '*') {
        matches = !!at(pattern + 1, position) || (remaining && path[position] !== '/' && !!at(pattern, position + 1));
      } else if (character === '?') {
        matches = remaining && path[position] !== '/' && !!at(pattern + 1, position + 1);
      } else {
        matches = remaining && character === path[position] && !!at(pattern + 1, position + 1);
      }
      table[pattern * width + position] = matches ? 1 : 0;
    }
  }
  return !!at(0, 0);
}

export function resolveViewRule(options: ResolveViewOptions): ResolutionResult {
  const pathSegments = options.repositoryPath.split('/');
  if (options.repositoryPath.length > 4_096 || options.repositoryPath.startsWith('/')
    || options.repositoryPath.includes('\\')
    || [...options.repositoryPath].some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)
    || pathSegments.some(segment => segment === '.' || segment === '..' || segment === '')) {
    return { status: 'error', diagnostics: [diagnostic('invalid_config', 'Invalid repository path for view resolution')] };
  }
  const limits = options.limits;
  const merged: ViewRule[] = [];
  const append = (rule: ViewRule): void => {
    const previous = merged.findIndex(candidate => candidate.id === rule.id);
    if (previous >= 0) merged.splice(previous, 1);
    merged.push(rule);
  };
  if (options.builtInRules?.length) {
    const checked = validateViewConfig({ version: 1, rules: options.builtInRules }, limits);
    if (!checked.ok) return { status: 'error', diagnostics: checked.diagnostics };
    checked.config.rules.forEach(append);
  }
  const levels = new Set<string>();
  for (const document of options.orderedDocuments) {
    const level = document.sourcePath.replace(/\/[^/]+$/, '');
    if (levels.has(level)) return { status: 'error', diagnostics: [diagnostic('invalid_config', `Multiple view config files at ${level}`)] };
    levels.add(level);
    const checked = validateViewConfig(document.config, limits);
    if (!checked.ok) return { status: 'error', diagnostics: checked.diagnostics.map(item => ({ ...item, source: document.sourcePath })) };
    checked.config.rules.forEach(append);
  }
  const path = options.repositoryPath.replace(/^\/+/, '');
  for (let index = merged.length - 1; index >= 0; index--) {
    if (matchGlob(merged[index].match, path)) return { status: 'matched', parser: merged[index].parser, view: merged[index] };
  }
  const suffix = path.toLowerCase().split('.').pop();
  if (suffix === 'json' || suffix === 'yaml' || suffix === 'hcl') return { status: 'generic', parser: suffix };
  if (suffix === 'yml') return { status: 'generic', parser: 'yaml' };
  return { status: 'unsupported', diagnostics: [diagnostic('unsupported_format', 'No JSON, YAML, or HCL view applies')] };
}
