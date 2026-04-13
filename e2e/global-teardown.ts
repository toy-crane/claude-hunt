import {
  createAdminClient,
  E2E_EMAIL_DOMAIN,
  E2E_EMAIL_PREFIX,
} from "./helpers/supabase-admin.ts";

export default async function globalTeardown() {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 200 });
  if (error) {
    console.warn("[e2e teardown] listUsers failed:", error.message);
    return;
  }
  const leftovers = data.users.filter(
    (u) =>
      u.email?.startsWith(E2E_EMAIL_PREFIX) &&
      u.email?.endsWith(`@${E2E_EMAIL_DOMAIN}`)
  );
  await Promise.all(
    leftovers.map((u) =>
      admin.auth.admin
        .deleteUser(u.id)
        .catch((err) =>
          console.warn(`[e2e teardown] delete ${u.email} failed:`, err.message)
        )
    )
  );
  if (leftovers.length > 0) {
    console.log(
      `[e2e teardown] cleaned up ${leftovers.length} leaked test user(s)`
    );
  }
}
