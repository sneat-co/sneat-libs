import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// `firebase/analytics` has load-time side effects, so a bundler keeps it in
// any chunk that keeps the module importing it. Apps without analytics
// (AskMic) use provideSneatFirebaseAuth/provideSneatFirestore and
// SneatAuthenticatedLifecycle; those modules must not import it.
describe('firebase/analytics isolation', () => {
  const dir = __dirname;
  const importsAnalytics = (file: string): boolean =>
    /from\s+['"]firebase\/analytics['"]|import\(\s*['"]firebase\/analytics['"]/.test(
      readFileSync(join(dir, file), 'utf8'),
    );

  it('only provide-sneat-firebase-analytics.ts imports firebase/analytics', () => {
    const offenders = readdirSync(dir)
      .filter((f) => f.endsWith('.ts') && !f.endsWith('.spec.ts'))
      .filter(importsAnalytics);
    expect(offenders).toEqual(['provide-sneat-firebase-analytics.ts']);
  });
});
