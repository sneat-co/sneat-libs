import { defineConfig, devices } from '@playwright/test';
import { nxE2EPreset } from '@nx/playwright/preset';
import { workspaceRoot } from '@nx/devkit';

// Base URL the demo app is served at during e2e.
const baseURL = process.env['BASE_URL'] || 'http://localhost:4200';

/**
 * Playwright config for the libs demo app.
 *
 * `webServer` starts both the Firebase Auth emulator and the demo dev server.
 * NOTE: not exercised yet — the login flow is finalized later by reusing the
 * working `sneat-app` setup. This config exists so the e2e project compiles.
 */
export default defineConfig({
  ...nxE2EPreset(__filename, { testDir: './src' }),
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  webServer: {
    command:
      'pnpm firebase emulators:exec --only auth --project demo-sneat-libs "nx serve libs-demo"',
    url: baseURL,
    reuseExistingServer: !process.env['CI'],
    cwd: workspaceRoot,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
