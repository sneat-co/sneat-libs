import { expect, test } from '@playwright/test';

/**
 * Login page e2e — DRAFT.
 *
 * These specs are intentionally NOT run yet. The login flow is still being made
 * to work in `sneat-app`; once it works there, the same wiring is reused in the
 * demo app and these assertions are finalized (and the emulator user seeding is
 * added in a Playwright global-setup step). For now they document the intended
 * coverage and must only type-check.
 */
test.describe('Login page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('renders the login page', async ({ page }) => {
    // The library login page is an Ion page; assert its shell is present.
    await expect(page.locator('ion-content')).toBeVisible();
  });

  test('shows the email login form', async ({ page }) => {
    await expect(page.locator('sneat-email-login-form')).toBeVisible();
  });

  test.fixme('rejects invalid credentials', async ({ page }) => {
    // TODO(reuse-sneat-app-wiring): drive the email form with bad credentials
    // and assert the error state once auth wiring is finalized.
    await expect(page).toHaveURL(/\/login/);
  });

  test.fixme(
    'authenticates a seeded user against the emulator',
    async ({ page }) => {
      // TODO(reuse-sneat-app-wiring): seed a user via the Auth emulator REST API
      // in global setup, sign in here, and assert the authenticated redirect.
      await expect(page).toHaveURL(/\/login/);
    },
  );
});
