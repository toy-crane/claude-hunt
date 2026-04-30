import { expect, type Page, test } from "@playwright/test";
import { fetchMagicLink } from "./helpers/mailpit";
import { createAdminClient, uniqueTestEmail } from "./helpers/supabase-admin";

const EMAIL_LABEL_RE = /email/i;
const CONTINUE_BTN_RE = /continue/i;
const MAGIC_LINK_TEXT_RE = /magic link/i;
const COMMENT_PLACEHOLDER_RE = /의견을 남겨주세요/;
const SUBMIT_COMMENT_BTN_RE = /^등록$/;
const EDIT_MENU_RE = /^편집$/;
const DELETE_MENU_RE = /^삭제$/;
const CONFIRM_DELETE_BTN_RE = /^삭제$/;
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

  const { data: usersData } = await admin.auth.admin.listUsers();
  const userId = usersData.users.find((u) => u.email === email)?.id;
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

    // Open kebab on our own comment, then click "편집".
    await page.getByTestId("comment-kebab").first().click();
    await page.getByRole("menuitem", { name: EDIT_MENU_RE }).click();
    const editArea = page
      .getByTestId("edit-comment-inline")
      .locator("textarea");
    await editArea.fill("훨씬 더 멋진 프로젝트네요!");
    await page.getByRole("button", { name: SAVE_BTN_RE }).click();
    await expect(page.getByText("훨씬 더 멋진 프로젝트네요!")).toBeVisible();
    await expect(page.getByTestId("comment-edited-tag")).toBeVisible();

    // Add a reaction via the popover.
    await page.getByTestId("reaction-add-trigger").first().click();
    await page
      .getByTestId("reaction-popover-emoji")
      .filter({ hasText: "💡" })
      .click();
    await expect(
      page.getByTestId("reaction-chip").filter({ hasText: "💡" })
    ).toBeVisible({ timeout: 10_000 });

    // Delete the comment.
    await page.getByTestId("comment-kebab").first().click();
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
  // The form is replaced with a "로그인하고 의견 남기기" prompt.
  await expect(page.getByTestId("comment-form-anon-prompt")).toBeVisible();
  await expect(page.getByPlaceholder(COMMENT_PLACEHOLDER_RE)).toHaveCount(0);
});

test("project detail page exposes Open Graph metadata", async ({
  page,
  request,
}) => {
  const admin = createAdminClient();
  const { data: seeded } = await admin
    .from("projects")
    .select("id, title")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  if (!seeded?.id) {
    throw new Error("no seeded project found");
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

  // The opengraph-image route returns a PNG.
  const ogImageResponse = await request.get(
    `http://localhost:3000${url}/opengraph-image`
  );
  expect(ogImageResponse.status()).toBe(200);
  expect(ogImageResponse.headers()["content-type"]).toContain("image/");
});
