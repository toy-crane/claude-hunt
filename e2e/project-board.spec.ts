import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import { fetchMagicLink } from "./helpers/mailpit.ts";
import {
  createAdminClient,
  uniqueTestEmail,
} from "./helpers/supabase-admin.ts";

const EMAIL_LABEL_RE = /email/i;
const CONTINUE_BTN_RE = /continue/i;
const MAGIC_LINK_TEXT_RE = /magic link/i;
const SUBMIT_PROJECT_BTN_RE = /submit project/i;
const SUBMIT_PROJECT_TRIGGER_RE = /^submit a project$/i;
const PROJECT_SUBMITTED_TOAST_RE = /project submitted/i;
const SAVE_CHANGES_BTN_RE = /save changes/i;
const LOGIN_URL_RE = /\/login$/;

const dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOT_FIXTURE = path.resolve(
  dirname,
  "fixtures",
  "test-screenshot.png"
);

test("student submits, edits, and deletes their own project end-to-end", async ({
  page,
}) => {
  const admin = createAdminClient();
  const email = uniqueTestEmail();
  let userId: string | undefined;
  let projectId: string | undefined;

  try {
    // Find Cohort A (seeded via migration)
    const { data: cohort, error: cohortError } = await admin
      .from("cohorts")
      .select("id")
      .eq("name", "Cohort A")
      .single();
    if (cohortError || !cohort) {
      throw new Error("Cohort A seed missing — run supabase db reset first");
    }

    // 1. Sign in via magic link
    await page.goto("/login");
    await page.getByLabel(EMAIL_LABEL_RE).fill(email);
    await page.getByRole("button", { name: CONTINUE_BTN_RE }).click();
    await expect(page.getByText(MAGIC_LINK_TEXT_RE)).toBeVisible();

    const magicLink = await fetchMagicLink(email);
    await page.goto(magicLink);
    await expect(page).toHaveURL("http://localhost:3000/");

    // Capture the new user and assign them to Cohort A so the submit
    // form unlocks.
    const { data: usersData } = await admin.auth.admin.listUsers();
    userId = usersData.users.find((u) => u.email === email)?.id;
    if (!userId) {
      throw new Error("Could not resolve user id after magic-link sign-in");
    }
    await admin
      .from("profiles")
      .update({
        cohort_id: cohort.id,
        display_name: "E2E Student",
      })
      .eq("id", userId);

    await page.reload();

    // 2. Open the submit dialog from the header trigger
    await page.getByRole("button", { name: SUBMIT_PROJECT_TRIGGER_RE }).click();
    const submitDialog = page.getByRole("dialog");
    await expect(submitDialog).toBeVisible();

    // 3. Fill the form inside the dialog and submit
    await submitDialog.getByLabel("Title").fill("E2E Test App");
    await submitDialog
      .getByLabel("Tagline")
      .fill("Built during the project-board e2e spec");
    await submitDialog
      .getByLabel("Project URL")
      .fill("https://e2e-test.example.com");
    await submitDialog
      .getByLabel("Screenshot")
      .setInputFiles(SCREENSHOT_FIXTURE);
    await submitDialog
      .getByRole("button", { name: SUBMIT_PROJECT_BTN_RE })
      .click();

    // 4. Dialog closes, toast confirms, card appears in the grid
    await expect(submitDialog).toBeHidden({ timeout: 10_000 });
    await expect(
      page.getByText(PROJECT_SUBMITTED_TOAST_RE).first()
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("E2E Test App")).toBeVisible({
      timeout: 10_000,
    });
    await expect(
      page.getByText("Built during the project-board e2e spec")
    ).toBeVisible();

    // Capture project id for guaranteed teardown
    const { data: proj } = await admin
      .from("projects")
      .select("id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();
    projectId = proj?.id;

    // 4. Edit the tagline (scope queries to the dialog so they don't
    // collide with the submit form still mounted on the page)
    await page.getByTestId("edit-project-trigger").click();
    const editDialog = page.getByRole("dialog");
    await editDialog.getByLabel("Tagline").fill("Updated during the e2e spec");
    await editDialog.getByRole("button", { name: SAVE_CHANGES_BTN_RE }).click();
    await expect(
      page.getByTestId("project-card").getByText("Updated during the e2e spec")
    ).toBeVisible({ timeout: 10_000 });

    // 5. Delete the project
    await page.getByTestId("delete-project-trigger").click();
    await page.getByTestId("delete-project-confirm").click();
    // Wait for the card to leave the grid. The dialog title also contains
    // "E2E Test App" briefly, so scope to the project-card testid.
    await expect(page.getByTestId("project-card")).toHaveCount(0, {
      timeout: 10_000,
    });
  } finally {
    if (projectId) {
      await admin
        .from("projects")
        .delete()
        .eq("id", projectId)
        .then(
          () => undefined,
          () => undefined
        );
    }
    if (userId) {
      await admin.auth.admin.deleteUser(userId).catch(() => {
        /* cleaned by global teardown if this fails */
      });
    }
  }
});

test("signed-out visitor is redirected to /login from the header submit trigger", async ({
  page,
}) => {
  await page.goto("/");

  // For signed-out visitors the trigger is a link, not a button.
  const trigger = page.getByRole("link", {
    name: SUBMIT_PROJECT_TRIGGER_RE,
  });
  await expect(trigger).toBeVisible();
  await expect(trigger).toHaveAttribute("href", "/login");

  await trigger.click();
  await expect(page).toHaveURL(LOGIN_URL_RE);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
