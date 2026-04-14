import { expect, test } from "@playwright/test";
import { fetchMagicLink } from "./helpers/mailpit";
import { createAdminClient, uniqueTestEmail } from "./helpers/supabase-admin";

const EMAIL_LABEL_RE = /email/i;
const CONTINUE_BTN_RE = /continue/i;
const MAGIC_LINK_TEXT_RE = /magic link/i;
const SETTINGS_HEADING = /^settings$/i;

test("signed-out visitor to /settings is bounced to /login and returned after sign-in", async ({
  page,
}) => {
  const admin = createAdminClient();
  const email = uniqueTestEmail();
  let userId: string | undefined;

  try {
    // 1. Visit /settings while signed out — expect redirect to /login
    //    with a `next=/settings` query param preserved.
    await page.goto("/settings");
    await expect(page).toHaveURL("http://localhost:3000/login?next=/settings");

    // 2. Submit email to receive the magic link.
    await page.getByLabel(EMAIL_LABEL_RE).fill(email);
    await page.getByRole("button", { name: CONTINUE_BTN_RE }).click();
    await expect(page.getByText(MAGIC_LINK_TEXT_RE)).toBeVisible();

    // 3. Pull the magic link out of Mailpit and click it — the auth
    //    callback honors `next` and returns to /settings.
    const magicLink = await fetchMagicLink(email);
    await page.goto(magicLink);

    // 4. Assert: we arrive at /settings, signed in.
    await expect(page).toHaveURL("http://localhost:3000/settings");
    await expect(
      page.getByRole("heading", { name: SETTINGS_HEADING })
    ).toBeVisible();

    const { data: usersData } = await admin.auth.admin.listUsers();
    userId = usersData.users.find((u) => u.email === email)?.id;
  } finally {
    if (userId) {
      await admin.auth.admin.deleteUser(userId).catch(() => {
        /* swept by globalTeardown if this fails */
      });
    }
  }
});
