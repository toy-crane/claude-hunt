import { expect, type Page, test } from "@playwright/test";
import { fetchMagicLink } from "./helpers/mailpit";
import { createAdminClient, uniqueTestEmail } from "./helpers/supabase-admin";

const EMAIL_LABEL_RE = /email/i;
const CONTINUE_BTN_RE = /continue/i;
const MAGIC_LINK_TEXT_RE = /magic link/i;
const WITHDRAW_LABEL = /^withdraw$/i;
const DELETE_ACCOUNT_BTN_RE = /^delete account$/i;
const CANCEL_LABEL = /^cancel$/i;
const TYPE_PROMPT_REGEX = /type .* to confirm/i;
const USER_MENU_RE = /account menu|sign out|log out/i;

interface PeerFixture {
  cleanup: () => Promise<void>;
  projectId: string;
  projectTitle: string;
  userId: string;
}

async function seedPeerProject(
  admin: ReturnType<typeof createAdminClient>
): Promise<PeerFixture> {
  const peerEmail = uniqueTestEmail();
  const { data: cohort, error: cohortError } = await admin
    .from("cohorts")
    .select("id")
    .eq("name", "LGE-1")
    .single();
  if (cohortError || !cohort) {
    throw new Error("LGE-1 seed missing — run supabase db reset first");
  }

  const { data: created, error: createError } =
    await admin.auth.admin.createUser({
      email: peerEmail,
      email_confirm: true,
    });
  if (createError || !created.user) {
    throw new Error(`Failed to create peer user: ${createError?.message}`);
  }
  const peerId = created.user.id;

  await admin
    .from("profiles")
    .update({ cohort_id: cohort.id, display_name: "Peer Student" })
    .eq("id", peerId);

  const projectTitle = `Peer Project ${Math.random().toString(36).slice(2, 7)}`;
  const { data: project, error: projectError } = await admin
    .from("projects")
    .insert({
      user_id: peerId,
      cohort_id: cohort.id,
      title: projectTitle,
      tagline: "A peer-seeded project for the withdraw-user e2e spec.",
      project_url: "https://peer.example.com",
      images: [{ path: `${peerId}/peer-seed.png` }],
    })
    .select("id")
    .single();
  if (projectError || !project) {
    throw new Error(`Failed to seed peer project: ${projectError?.message}`);
  }

  const cleanup = async () => {
    await admin.auth.admin.deleteUser(peerId).catch(() => {
      /* global teardown will sweep */
    });
  };

  return { userId: peerId, projectId: project.id, projectTitle, cleanup };
}

interface WithdrawFixture {
  email: string;
  ownProjectId: string;
  ownProjectTitle: string;
  userId: string;
}

/**
 * Signs in a fresh student via magic link, then seeds their own
 * project and a vote on the peer project using the admin client. This
 * avoids flaky UI-driven seeding (file uploads, optimistic vote
 * button) so the test focuses on the withdraw flow itself.
 */
async function signInAndSeedWithdrawStudent(
  page: Page,
  admin: ReturnType<typeof createAdminClient>,
  peer: PeerFixture
): Promise<WithdrawFixture> {
  const email = uniqueTestEmail();
  const { data: cohort } = await admin
    .from("cohorts")
    .select("id")
    .eq("name", "LGE-1")
    .single();
  if (!cohort) {
    throw new Error("LGE-1 seed missing");
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
    .update({ cohort_id: cohort.id, display_name: "Withdraw Student" })
    .eq("id", userId);

  const ownProjectTitle = `Withdraw App ${Math.random().toString(36).slice(2, 6)}`;
  const { data: ownProject, error: ownError } = await admin
    .from("projects")
    .insert({
      user_id: userId,
      cohort_id: cohort.id,
      title: ownProjectTitle,
      tagline: "Own project that should vanish on withdraw.",
      project_url: "https://withdraw-me.example.com",
      images: [{ path: `${userId}/withdraw-seed.png` }],
    })
    .select("id")
    .single();
  if (ownError || !ownProject) {
    throw new Error(`Failed to seed own project: ${ownError?.message}`);
  }

  // Cast a vote on the peer project.
  const { error: voteError } = await admin
    .from("votes")
    .insert({ user_id: userId, project_id: peer.projectId });
  if (voteError) {
    throw new Error(`Failed to seed vote: ${voteError.message}`);
  }

  return { email, userId, ownProjectId: ownProject.id, ownProjectTitle };
}

async function readPeerVoteCountViaAdmin(
  admin: ReturnType<typeof createAdminClient>,
  projectId: string
): Promise<number> {
  const { count, error } = await admin
    .from("votes")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);
  if (error) {
    throw new Error(`Failed to read vote count: ${error.message}`);
  }
  return count ?? 0;
}

test("withdraw cascade-deletes the account, screenshots, and votes", async ({
  page,
}) => {
  const admin = createAdminClient();
  const peer = await seedPeerProject(admin);
  let withdrawnUserId: string | undefined;

  try {
    const student = await signInAndSeedWithdrawStudent(page, admin, peer);
    withdrawnUserId = student.userId;

    const peerVotesBefore = await readPeerVoteCountViaAdmin(
      admin,
      peer.projectId
    );
    expect(peerVotesBefore).toBe(1);

    // Home renders both the user's own card and the peer card.
    await page.goto("/");
    await expect(
      page
        .getByTestId("project-card")
        .filter({ hasText: student.ownProjectTitle })
    ).toHaveCount(1, { timeout: 10_000 });

    // Open /settings and complete the withdraw flow.
    await page.goto("/settings");
    await page.getByRole("button", { name: WITHDRAW_LABEL }).click();
    await page.getByLabel(TYPE_PROMPT_REGEX).fill(student.email);
    await page.getByRole("button", { name: DELETE_ACCOUNT_BTN_RE }).click();

    // Land on the home page, signed out.
    await expect(page).toHaveURL("http://localhost:3000/", { timeout: 15_000 });
    await expect(page.getByRole("button", { name: USER_MENU_RE })).toHaveCount(
      0
    );

    // Withdrawn user's card is no longer rendered.
    await expect(
      page
        .getByTestId("project-card")
        .filter({ hasText: student.ownProjectTitle })
    ).toHaveCount(0, { timeout: 10_000 });

    // Backend: auth user and rows are gone.
    const { data: userLookup } = await admin.auth.admin.getUserById(
      student.userId
    );
    expect(userLookup.user).toBeNull();

    const { count: projectCount } = await admin
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("user_id", student.userId);
    expect(projectCount).toBe(0);

    const { count: voteCount } = await admin
      .from("votes")
      .select("id", { count: "exact", head: true })
      .eq("user_id", student.userId);
    expect(voteCount).toBe(0);

    // Peer's vote total dropped by exactly 1.
    const peerVotesAfter = await readPeerVoteCountViaAdmin(
      admin,
      peer.projectId
    );
    expect(peerVotesAfter).toBe(peerVotesBefore - 1);

    // /settings now redirects to /login?next=/settings.
    await page.goto("/settings");
    await expect(page).toHaveURL("http://localhost:3000/login?next=/settings");

    // The deleted email starts a brand-new OTP sign-up — no lingering
    // account, no "already exists" error.
    await page.goto("/login");
    await page.getByLabel(EMAIL_LABEL_RE).fill(student.email);
    await page.getByRole("button", { name: CONTINUE_BTN_RE }).click();
    await expect(page.getByText(MAGIC_LINK_TEXT_RE)).toBeVisible();

    // Capture the post-resurrection id so teardown cleans it up.
    const { data: resurrectedUsers } = await admin.auth.admin.listUsers();
    const resurrected = resurrectedUsers.users.find(
      (u) => u.email === student.email
    );
    if (resurrected) {
      withdrawnUserId = resurrected.id;
    }
  } finally {
    if (withdrawnUserId) {
      await admin.auth.admin.deleteUser(withdrawnUserId).catch(() => {
        /* swept by global teardown */
      });
    }
    await peer.cleanup();
  }
});

test("canceling the withdraw dialog preserves the user's data", async ({
  page,
}) => {
  const admin = createAdminClient();
  const peer = await seedPeerProject(admin);
  let withdrawnUserId: string | undefined;

  try {
    const student = await signInAndSeedWithdrawStudent(page, admin, peer);
    withdrawnUserId = student.userId;

    const peerVotesBefore = await readPeerVoteCountViaAdmin(
      admin,
      peer.projectId
    );

    // Open Withdraw dialog, type email, then Cancel.
    await page.goto("/settings");
    await page.getByRole("button", { name: WITHDRAW_LABEL }).click();
    await page.getByLabel(TYPE_PROMPT_REGEX).fill(student.email);
    await page.getByRole("button", { name: CANCEL_LABEL }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: WITHDRAW_LABEL })
    ).toBeVisible();

    // User's own card still on home, peer vote count unchanged.
    await page.goto("/");
    await expect(
      page
        .getByTestId("project-card")
        .filter({ hasText: student.ownProjectTitle })
    ).toHaveCount(1, { timeout: 10_000 });
    const peerVotesAfter = await readPeerVoteCountViaAdmin(
      admin,
      peer.projectId
    );
    expect(peerVotesAfter).toBe(peerVotesBefore);

    // Account still exists.
    const { data: stillThere } = await admin.auth.admin.getUserById(
      student.userId
    );
    expect(stillThere.user?.id).toBe(student.userId);
  } finally {
    if (withdrawnUserId) {
      await admin.auth.admin.deleteUser(withdrawnUserId).catch(() => {
        /* swept by global teardown */
      });
    }
    await peer.cleanup();
  }
});
