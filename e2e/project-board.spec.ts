import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, type Page, test } from "@playwright/test";
import { fetchMagicLink } from "./helpers/mailpit";
import {
  createAdminClient,
  findUserIdByEmail,
  uniqueTestEmail,
} from "./helpers/supabase-admin";

const EMAIL_LABEL_RE = /이메일/;
const CONTINUE_BTN_RE = /계속/;
const MAGIC_LINK_TEXT_RE = /매직 링크/;
const SUBMIT_PROJECT_BTN_RE = /프로젝트 제출/;
const SUBMIT_PROJECT_TRIGGER_RE = /프로젝트 제출/;
const PROJECT_SUBMITTED_TOAST_RE = /프로젝트를 제출했어요/;
const SAVE_CHANGES_BTN_RE = /저장/;
const LOGIN_URL_RE = /\/login$/;
const SUPABASE_STORAGE_URL_RE =
  /\/storage\/v1\/object\/(?:public\/)?project-screenshots\//;
const PROJECT_LIST_URL_RE = /\/rest\/v1\/projects_with_vote_count/;
const ALL_COHORTS_RE = /모든 클래스/;
const LGE_1_LABEL_RE = /LG전자 1기/;
const VOTE_BTN_RE = /추천/;
const DIGITS_RE = /\d+/;

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

  const userId = await findUserIdByEmail(admin, email);
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

const PROJECT_NEW_URL_RE = /\/projects\/new$/;
const PROJECT_DETAIL_URL_RE = /\/projects\/[\da-f-]{36}$/;
const PROJECT_EDIT_URL_RE = /\/projects\/[\da-f-]{36}\/edit$/;

async function fillSubmitForm(
  page: Page,
  fields: {
    projectUrl: string;
    screenshotFixture: string;
    tagline: string;
    title: string;
  }
): Promise<void> {
  await page.getByLabel("제목").fill(fields.title);
  await page.getByLabel("한 줄 소개").fill(fields.tagline);
  await page.getByLabel("프로젝트 URL").fill(fields.projectUrl);
  await page
    .locator('[data-testid="image-slots"] input[type="file"]')
    .setInputFiles(fields.screenshotFixture);
}

async function submitProjectViaPage(
  page: Page,
  fields: {
    projectUrl: string;
    screenshotFixture: string;
    tagline: string;
    title: string;
  }
): Promise<void> {
  await page.getByTestId("submit-project-trigger").click();
  await page.waitForURL(PROJECT_NEW_URL_RE);
  await fillSubmitForm(page, fields);
  await page.getByRole("button", { name: SUBMIT_PROJECT_BTN_RE }).click();
  await page.waitForURL(PROJECT_DETAIL_URL_RE, { timeout: 30_000 });
}

async function openEditFromDetail(page: Page): Promise<void> {
  await page
    .getByTestId("project-detail-owner-controls")
    .getByRole("link", { name: "편집" })
    .click();
  await page.waitForURL(PROJECT_EDIT_URL_RE);
}

async function saveEditPage(page: Page): Promise<void> {
  await page.getByRole("button", { name: SAVE_CHANGES_BTN_RE }).click();
  await page.waitForURL(PROJECT_DETAIL_URL_RE, { timeout: 30_000 });
}

async function deleteProjectFromDetail(page: Page): Promise<void> {
  const owner = page.getByTestId("project-detail-owner-controls");
  await owner.getByRole("button", { name: "삭제" }).click();
  const dialog = page.getByRole("alertdialog");
  await dialog.getByRole("button", { name: "삭제하기" }).click();
  await page.waitForURL("http://localhost:3000/", { timeout: 30_000 });
}

/**
 * The visible `<img>` goes through Next's `_next/image` optimizer, which
 * re-encodes based on the request's Accept header. To verify the stored
 * file's content-type/size or to assert that an old screenshot is gone,
 * unwrap the optimizer URL to the underlying bucket URL.
 */
function bucketUrlFromImgSrc(src: string): string {
  try {
    const u = new URL(src, "http://localhost:3000");
    const inner = u.searchParams.get("url");
    return inner ? decodeURIComponent(inner) : src;
  } catch {
    return src;
  }
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

  const response = await page.request.fetch(bucketUrlFromImgSrc(src), {
    method: "HEAD",
  });
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
    await submitProjectViaPage(page, {
      title: "E2E Test App",
      tagline: "Built during the project-board e2e spec",
      projectUrl: "https://e2e-test.example.com",
      screenshotFixture: SCREENSHOT_FIXTURE,
    });
    await expect(
      page.getByText(PROJECT_SUBMITTED_TOAST_RE).first()
    ).toBeVisible({ timeout: 10_000 });

    await page.goto("/projects");
    await expect(page.getByText("E2E Test App").first()).toBeVisible({
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
    await submitCard.getByRole("link").first().click();
    await page.waitForURL(PROJECT_DETAIL_URL_RE);
    await openEditFromDetail(page);
    await page.getByLabel("한 줄 소개").fill("Updated during the e2e spec");
    // Replace the primary image: drop the existing one, then upload anew.
    await page
      .getByTestId("image-slot-primary-filled")
      .getByRole("button", { name: "대표 이미지 제거" })
      .click();
    await page
      .locator('[data-testid="image-slots"] input[type="file"]')
      .setInputFiles(SCREENSHOT_FIXTURE);
    await saveEditPage(page);

    await page.goto("/projects");
    await expect(
      page
        .getByTestId("project-card")
        .getByText("Updated during the e2e spec")
        .first()
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
      const response = await page.request.fetch(
        bucketUrlFromImgSrc(submittedSrc),
        { method: "HEAD" }
      );
      expect(response.status()).toBeGreaterThanOrEqual(400);
    }).toPass({ timeout: 10_000 });

    const editedSrc = await editedImg.getAttribute("src");
    if (!editedSrc) {
      throw new Error("Expected editedSrc to be set");
    }

    // Metadata-only edit: change the title without touching the file
    // input. The stored image must be untouched and still serve.
    await page
      .getByTestId("project-card")
      .first()
      .getByRole("link")
      .first()
      .click();
    await page.waitForURL(PROJECT_DETAIL_URL_RE);
    await openEditFromDetail(page);
    await page.getByLabel("제목").fill("E2E Test App (renamed)");
    await saveEditPage(page);

    await page.goto("/projects");
    await expect(
      page
        .getByTestId("project-card")
        .getByText("E2E Test App (renamed)")
        .first()
    ).toBeVisible({ timeout: 15_000 });

    const afterMetaImg = page
      .getByTestId("project-card")
      .first()
      .locator("img")
      .first();
    await expect(afterMetaImg).toHaveAttribute("src", editedSrc);
    const stillServing = await page.request.fetch(
      bucketUrlFromImgSrc(editedSrc),
      { method: "HEAD" }
    );
    expect(stillServing.status()).toBe(200);

    // Delete the project from the detail page's owner controls.
    await page
      .getByTestId("project-card")
      .first()
      .getByRole("link")
      .first()
      .click();
    await page.waitForURL(PROJECT_DETAIL_URL_RE);
    await deleteProjectFromDetail(page);
    // The board lives at /projects now; the home spotlight never lists the
    // full grid, so assert the deleted project is gone from the board.
    await page.goto("/projects");
    await expect(page.getByText("E2E Test App (renamed)")).not.toBeVisible({
      timeout: 10_000,
    });

    // The deleted project's screenshot must stop serving as well.
    await expect(async () => {
      const response = await page.request.fetch(
        bucketUrlFromImgSrc(editedSrc),
        {
          method: "HEAD",
        }
      );
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

    await submitProjectViaPage(page, {
      title: "Small Image Test",
      tagline: "An 800x600 source",
      projectUrl: "https://small.example.com",
      screenshotFixture: SMALL_SCREENSHOT_FIXTURE,
    });

    await page.goto("/projects");
    await expect(page.getByText("Small Image Test").first()).toBeVisible({
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
    await submitProjectViaPage(page, {
      title: "Edit Failure Test",
      tagline: "Will attempt a failing edit",
      projectUrl: "https://edit-fail.example.com",
      screenshotFixture: SMALL_SCREENSHOT_FIXTURE,
    });

    await page.goto("/projects");
    await expect(page.getByText("Edit Failure Test").first()).toBeVisible({
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

    await page
      .getByTestId("project-card")
      .first()
      .getByRole("link")
      .first()
      .click();
    await page.waitForURL(PROJECT_DETAIL_URL_RE);
    await openEditFromDetail(page);
    // Replace the primary image to trigger an upload that will fail.
    await page
      .getByTestId("image-slot-primary-filled")
      .getByRole("button", { name: "대표 이미지 제거" })
      .click();
    await page
      .locator('[data-testid="image-slots"] input[type="file"]')
      .setInputFiles(SCREENSHOT_FIXTURE);
    await page.getByRole("button", { name: SAVE_CHANGES_BTN_RE }).click();

    // The edit page should stay (upload failure surfaces a field error)
    // and the original card screenshot URL must not change.
    await page.goto("/projects");
    await expect(async () => {
      const current = await img.getAttribute("src");
      expect(current).toBe(originalSrc);
    }).toPass({ timeout: 10_000 });
  } finally {
    await student?.cleanup();
  }
});

test("switching cohorts fires no project-list network requests after initial load", async ({
  page,
}) => {
  const requestsAfterReady: string[] = [];
  let ready = false;
  page.on("request", (req) => {
    if (ready && PROJECT_LIST_URL_RE.test(req.url())) {
      requestsAfterReady.push(req.url());
    }
  });

  await page.goto("/projects");
  const chips = page.getByTestId("cohort-chips");
  await expect(chips).toBeVisible();
  ready = true;

  // Click the first non-"All" chip (index 0 is "모든 클래스"), then back to All.
  await chips.getByRole("button").nth(1).click();
  await chips.getByRole("button", { name: ALL_COHORTS_RE }).click();

  expect(requestsAfterReady).toEqual([]);
});

test("deep-linked cohort URL renders the filtered grid on first paint", async ({
  page,
}) => {
  const admin = createAdminClient();
  const { data: cohort } = await admin
    .from("cohorts")
    .select("id, label")
    .eq("name", "LGE-1")
    .single();
  if (!cohort) {
    throw new Error("LGE-1 seed missing — run supabase db reset first");
  }

  await page.goto(`/projects?cohort=${cohort.id}`);
  const chips = page.getByTestId("cohort-chips");
  await expect(
    chips.getByRole("button", { name: new RegExp(cohort.label), pressed: true })
  ).toBeVisible();
});

test("voted project keeps its count and indicator across cohort filter toggles", async ({
  page,
}) => {
  const admin = createAdminClient();
  let student: AuthedStudent | undefined;

  try {
    // Vote on a seeded project (the student is in LGE-1, so Paint Studio
    // — also LGE-1 — is reachable from the LG전자 1기 cohort filter).
    // Owners can't vote on their own projects, so we deliberately pick
    // someone else's project to make the vote button available.
    student = await signInStudentWithCohort(page, admin);

    await page.goto("/projects");
    const card = page
      .getByTestId("project-card")
      .filter({ hasText: "Paint Studio" })
      .first();
    const voteBtn = card.getByRole("button", { name: VOTE_BTN_RE });
    const before = Number((await voteBtn.textContent())?.match(DIGITS_RE)?.[0]);
    await voteBtn.click();
    await expect(voteBtn).toHaveAttribute("aria-pressed", "true");

    const chips = page.getByTestId("cohort-chips");
    await chips.getByRole("button", { name: ALL_COHORTS_RE }).click();
    await chips.getByRole("button", { name: LGE_1_LABEL_RE }).click();

    const afterCard = page
      .getByTestId("project-card")
      .filter({ hasText: "Paint Studio" })
      .first();
    const afterBtn = afterCard.getByRole("button", { name: VOTE_BTN_RE });
    await expect(afterBtn).toHaveAttribute("aria-pressed", "true");
    const after = Number((await afterBtn.textContent())?.match(DIGITS_RE)?.[0]);
    expect(after).toBe(before + 1);
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
