import { expect, test } from "@playwright/test";
import { fetchMagicLink } from "../helpers/mailpit";
import { createAdminClient, uniqueTestEmail } from "../helpers/supabase-admin";

const EMAIL_LABEL_RE = /email/i;
const CONTINUE_BTN_RE = /continue/i;
const MAGIC_LINK_TEXT_RE = /magic link/i;

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

    // 4. Click the link — redirect chain: verify → /auth/callback?code=... → /
    await page.goto(magicLink);

    // 5. Assert: main page renders the Project Board landing, which also
    // proves the user landed on / after the callback redirected.
    await expect(page).toHaveURL("http://localhost:3000/");
    await expect(
      page.getByRole("heading", { name: "Project Board" })
    ).toBeVisible();
    // A cohort-less signed-in student sees the submit form with the
    // instructor warning — proof of authenticated state.
    await expect(page.getByTestId("submit-form-cohort-warning")).toBeVisible();

    // Capture user id for targeted cleanup
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
