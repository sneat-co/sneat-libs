# @sneat/structured-data

Read-only JSON, YAML, and HCL parsing and presentation for Angular 22 and PrimeNG 22 applications. The package has a framework-free `@sneat/structured-data/core` entry point and a standalone `sneat-structured-data-viewer` component. It does not fetch files, evaluate HCL expressions, change data, own routing, or apply a theme.

```ts
import { parseStructuredText, resolveViewRule } from '@sneat/structured-data/core';
import { StructuredDataViewerComponent } from '@sneat/structured-data';

const result = await parseStructuredText(sourceText, 'hcl');
```

The host supplies a pinned source snapshot and, optionally, a validated view rule. Pass `result.document` to the component when `result.ok` is true. Pass diagnostics and the exact source text for a Raw fallback. `SourceRange` offsets and columns are zero-based UTF-16 code units; the host can convert a selected line to a one-based source link. Numbers retain their exact source lexeme, and HCL expressions remain tagged source text rather than evaluated values.

## HCL browser assets

HCL parsing runs in a bounded module Worker using the pinned Web Tree-sitter runtime and HCL grammar. The published package includes `assets/hcl-worker.mjs`, `assets/web-tree-sitter.js`, and both WASM files, along with their license files. Angular's application bundler does **not** automatically copy these package assets. Copy the package's `assets` directory to the application's same-origin `/assets` output. For an Nx Angular application:

```json
{
  "glob": "**/*",
  "input": "node_modules/@sneat/structured-data/assets",
  "output": "/assets"
}
```

The package Worker URL is resolved from its compiled module as `../assets/hcl-worker.mjs`; the Worker loads its JS/WASM siblings relative to itself. Verify that the emitted application JavaScript resolves that URL to the copied same-origin `/assets/hcl-worker.mjs`, and that CSP permits same-origin module Workers and WASM. This host asset-copy step applies equally to CodeGrapher, DataTug, and any later consumer. Apps served under a non-root base path must verify the URL resolution in their production bundle before enabling HCL. JSON and YAML parsing do not need these assets and remain usable in SSR; HCL reports `parser_unavailable` when no browser Worker is available.

Parsing and rendering enforce source-byte, node, depth, row, config, and deadline limits. A timed-out HCL Worker is terminated. YAML aliases and custom tags are rejected with diagnostics; the host can still offer the original Raw source. Unconfigured fields stay visible in bounded disclosures, including table rows. `activeSectionId` accepts hierarchical paths such as `entities/country/properties` to reopen and focus a nested section.

View configs accept JSON or YAML through `parseViewConfigText`, then `resolveViewRule` combines application defaults and root-to-nearest config documents. Rules use bounded relative glob patterns and JSON Pointer selectors. Configuration is data only; there is no script evaluation or network resolution.
