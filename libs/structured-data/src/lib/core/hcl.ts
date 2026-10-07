import type { HclBody, ParseResult, StructuredDiagnostic, StructuredLimits } from './structured-data.types';
import { diagnostic, effectiveLimits, exceedsSourceLimit } from './limits';

interface HclWorkerReply {
  readonly id: number;
  readonly ok: boolean;
  readonly root?: HclBody;
  readonly diagnostics?: readonly StructuredDiagnostic[];
}

/** Loads only same-origin packaged assets, and only when invoked in a browser. */
export async function parseHclText(sourceText: string, limits?: StructuredLimits): Promise<ParseResult> {
  let bounded: Required<StructuredLimits>;
  try { bounded = effectiveLimits(limits); }
  catch (error) { return { ok: false, diagnostics: [diagnostic('limit_exceeded', String(error))] }; }
  if (exceedsSourceLimit(sourceText, bounded.maxSourceBytes)) {
    return { ok: false, diagnostics: [diagnostic('limit_exceeded', `HCL source exceeds ${bounded.maxSourceBytes} bytes`)] };
  }
  if (typeof Worker === 'undefined') {
    return { ok: false, diagnostics: [diagnostic('parser_unavailable', 'HCL parsing requires a browser Worker')] };
  }
  let worker: Worker;
  try {
    worker = new Worker(new URL('../assets/hcl-worker.mjs', import.meta.url), { type: 'module' });
  } catch (error) {
    return { ok: false, diagnostics: [diagnostic('parser_unavailable', `HCL Worker could not start: ${String(error)}`)] };
  }
  return new Promise<ParseResult>(resolve => {
    let settled = false;
    const finish = (result: ParseResult): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      worker.terminate();
      resolve(result);
    };
    const timer = setTimeout(() => finish({ ok: false,
      diagnostics: [diagnostic('limit_exceeded', 'HCL parsing exceeded its hard deadline')] }), bounded.timeoutMs + 1_000);
    worker.onmessage = (event: MessageEvent<HclWorkerReply>) => {
      const reply = event.data;
      if (!reply || reply.id !== 1) return;
      if (reply.ok && reply.root) finish({ ok: true,
        document: { format: 'hcl', root: reply.root, sourceText }, diagnostics: [] });
      else finish({ ok: false, diagnostics: reply.diagnostics?.length
        ? reply.diagnostics : [diagnostic('invalid_syntax', 'HCL parser returned no document')] });
    };
    worker.onerror = () => finish({ ok: false,
      diagnostics: [diagnostic('parser_unavailable', 'HCL Worker failed to load its packaged assets')] });
    worker.postMessage({ id: 1, sourceText, limits: bounded });
  });
}
