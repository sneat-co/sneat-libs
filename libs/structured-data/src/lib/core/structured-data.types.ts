/** Public, transport-independent contract for @sneat/structured-data. */

export type StructuredFormat = 'json' | 'yaml' | 'hcl';

/** Offsets and columns are UTF-16 code units; lines and columns are zero-based. */
export interface SourcePosition {
  readonly line: number;
  readonly column: number;
}

/** Half-open range into the exact, unchanged sourceText of a document. */
export interface SourceRange {
  readonly startOffset: number;
  readonly endOffset: number;
  readonly start: SourcePosition;
  readonly end: SourcePosition;
}

export interface StructuredNull {
  readonly kind: 'null';
  readonly range?: SourceRange;
}

export interface StructuredBoolean {
  readonly kind: 'boolean';
  readonly value: boolean;
  readonly range?: SourceRange;
}

export interface StructuredNumber {
  readonly kind: 'number';
  /** Exact numeric lexeme; the renderer never displays a rounded JS number. */
  readonly sourceText: string;
  /** Only supplied when conversion to a JS number is finite and lossless. */
  readonly value?: number;
  readonly range?: SourceRange;
}

export interface StructuredString {
  readonly kind: 'string';
  readonly value: string;
  readonly range?: SourceRange;
}

/** Never evaluate or silently coerce an HCL expression into a string. */
export interface StructuredExpression {
  readonly kind: 'expression';
  readonly sourceText: string;
  readonly range: SourceRange;
}

export interface StructuredArray {
  readonly kind: 'array';
  readonly items: readonly StructuredValue[];
  readonly range?: SourceRange;
}

export interface StructuredObjectEntry {
  readonly key: string;
  readonly value: StructuredValue;
  readonly range?: SourceRange;
}

export interface StructuredObject {
  readonly kind: 'object';
  readonly entries: readonly StructuredObjectEntry[];
  readonly range?: SourceRange;
}

export type StructuredValue =
  | StructuredNull
  | StructuredBoolean
  | StructuredNumber
  | StructuredString
  | StructuredExpression
  | StructuredArray
  | StructuredObject;

export interface HclAttribute {
  readonly kind: 'hcl-attribute';
  readonly name: string;
  readonly value: StructuredValue;
  readonly range: SourceRange;
}

export interface HclBlock {
  readonly kind: 'hcl-block';
  readonly blockType: string;
  readonly labels: readonly string[];
  readonly body: HclBody;
  readonly range: SourceRange;
}

/** Members retain exact source order, including repeated blocks and labels. */
export interface HclBody {
  readonly kind: 'hcl-body';
  readonly members: readonly (HclAttribute | HclBlock)[];
  readonly range: SourceRange;
}

export type StructuredNode = StructuredValue | HclBody | HclBlock | HclAttribute;

export interface StructuredDocument {
  readonly format: StructuredFormat;
  readonly root: StructuredValue | HclBody;
  /** The exact original text. Parsing never rewrites this source snapshot. */
  readonly sourceText: string;
}

export type StructuredDiagnosticCode =
  | 'invalid_syntax'
  | 'unsupported_format'
  | 'unsupported_construct'
  | 'invalid_config'
  | 'limit_exceeded'
  | 'parser_unavailable';

export interface StructuredDiagnostic {
  readonly code: StructuredDiagnosticCode;
  readonly message: string;
  readonly severity: 'error' | 'warning';
  readonly range?: SourceRange;
  readonly source?: string;
}

export interface StructuredLimits {
  readonly maxSourceBytes?: number;
  readonly maxNodes?: number;
  readonly maxDepth?: number;
  readonly maxRows?: number;
  readonly maxConfigBytes?: number;
  readonly maxRules?: number;
  readonly maxSections?: number;
  readonly maxSelectorLength?: number;
  readonly maxSelectorDepth?: number;
  readonly maxYamlAliases?: number;
  readonly timeoutMs?: number;
}

export type ParseResult =
  | { readonly ok: true; readonly document: StructuredDocument; readonly diagnostics: readonly StructuredDiagnostic[] }
  | { readonly ok: false; readonly diagnostics: readonly StructuredDiagnostic[] };

export type ScalarListLayout = 'inline' | 'list';
export type CollectionPresentation = 'list' | 'accordion';
export type InitialExpansion = 'first' | 'all' | 'none';

export interface ViewTitle {
  readonly label: string;
  readonly path: string;
}

export interface ViewField {
  readonly label: string;
  readonly path: string;
  readonly scalarListLayout?: ScalarListLayout;
}

export interface ViewColumn {
  readonly label: string;
  readonly path: string;
}

export interface ViewEntryLayout {
  /** $key for dictionary entries; $label/N for HCL block labels. */
  readonly heading: string;
  readonly sections?: readonly ViewSection[];
}

export interface ViewSectionBase {
  readonly id: string;
  readonly title: string;
  /** Relative JSON Pointer, or empty string for the current value. */
  readonly path: string;
}

export interface FieldsSection extends ViewSectionBase {
  readonly kind: 'fields';
  readonly fields: readonly ViewField[];
}

export interface ValueSection extends ViewSectionBase {
  readonly kind: 'value';
  readonly scalarListLayout?: ScalarListLayout;
}

export interface EntriesSection extends ViewSectionBase {
  readonly kind: 'entries';
  readonly presentation?: CollectionPresentation;
  readonly allowLayoutSwitch?: boolean;
  readonly initiallyExpanded?: InitialExpansion;
  readonly entry?: ViewEntryLayout;
}

export interface TableSection extends ViewSectionBase {
  readonly kind: 'table';
  readonly rows: 'dictionary' | 'list' | 'blocks';
  readonly blockType?: string;
  readonly columns: readonly ViewColumn[];
}

export interface BlocksSection extends ViewSectionBase {
  readonly kind: 'blocks';
  readonly blockType: string;
  readonly presentation?: CollectionPresentation;
  readonly allowLayoutSwitch?: boolean;
  readonly initiallyExpanded?: InitialExpansion;
  readonly entry?: ViewEntryLayout;
}

export type ViewSection = FieldsSection | ValueSection | EntriesSection | TableSection | BlocksSection;

export interface ViewRule {
  readonly id: string;
  readonly match: string;
  readonly parser: StructuredFormat;
  readonly title?: ViewTitle;
  readonly sections?: readonly ViewSection[];
}

export interface StructuredViewConfig {
  readonly version: 1;
  readonly rules: readonly ViewRule[];
}

/** Host supplies these from one pinned revision, root first and nearest last. */
export interface OrderedViewConfigDocument {
  readonly sourcePath: string;
  readonly config: unknown;
}

export type ValidationResult =
  | { readonly ok: true; readonly config: StructuredViewConfig }
  | { readonly ok: false; readonly diagnostics: readonly StructuredDiagnostic[] };

export type ResolutionResult =
  | { readonly status: 'matched'; readonly parser: StructuredFormat; readonly view: ViewRule }
  | { readonly status: 'generic'; readonly parser: StructuredFormat }
  | { readonly status: 'unsupported'; readonly diagnostics: readonly StructuredDiagnostic[] }
  | { readonly status: 'error'; readonly diagnostics: readonly StructuredDiagnostic[] };

export interface ResolveViewOptions {
  readonly repositoryPath: string;
  readonly orderedDocuments: readonly OrderedViewConfigDocument[];
  /** App defaults precede root-to-nearest repository documents. */
  readonly builtInRules?: readonly ViewRule[];
  readonly limits?: StructuredLimits;
}

export type SelectionResult =
  | { readonly found: true; readonly value: StructuredNode }
  | { readonly found: false };

export interface ViewRowContext {
  readonly node: StructuredNode;
  readonly key?: string;
  readonly labels?: readonly string[];
  /** Hierarchical, stable section path for nested row links and independent controls. */
  readonly pathId?: string;
}

export interface StructuredSectionSelection {
  readonly sectionId: string;
}
