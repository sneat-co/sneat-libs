import type { HclBody, SelectionResult, StructuredNode, StructuredValue, ViewRowContext } from './structured-data.types';
import { DEFAULT_LIMITS } from './limits';

/** RFC 6901 without wildcards, evaluation, or prototype traversal. */
export function parseRelativePointer(pointer: string, maxLength = DEFAULT_LIMITS.maxSelectorLength,
  maxDepth = DEFAULT_LIMITS.maxSelectorDepth): readonly string[] | null {
  if (pointer === '') return [];
  if (!pointer.startsWith('/') || pointer.length > maxLength) return null;
  const parts = pointer.slice(1).split('/');
  if (parts.length > maxDepth) return null;
  const decoded: string[] = [];
  for (const part of parts) {
    if (/~(?![01])/.test(part)) return null;
    const value = part.replace(/~1/g, '/').replace(/~0/g, '~');
    if (value === '__proto__' || value === 'prototype' || value === 'constructor') return null;
    decoded.push(value);
  }
  return decoded;
}

const missing: SelectionResult = { found: false };

export function selectRelative(node: StructuredNode, pointer: string): SelectionResult {
  const parts = parseRelativePointer(pointer);
  if (parts === null) return missing;
  let current: StructuredNode = node;
  for (let index = 0; index < parts.length; index++) {
    const part = parts[index];
    if (current.kind === 'hcl-block') current = current.body;
    if (current.kind === 'hcl-attribute') current = current.value;
    if (current.kind === 'hcl-body') {
      const body: HclBody = current;
      if (part === 'attributes' && index + 1 < parts.length) {
        const name = parts[++index];
        const found = body.members.find(member => member.kind === 'hcl-attribute' && member.name === name);
        if (!found || found.kind !== 'hcl-attribute') return missing;
        current = found.value;
        continue;
      }
      if (part === 'blocks' && index + 1 < parts.length) {
        const position = Number(parts[++index]);
        if (!Number.isSafeInteger(position) || position < 0 || String(position) !== parts[index]) return missing;
        const found = body.members.filter(member => member.kind === 'hcl-block')[position];
        if (!found) return missing;
        current = found;
        continue;
      }
      return missing;
    }
    if (current.kind === 'object') {
      const found = current.entries.find(entry => entry.key === part);
      if (!found) return missing;
      current = found.value;
      continue;
    }
    if (current.kind === 'array') {
      const position = Number(part);
      if (!Number.isSafeInteger(position) || position < 0 || String(position) !== part) return missing;
      const found: StructuredValue | undefined = current.items[position];
      if (!found) return missing;
      current = found;
      continue;
    }
    return missing;
  }
  return { found: true, value: current };
}

export function selectViewPath(context: ViewRowContext, path: string): SelectionResult {
  if (path === '$key') return context.key === undefined ? missing
    : { found: true, value: { kind: 'string', value: context.key } };
  if (path.startsWith('$label/')) {
    const position = Number(path.slice('$label/'.length));
    if (!Number.isSafeInteger(position) || position < 0 || String(position) !== path.slice('$label/'.length)) return missing;
    const value = context.labels?.[position];
    return value === undefined ? missing : { found: true, value: { kind: 'string', value } };
  }
  return selectRelative(context.node, path);
}
