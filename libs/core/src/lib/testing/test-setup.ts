import { TestBed } from '@angular/core/testing';
import {
  setupAngularTestingEnvironment,
  setupGlobalMocks,
} from './base-test-setup';
import { ErrorLogger } from '../logging/interfaces';
import { Firestore } from 'firebase/firestore';
import { SNEAT_FIREBASE_AUTH } from '../firebase.tokens';
import { AnalyticsService } from '../analytics.interface';

export function configureGlobalTestBed() {
  try {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: ErrorLogger,
          useValue: {
            logError: vi.fn(),
            logErrorHandler: () => {
              return vi.fn();
            },
          },
        },
        {
          provide: Firestore,
          useValue: {
            type: 'Firestore',
            toJSON: () => ({}),
          },
        },
        {
          provide: SNEAT_FIREBASE_AUTH,
          useValue: {
            onIdTokenChanged: vi.fn(() => () => void 0),
            onAuthStateChanged: vi.fn(() => () => void 0),
          },
        },
        {
          provide: AnalyticsService,
          useValue: {
            logEvent: vi.fn(),
            identify: vi.fn(),
            loggedOut: vi.fn(),
            setCurrentScreen: vi.fn(),
          },
        },
      ],
    });
  } catch {
    // ignore
  }
}

/**
 * The workspace-standard vitest setup entry point. Call it once, at the top
 * level of a project's `src/test-setup.ts`:
 *
 * ```ts
 * import { setupTestEnvironment } from '@sneat/core/testing';
 * setupTestEnvironment();
 * ```
 *
 * ## `@angular/fire`-free since @sneat/core 0.27.0
 *
 * The global TestBed above no longer provides `@angular/fire`'s `Firestore`
 * and `Auth` tokens. It provides `Firestore` from `firebase/firestore` (a real
 * class in the modular SDK, so it doubles as its own DI token) and
 * `SNEAT_FIREBASE_AUTH` from `@sneat/core`. A repo re-syncing this file must
 * make the same swap in its own specs:
 *
 * - `import { Firestore } from '@angular/fire/firestore'`
 *   → `import { Firestore } from 'firebase/firestore'`
 * - `{ provide: Auth, … }` (from `@angular/fire/auth`)
 *   → `{ provide: SNEAT_FIREBASE_AUTH, … }` (from `@sneat/core`)
 * - `vi.mock('@angular/fire/firestore')` → `vi.mock('firebase/firestore')`
 *
 * and drop `@angular/fire` from its own `package.json` and its
 * `resolve.dedupe`/`server.deps.inline` lists.
 *
 * ## Zoneless since @sneat/core 0.26.5
 *
 * The call signature is unchanged — `setupTestEnvironment()` takes no
 * arguments and returns nothing, exactly as before — but the environment it
 * installs is now **zoneless**: zone.js is no longer a dependency of this
 * workspace and `@analogjs/vitest-angular/setup-zone` is no longer imported.
 *
 * `@sneat/core/testing` is a workspace tsconfig path, not a published subpath
 * of the `@sneat/core` npm package (`libs/core/tsconfig.lib.json` excludes
 * `src/lib/testing/**`), so downstream repos consume this file by *copying*
 * it, not by bumping a version. A repo that has copied an earlier revision
 * keeps working untouched; when it re-syncs from this template it must also
 * migrate its own specs:
 *
 * - `beforeEach(waitForAsync(async () => {…}))`
 *   → `beforeEach(async () => { …; await fixture.whenStable(); })`
 * - `it('…', fakeAsync(() => { …; tick(N); }))`
 *   → `it('…', async () => { vi.useFakeTimers(); try { …;
 *     await vi.advanceTimersByTimeAsync(N); } finally { vi.useRealTimers(); } })`
 * - a bare `tick()` used only to settle a promise chain (no timers) →
 *   `await new Promise<void>((resolve) => setTimeout(resolve, 0))`. A real
 *   `setTimeout(…, 0)` is a macrotask, so every already-queued microtask runs
 *   to completion before it fires — however long the chain. Prefer it over
 *   counting `await Promise.resolve()` turns, which is brittle.
 *
 * and drop `zone.js` from its own `package.json` and its
 * `resolve.dedupe` list. Verify the migration with per-file covered-line
 * parity against a pre-change baseline, not with the passing-test count: a
 * missing `await fixture.whenStable()` leaves the suite green while the
 * component's async initialisation silently stops running.
 *
 * @see setupAngularTestingEnvironment for the zoneless change-detection wiring.
 */
export function setupTestEnvironment() {
  setupAngularTestingEnvironment();
  setupGlobalMocks();
  configureGlobalTestBed();
}
