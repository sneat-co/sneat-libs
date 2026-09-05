/**
 * Light vitest setup for projects with no DOM, Firebase or Ionic surface —
 * models, DTOs and other pure-TypeScript libraries.
 *
 * ```ts
 * // libs/<project>/src/test-setup.ts
 * import '@sneat/core/testing-light';
 * ```
 *
 * "Light" means *without* the global DOM/Ionic/Firestore mocks and the global
 * TestBed providers that `@sneat/core/testing` installs — not "without
 * Angular". A zoneless Angular testing environment is still initialised, so a
 * project can grow its first `TestBed` spec without switching harness.
 *
 * ## Zoneless since @sneat/core 0.26.5
 *
 * This file used to consist of a single `@analogjs/vitest-angular/setup-zone`
 * import, whose only job was to load zone.js and patch vitest's `describe` /
 * `it` / `beforeEach` so that `waitForAsync` and `fakeAsync` worked. zone.js
 * is no longer a dependency of this workspace, so those wrappers are gone:
 * see `@sneat/core/testing` for the per-pattern migration table.
 */
import { setupAngularTestingEnvironment } from './base-test-setup';

setupAngularTestingEnvironment();
