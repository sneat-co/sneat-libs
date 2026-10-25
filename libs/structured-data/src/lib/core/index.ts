export type * from './structured-data.types';
export { DEFAULT_LIMITS } from './limits';
export { parseJsonText } from './json';
export { parseYamlText } from './yaml';
export { parseHclText } from './hcl';
export { parseRelativePointer, selectRelative, selectViewPath } from './selectors';
export { validateViewConfig, parseViewConfigText, resolveViewRule } from './config';

import type { ParseResult, StructuredFormat, StructuredLimits } from './structured-data.types';
import { parseJsonText } from './json';
import { parseYamlText } from './yaml';
import { parseHclText } from './hcl';

export function parseStructuredText(sourceText: string, format: StructuredFormat,
  limits?: StructuredLimits): Promise<ParseResult> {
  if (format === 'json') return Promise.resolve(parseJsonText(sourceText, limits));
  if (format === 'yaml') return Promise.resolve(parseYamlText(sourceText, limits));
  return parseHclText(sourceText, limits);
}
