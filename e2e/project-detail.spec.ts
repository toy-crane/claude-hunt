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
const COMMENT_PLACEHOLDER_RE = /댓글을 남겨 주세요/;
const SUBMIT_COMMENT_BTN_RE = /^등록$/;
const EDIT_MENU_RE = /^수정$/;
const DELETE_MENU_RE = /^삭제$/;
const CONFIRM_DELETE_BTN_RE = /^삭제하기$/;
const SAVE_BTN_RE = /^저장$/;

interface AuthedStudent {
  cleanup: () => Promise<void>;
  userId: string;
}

async function signInStudent(
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
  await page.waitForLoadState("networkidle");

  const userId = await findUserIdByEmail(admin, email);
  if (!userId) {
    throw new Error("Could not resolve user id after magic-link sign-in");
  }
  await admin
    .from("profiles")
    .update({ cohort_id: cohort.id, display_name: "E2E Reviewer" })
    .eq("id", userId);

  const cleanup = async () => {
    await admin.auth.admin.deleteUser(userId).catch(() => undefined);
  };

  return { userId, cleanup };
}

async function seedProject(
  admin: ReturnType<typeof createAdminClient>,
  ownerId: string
): Promise<{ projectId: string; cleanup: () => Promise<void> }> {
  const { data: cohort } = await admin
    .from("cohorts")
    .select("id")
    .eq("name", "LGE-1")
    .single();
  if (!cohort) {
    throw new Error("LGE-1 seed missing");
  }
  const { data: created, error } = await admin
    .from("projects")
    .insert({
      user_id: ownerId,
      cohort_id: cohort.id,
      title: "E2E Detail Project",
      tagline: "for end-to-end detail-page coverage",
      project_url: "https://example.com",
      images: [{ path: "seed/x.webp" }],
    })
    .select("id")
    .single();
  if (error || !created?.id) {
    throw new Error(`failed to seed project: ${error?.message}`);
  }
  const cleanup = async () => {
    await admin
      .from("projects")
      .delete()
      .eq("id", created.id)
      .then(
        () => undefined,
        () => undefined
      );
  };
  return { projectId: created.id, cleanup };
}

test("authenticated student leaves, edits, reacts to, and deletes a comment", async ({
  page,
}) => {
  const admin = createAdminClient();
  const { userId, cleanup: cleanupAuth } = await signInStudent(page, admin);

  // Seed a project owned by a *different* user so the viewer is just a
  // commenter (no owner controls in the way of comment assertions).
  // Use one of the seeded LGE-1 projects.
  const { data: seededProject } = await admin
    .from("projects")
    .select("id")
    .neq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  let cleanupProject: () => Promise<void> = async () => undefined;
  let projectId = seededProject?.id;
  if (!projectId) {
    // Fall back to creating one owned by us if no other seeded project exists.
    const seeded = await seedProject(admin, userId);
    projectId = seeded.projectId;
    cleanupProject = seeded.cleanup;
  }

  try {
    await page.goto(`/projects/${projectId}`);
    await expect(page).toHaveURL(new RegExp(`/projects/${projectId}$`));
    // Detail page should render the title heading.
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // Post a top-level comment.
    const textarea = page.getByPlaceholder(COMMENT_PLACEHOLDER_RE).first();
    await textarea.fill("멋진 프로젝트네요!");
    await page
      .getByRole("button", { name: SUBMIT_COMMENT_BTN_RE })
      .first()
      .click();
    await expect(page.getByText("멋진 프로젝트네요!")).toBeVisible({
      timeout: 10_000,
    });

    // Open kebab on our own comment, then click "수정". Scope to the
    // specific comment by its text so parallel tests on the same project
    // can't pick a stranger's comment.
    const ownComment = page
      .getByTestId("comment-item")
      .filter({ hasText: "멋진 프로젝트네요!" })
      .first();
    await ownComment.getByTestId("comment-kebab").click();
    await page.getByRole("menuitem", { name: EDIT_MENU_RE }).click();
    // Radix's DropdownMenuItem onSelect keeps the menu open via
    // `preventDefault`; press Escape so its overlay doesn't intercept
    // the save click.
    await page.keyboard.press("Escape");
    const editForm = page.getByTestId("edit-comment-inline");
    await expect(editForm).toBeVisible();
    await editForm.locator("textarea").fill("훨씬 더 멋진 프로젝트네요!");
    await editForm.getByRole("button", { name: SAVE_BTN_RE }).click();
    await expect(
      page.getByText("훨씬 더 멋진 프로젝트네요!").first()
    ).toBeVisible();
    await expect(ownComment.getByTestId("comment-edited-tag")).toBeVisible();

    // Add a reaction via the popover (scoped to our own comment).
    await ownComment.getByTestId("reaction-add-trigger").click();
    await page
      .getByTestId("reaction-popover-emoji")
      .filter({ hasText: "💡" })
      .click();
    await expect(
      ownComment.getByTestId("reaction-chip").filter({ hasText: "💡" })
    ).toBeVisible({ timeout: 10_000 });

    // Delete the comment.
    await ownComment.getByTestId("comment-kebab").click();
    await page.getByRole("menuitem", { name: DELETE_MENU_RE }).click();
    await page.getByRole("button", { name: CONFIRM_DELETE_BTN_RE }).click();
    await expect(page.getByText("훨씬 더 멋진 프로젝트네요!")).toHaveCount(0, {
      timeout: 10_000,
    });
  } finally {
    await cleanupProject();
    await cleanupAuth();
  }
});

test("anonymous visitor sees comments but the form is replaced with a login prompt", async ({
  page,
}) => {
  const admin = createAdminClient();
  const { data: seeded } = await admin
    .from("projects")
    .select("id")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  if (!seeded?.id) {
    throw new Error("no seeded project found");
  }
  await page.goto(`/projects/${seeded.id}`);
  await expect(page).toHaveURL(new RegExp(`/projects/${seeded.id}$`));
  // The form is replaced with a "로그인하고 댓글 남기기" prompt.
  await expect(page.getByTestId("comment-form-anon-prompt")).toBeVisible();
  await expect(page.getByPlaceholder(COMMENT_PLACEHOLDER_RE)).toHaveCount(0);
});

test("project detail page exposes Open Graph metadata", async ({
  page,
  request,
}) => {
  // First-compile of /projects/[id]/opengraph-image under turbopack can
  // take ~10-15 s in dev, so leave room beyond the 30 s default.
  test.setTimeout(90_000);
  const admin = createAdminClient();
  // Pin to a specific seed project so the test doesn't race against
  // student-submitted projects from other parallel specs.
  const seedId = "00000000-0000-0000-0000-0000000000a1";
  const { data: seeded } = await admin
    .from("projects")
    .select("id, title")
    .eq("id", seedId)
    .single();
  if (!seeded?.id) {
    throw new Error("seed project missing — run supabase db reset first");
  }
  const url = `/projects/${seeded.id}`;
  await page.goto(url);

  const ogTitle = await page
    .locator('meta[property="og:title"]')
    .getAttribute("content");
  expect(ogTitle).toContain(seeded.title ?? "");

  const ogUrl = await page
    .locator('meta[property="og:url"]')
    .getAttribute("content");
  expect(ogUrl).toContain(url);

  // The opengraph-image route returns a PNG. First-compile under
  // turbopack can take several seconds in dev, so allow a generous
  // request timeout.
  const ogImageResponse = await request.get(
    `http://localhost:3000${url}/opengraph-image`,
    { timeout: 60_000 }
  );
  expect(ogImageResponse.status()).toBe(200);
  expect(ogImageResponse.headers()["content-type"]).toContain("image/");
});
