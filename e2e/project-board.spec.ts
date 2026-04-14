import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, type Page, test } from "@playwright/test";
import { fetchMagicLink } from "./helpers/mailpit";
import { createAdminClient, uniqueTestEmail } from "./helpers/supabase-admin";

const EMAIL_LABEL_RE = /email/i;
const CONTINUE_BTN_RE = /continue/i;
const MAGIC_LINK_TEXT_RE = /magic link/i;
const SUBMIT_PROJECT_BTN_RE = /submit project/i;
const SUBMIT_PROJECT_TRIGGER_RE = /^submit a project$/i;
const PROJECT_SUBMITTED_TOAST_RE = /project submitted/i;
const SAVE_CHANGES_BTN_RE = /save changes/i;
const LOGIN_URL_RE = /\/login$/;
const SUPABASE_STORAGE_URL_RE =
  /\/storage\/v1\/object\/(?:public\/)?project-screenshots\//;

const dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOT_FIXTURE = path.resolve(
  dirname,
  "fixtures",
  "large-screenshot.jpg"
);
const SMALL_SCREENSHOT_FIXTURE = path.resolve(
  dirname,
  "fixtures",
  "small-screenshot.png"
);

const MAX_IMAGE_DIMENSION = 1920;
const MAX_STORED_BYTES = 1_000_000;

interface AuthedStudent {
  cleanup: () => Promise<void>;
  userId: string;
}

async function signInStudentWithCohort(
  page: Page,
  admin: ReturnType<typeof createAdminClient>
): Promise<AuthedStudent> {
  const email = uniqueTestEmail();

  const { data: cohort, error: cohortError } = await admin
    .from("cohorts")
    .select("id")
    .eq("name", "LGE-1")
    .single();
  if (cohortError || !cohort) {
    throw new Error("LGE-1 seed missing — run supabase db reset first");
  }

  await page.goto("/login");
  await page.getByLabel(EMAIL_LABEL_RE).fill(email);
  await page.getByRole("button", { name: CONTINUE_BTN_RE }).click();
  await expect(page.getByText(MAGIC_LINK_TEXT_RE)).toBeVisible();

  const magicLink = await fetchMagicLink(email);
  await page.goto(magicLink);
  // New users land on /onboarding until cohort + display name are set.
  // Wait for that settle, then resolve the user id, set both via
  // admin, and navigate home ourselves.
  await page.waitForLoadState("networkidle");

  const { data: usersData } = await admin.auth.admin.listUsers();
  const userId = usersData.users.find((u) => u.email === email)?.id;
  if (!userId) {
    throw new Error("Could not resolve user id after magic-link sign-in");
  }
  await admin
    .from("profiles")
    .update({ cohort_id: cohort.id, display_name: "E2E Student" })
    .eq("id", userId);

  await page.goto("/");
  await expect(page).toHaveURL("http://localhost:3000/");

  const cleanup = async () => {
    const { data: projects } = await admin
      .from("projects")
      .select("id")
      .eq("user_id", userId);
    if (projects?.length) {
      await admin
        .from("projects")
        .delete()
        .in(
          "id",
          projects.map((p) => p.id)
        )
        .then(
          () => undefined,
          () => undefined
        );
    }
    await admin.auth.admin.deleteUser(userId).catch(() => {
      /* global teardown will sweep */
    });
  };

  return { userId, cleanup };
}

interface StoredImageCheck {
  contentLength: number | null;
  contentType: string | null;
  naturalHeight: number;
  naturalWidth: number;
}

async function inspectStoredScreenshot(
  page: Page,
  imgLocator: ReturnType<Page["locator"]>
): Promise<StoredImageCheck> {
  await expect(imgLocator).toBeVisible();
  const src = await imgLocator.getAttribute("src");
  if (!src) {
    throw new Error("Screenshot <img> has no src");
  }

  await imgLocator.evaluate((el) => {
    const img = el as HTMLImageElement;
    return img.complete
      ? Promise.resolve()
      : new Promise<void>((resolve, reject) => {
          img.addEventListener("load", () => resolve(), { once: true });
          img.addEventListener("error", () => reject(new Error("load")), {
            once: true,
          });
        });
  });

  const dims = await imgLocator.evaluate((el) => {
    const img = el as HTMLImageElement;
    return { naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight };
  });

  const response = await page.request.fetch(src, { method: "HEAD" });
  const headers = response.headers();
  const contentType = headers["content-type"] ?? null;
  const contentLengthHeader = headers["content-length"];
  const contentLength = contentLengthHeader
    ? Number.parseInt(contentLengthHeader, 10)
    : null;

  return {
    naturalWidth: dims.naturalWidth,
    naturalHeight: dims.naturalHeight,
    contentType,
    contentLength,
  };
}

test("student submits, edits, and deletes their own project end-to-end", async ({
  page,
}) => {
  const admin = createAdminClient();
  let student: AuthedStudent | undefined;

  try {
    student = await signInStudentWithCohort(page, admin);

    // Submit with the large (12 MiB / 4032×3024) fixture.
    await page.getByRole("button", { name: SUBMIT_PROJECT_TRIGGER_RE }).click();
    const submitDialog = page.getByRole("dialog");
    await expect(submitDialog).toBeVisible();
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

    await expect(submitDialog).toBeHidden({ timeout: 30_000 });
    await expect(
      page.getByText(PROJECT_SUBMITTED_TOAST_RE).first()
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("E2E Test App")).toBeVisible({
      timeout: 10_000,
    });

    // The stored screenshot must satisfy the feature's invariants:
    // longest side ≤ 1920 px, image/webp, < 1 MB.
    const submitCard = page.getByTestId("project-card").first();
    const submitImg = submitCard.locator("img").first();
    const submitted = await inspectStoredScreenshot(page, submitImg);
    expect(submitted.naturalWidth).toBeLessThanOrEqual(MAX_IMAGE_DIMENSION);
    expect(submitted.naturalHeight).toBeLessThanOrEqual(MAX_IMAGE_DIMENSION);
    expect(submitted.contentType).toBe("image/webp");
    if (submitted.contentLength !== null) {
      expect(submitted.contentLength).toBeLessThan(MAX_STORED_BYTES);
    }
    const submittedSrc = await submitImg.getAttribute("src");

    // Edit: replace the screenshot with the same large fixture and
    // update the tagline, then re-check the invariants on the new URL.
    await page.getByTestId("edit-project-trigger").click();
    const editDialog = page.getByRole("dialog");
    await editDialog.getByLabel("Tagline").fill("Updated during the e2e spec");
    await editDialog
      .getByLabel("Screenshot (optional)")
      .setInputFiles(SCREENSHOT_FIXTURE);
    await editDialog.getByRole("button", { name: SAVE_CHANGES_BTN_RE }).click();
    await expect(
      page.getByTestId("project-card").getByText("Updated during the e2e spec")
    ).toBeVisible({ timeout: 15_000 });

    const editedImg = page
      .getByTestId("project-card")
      .first()
      .locator("img")
      .first();
    await expect(editedImg).not.toHaveAttribute("src", submittedSrc ?? "", {
      timeout: 10_000,
    });
    const edited = await inspectStoredScreenshot(page, editedImg);
    expect(edited.naturalWidth).toBeLessThanOrEqual(MAX_IMAGE_DIMENSION);
    expect(edited.naturalHeight).toBeLessThanOrEqual(MAX_IMAGE_DIMENSION);
    expect(edited.contentType).toBe("image/webp");

    // The superseded screenshot must stop serving at its previous URL.
    if (!submittedSrc) {
      throw new Error("Expected submittedSrc to be set");
    }
    await expect(async () => {
      const response = await page.request.fetch(submittedSrc, {
        method: "HEAD",
      });
      expect(response.status()).toBeGreaterThanOrEqual(400);
    }).toPass({ timeout: 10_000 });

    const editedSrc = await editedImg.getAttribute("src");
    if (!editedSrc) {
      throw new Error("Expected editedSrc to be set");
    }

    // Metadata-only edit: change the title without touching the file
    // input. The stored image must be untouched and still serve.
    await page.getByTestId("edit-project-trigger").click();
    const metaDialog = page.getByRole("dialog");
    await metaDialog.getByLabel("Title").fill("E2E Test App (renamed)");
    await metaDialog.getByRole("button", { name: SAVE_CHANGES_BTN_RE }).click();
    await expect(
      page.getByTestId("project-card").getByText("E2E Test App (renamed)")
    ).toBeVisible({ timeout: 15_000 });

    const afterMetaImg = page
      .getByTestId("project-card")
      .first()
      .locator("img")
      .first();
    await expect(afterMetaImg).toHaveAttribute("src", editedSrc);
    const stillServing = await page.request.fetch(editedSrc, {
      method: "HEAD",
    });
    expect(stillServing.status()).toBe(200);

    // Delete the project.
    await page.getByTestId("delete-project-trigger").click();
    await page.getByTestId("delete-project-confirm").click();
    await expect(page.getByTestId("project-card")).toHaveCount(0, {
      timeout: 10_000,
    });

    // The deleted project's screenshot must stop serving as well.
    await expect(async () => {
      const response = await page.request.fetch(editedSrc, { method: "HEAD" });
      expect(response.status()).toBeGreaterThanOrEqual(400);
    }).toPass({ timeout: 10_000 });
  } finally {
    await student?.cleanup();
  }
});

test("small sources are still served as WebP", async ({ page }) => {
  const admin = createAdminClient();
  let student: AuthedStudent | undefined;

  try {
    student = await signInStudentWithCohort(page, admin);

    await page.getByRole("button", { name: SUBMIT_PROJECT_TRIGGER_RE }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Title").fill("Small Image Test");
    await dialog.getByLabel("Tagline").fill("An 800x600 source");
    await dialog.getByLabel("Project URL").fill("https://small.example.com");
    await dialog
      .getByLabel("Screenshot")
      .setInputFiles(SMALL_SCREENSHOT_FIXTURE);
    await dialog.getByRole("button", { name: SUBMIT_PROJECT_BTN_RE }).click();

    await expect(dialog).toBeHidden({ timeout: 15_000 });
    await expect(page.getByText("Small Image Test")).toBeVisible({
      timeout: 10_000,
    });

    const img = page.getByTestId("project-card").first().locator("img").first();
    const stored = await inspectStoredScreenshot(page, img);
    expect(stored.contentType).toBe("image/webp");
    expect(stored.naturalWidth).toBeGreaterThan(0);
    expect(stored.naturalHeight).toBeGreaterThan(0);
    expect(stored.naturalWidth).toBeLessThanOrEqual(MAX_IMAGE_DIMENSION);
    expect(stored.naturalHeight).toBeLessThanOrEqual(MAX_IMAGE_DIMENSION);
  } finally {
    await student?.cleanup();
  }
});

test("edit upload failure keeps the original screenshot on the card", async ({
  page,
}) => {
  const admin = createAdminClient();
  let student: AuthedStudent | undefined;

  try {
    student = await signInStudentWithCohort(page, admin);

    // Seed the project with a successful submit using the small fixture.
    await page.getByRole("button", { name: SUBMIT_PROJECT_TRIGGER_RE }).click();
    const submitDialog = page.getByRole("dialog");
    await submitDialog.getByLabel("Title").fill("Edit Failure Test");
    await submitDialog
      .getByLabel("Tagline")
      .fill("Will attempt a failing edit");
    await submitDialog
      .getByLabel("Project URL")
      .fill("https://edit-fail.example.com");
    await submitDialog
      .getByLabel("Screenshot")
      .setInputFiles(SMALL_SCREENSHOT_FIXTURE);
    await submitDialog
      .getByRole("button", { name: SUBMIT_PROJECT_BTN_RE })
      .click();
    await expect(submitDialog).toBeHidden({ timeout: 15_000 });
    await expect(page.getByText("Edit Failure Test")).toBeVisible({
      timeout: 10_000,
    });

    const img = page.getByTestId("project-card").first().locator("img").first();
    const originalSrc = await img.getAttribute("src");
    expect(originalSrc).not.toBeNull();

    // Intercept the next storage upload and force a 500 so the edit
    // cannot replace the screenshot.
    await page.route(SUPABASE_STORAGE_URL_RE, async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ message: "simulated storage failure" }),
        });
        return;
      }
      await route.continue();
    });

    await page.getByTestId("edit-project-trigger").click();
    const editDialog = page.getByRole("dialog");
    await editDialog
      .getByLabel("Screenshot (optional)")
      .setInputFiles(SCREENSHOT_FIXTURE);
    await editDialog.getByRole("button", { name: SAVE_CHANGES_BTN_RE }).click();

    // Regardless of whether the dialog surfaces an error or stays open,
    // the card's screenshot URL must not change after the failed upload.
    await expect(async () => {
      const current = await img.getAttribute("src");
      expect(current).toBe(originalSrc);
    }).toPass({ timeout: 10_000 });
  } finally {
    await student?.cleanup();
  }
});

test("signed-out visitor is redirected to /login from the header submit trigger", async ({
  page,
}) => {
  await page.goto("/");

  const trigger = page.getByRole("link", {
    name: SUBMIT_PROJECT_TRIGGER_RE,
  });
  await expect(trigger).toBeVisible();
  await expect(trigger).toHaveAttribute("href", "/login");

  await trigger.click();
  await expect(page).toHaveURL(LOGIN_URL_RE);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
