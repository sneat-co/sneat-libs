import * as Sentry from '@sentry/angular';
import { setupTestEnvironment } from '@sneat/core/testing';

// Exercise the real imported logging providers. A root default mock would outrank the module under test.
setupTestEnvironment({ mockErrorLogger: false });

// Spy on one stable module identity; independent per-file factories can detach
// assertions from a cached service's imports in VM workers.
beforeEach(() => {
  vi.spyOn(Sentry, 'captureException').mockReturnValue('event-id');
  vi.spyOn(Sentry, 'showReportDialog').mockImplementation(() => undefined);
});
afterEach(() => vi.restoreAllMocks());
