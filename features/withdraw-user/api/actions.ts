"use server";

import { createAdminClient } from "@shared/api/supabase/admin.ts";
import { createClient } from "@shared/api/supabase/server.ts";
import { revalidatePath } from "next/cache";

export type WithdrawAccountResult = { ok: true } | { error: string; ok: false };

/**
 * Server action: permanently deletes the signed-in user's account.
 *
 * Security: `user.id` is always sourced from the authenticated session
 * on the server — never from arguments — so no parameter, header, or
 * body value can cause another user's account to be deleted.
 *
 * Ordering: screenshots are removed from storage first because
 * `auth.admin.deleteUser` is blocked while the user still owns any
 * storage objects. The auth delete then cascades through the existing
 * `profiles → projects → votes` foreign keys. The user-session is
 * cleared last so the browser reflects signed-out state immediately.
 */
export async function withdrawAccount(): Promise<WithdrawAccountResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { ok: false, error: "You must be signed in to withdraw" };
  }

  const { data: projects, error: listError } = await supabase
    .from("projects")
    .select("screenshot_path")
    .eq("user_id", user.id);

  if (listError) {
    return { ok: false, error: listError.message };
  }

  const paths = (projects ?? [])
    .map((row) => row.screenshot_path)
    .filter((path): path is string => Boolean(path));

  if (paths.length > 0) {
    await supabase.storage.from("project-screenshots").remove(paths);
  }

  const admin = createAdminClient();
  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    return { ok: false, error: deleteError.message };
  }

  await supabase.auth.signOut();
  revalidatePath("/");
  revalidatePath("/settings");

  return { ok: true };
}
