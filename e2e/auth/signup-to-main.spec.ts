import { expect, test } from "@playwright/test";
import { fetchMagicLink } from "../helpers/mailpit";
import {
  createAdminClient,
  findUserIdByEmail,
  uniqueTestEmail,
} from "../helpers/supabase-admin";

const EMAIL_LABEL_RE = /이메일/;
const CONTINUE_BTN_RE = /계속/;
const MAGIC_LINK_TEXT_RE = /매직 링크/;
const ONBOARDING_URL_RE = /\/onboarding/;

test("new user lands on main page authenticated after clicking magic link", async ({
  page,
}) => {
  const admin = createAdminClient();
  const email = uniqueTestEmail();
  let userId: string | undefined;

  try {
    // 1. Open the login form and submit the email
    await page.goto("/login");
    await page.getByLabel(EMAIL_LABEL_RE).fill(email);
    await page.getByRole("button", { name: CONTINUE_BTN_RE }).click();

    // 2. Confirm the form reports the magic link was sent
    await expect(page.getByText(MAGIC_LINK_TEXT_RE)).toBeVisible();

    // 3. Pull the real magic-link URL out of Mailpit (PKCE-flow link from the form)
    const magicLink = await fetchMagicLink(email);

    // 4. Click the link — redirect chain: verify → /auth/callback?code=...
    //    → /onboarding (new users without a cohort go through onboarding)
    await page.goto(magicLink);

    // 5. Assert: onboarding screen renders, which proves the user is
    //    signed in and was routed to the new-user gate. The form's
    //    cohort/nickname inputs are the canonical authenticated-state
    //    signals before a profile.cohort_id has been set.
    await expect(page).toHaveURL(ONBOARDING_URL_RE);
    await expect(page.getByLabel("닉네임")).toBeVisible();
    await expect(page.getByLabel("클래스")).toBeVisible();

    // Capture user id for targeted cleanup
    userId = (await findUserIdByEmail(admin, email)) ?? undefined;
  } finally {
    if (userId) {
      await admin.auth.admin.deleteUser(userId).catch(() => {
        /* swept by globalTeardown if this fails */
      });
    }
  }
});
