import type { SourceRange, StructuredDiagnostic, StructuredLimits } from './structured-data.types';

export const DEFAULT_LIMITS: Required<StructuredLimits> = {
  maxSourceBytes: 2_000_000,
  maxNodes: 30_000,
  maxDepth: 64,
  maxRows: 2_000,
  maxConfigBytes: 64_000,
  maxRules: 100,
  maxSections: 300,
  maxSelectorLength: 256,
  maxSelectorDepth: 16,
  maxYamlAliases: 0,
  timeoutMs: 2_000,
};

export function effectiveLimits(overrides?: StructuredLimits): Required<StructuredLimits> {
  const result = { ...DEFAULT_LIMITS };
  if (overrides) {
    for (const key of Object.keys(DEFAULT_LIMITS) as (keyof StructuredLimits)[]) {
      const value = overrides[key];
      if (value !== undefined) {
        if (!Number.isSafeInteger(value) || value < 0 || value > DEFAULT_LIMITS[key]) {
          throw new Error(`Invalid ${key} limit`);
        }
        result[key] = value;
      }
    }
  }
  return result;
}

export function sourceByteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

export function exceedsSourceLimit(text: string, maxBytes: number): boolean {
  return text.length > maxBytes || sourceByteLength(text) > maxBytes;
}

export function diagnostic(
  code: StructuredDiagnostic['code'],
  message: string,
  range?: SourceRange,
  source?: string,
): StructuredDiagnostic {
  return { code, message, severity: 'error', ...(range ? { range } : {}), ...(source ? { source } : {}) };
}

/** Tree-sitter and JS parser offsets are UTF-16 code-unit offsets. */
export class SourceLocator {
  private readonly lineStarts: number[] = [0];

  constructor(private readonly source: string) {
    for (let index = 0; index < source.length; index++) {
      if (source[index] === '\r') {
        if (source[index + 1] === '\n') index++;
        this.lineStarts.push(index + 1);
      } else if (source[index] === '\n') {
        this.lineStarts.push(index + 1);
      }
    }
  }

  range(startOffset: number, endOffset: number): SourceRange {
    return {
      startOffset,
      endOffset,
      start: this.position(startOffset),
      end: this.position(endOffset),
    };
  }

  private position(offset: number): { line: number; column: number } {
    let low = 0;
    let high = this.lineStarts.length;
    while (low + 1 < high) {
      const middle = (low + high) >>> 1;
      if (this.lineStarts[middle] <= offset) low = middle;
      else high = middle;
    }
    return { line: low, column: offset - this.lineStarts[low] };
  }
}
