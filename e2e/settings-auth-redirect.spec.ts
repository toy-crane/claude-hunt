import { expect, test } from "@playwright/test";
import { fetchMagicLink } from "./helpers/mailpit";
import {
  createAdminClient,
  findUserIdByEmail,
  uniqueTestEmail,
} from "./helpers/supabase-admin";

const EMAIL_LABEL_RE = /이메일/;
const CONTINUE_BTN_RE = /계속/;
const MAGIC_LINK_TEXT_RE = /매직 링크/;
const SETTINGS_HEADING = /^설정$/;

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

    userId = (await findUserIdByEmail(admin, email)) ?? undefined;
  } finally {
    if (userId) {
      await admin.auth.admin.deleteUser(userId).catch(() => {
        /* swept by globalTeardown if this fails */
      });
    }
  }
});
