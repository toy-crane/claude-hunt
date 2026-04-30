import {
  createAdminClient,
  E2E_EMAIL_DOMAIN,
  E2E_EMAIL_PREFIX,
} from "./helpers/supabase-admin";

export default async function globalTeardown() {
  const admin = createAdminClient();
  // Sweep leftover e2e users via the public.profiles mirror — admin
  // listUsers() can 500 in older bundled GoTrue (NULL confirmation_token
  // scan), and deleting via auth.admin still works given the user id.
  const { data: profiles, error } = await admin
    .from("profiles")
    .select("id, email")
    .like("email", `${E2E_EMAIL_PREFIX}%@${E2E_EMAIL_DOMAIN}`);
  if (error) {
    console.warn("[e2e teardown] profile sweep failed:", error.message);
    return;
  }
  const leftovers = profiles ?? [];
  await Promise.all(
    leftovers.map((p) =>
      admin.auth.admin
        .deleteUser(p.id)
        .catch((err) =>
          console.warn(`[e2e teardown] delete ${p.email} failed:`, err.message)
        )
    )
  );
  if (leftovers.length > 0) {
    console.log(
      `[e2e teardown] cleaned up ${leftovers.length} leaked test user(s)`
    );
  }
}
