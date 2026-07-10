import { expect, test } from "@playwright/test";
import {
  createAdminClient,
  findUserIdByEmail,
} from "../helpers/supabase-admin";

const ACCOUNT_MENU_RE = /계정 메뉴 열기/;
const SETTINGS_URL_RE = /\/settings/;

// Requires DEV_LOGIN_ENABLED=true in .env.local (the Playwright webServer
// inherits it; a dev server started before the flag was added must be
// restarted). Nothing here creates data, so no teardown is needed.

test("operator signs in with a single dev-login URL visit", async ({
  page,
}) => {
  await page.goto("/auth/dev-login?email=operator@example.com");

  // Landing on "/" (not /onboarding) proves the seeded cohort is set;
  // the account-menu trigger only renders for an authenticated viewer.
  await expect(page).toHaveURL("/");
  await expect(
    page.getByRole("button", { name: ACCOUNT_MENU_RE })
  ).toBeVisible();
});

test("seeded student reaches the auth-gated settings page via next", async ({
  page,
}) => {
  // Also the regression check for the seed GoTrue token-column backfill:
  // with NULL token columns this request 500s inside GoTrue.
  await page.goto("/auth/dev-login?email=alice@example.com&next=/settings");

  // Unauthenticated visitors get bounced to /login instead.
  await expect(page).toHaveURL(SETTINGS_URL_RE);
});

test("rejects an email outside the allowed domains", async ({ page }) => {
  const res = await page.request.get("/auth/dev-login?email=x@gmail.com");

  expect(res.status()).toBe(400);
});

test("rejects an unknown email without auto-creating a user", async ({
  page,
}) => {
  const admin = createAdminClient();
  const email = "ghost@example.com";

  const res = await page.request.get(`/auth/dev-login?email=${email}`);

  expect(res.status()).toBe(400);
  expect(await findUserIdByEmail(admin, email)).toBeNull();
});
