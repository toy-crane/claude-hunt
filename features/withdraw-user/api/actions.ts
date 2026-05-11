"use server";

import type { ProjectImage } from "@entities/project";
import { createAdminClient } from "@shared/api/supabase/admin";
import { requireAuth } from "@shared/api/supabase/require-auth";
import { CACHE_TAGS } from "@shared/config/cache-tags";
import { SCREENSHOT_BUCKET } from "@shared/config/storage";
import { revalidatePath, updateTag } from "next/cache";

export type WithdrawAccountResult = { ok: true } | { error: string; ok: false };

/**
 * Ordering: screenshots first, then `auth.admin.deleteUser` (blocked
 * while the user still owns storage objects), then signOut. The auth
 * delete cascades through `profiles → projects → votes` FKs. `user.id`
 * is always read from the server session — never from arguments.
 */
export async function withdrawAccount(): Promise<WithdrawAccountResult> {
  const auth = await requireAuth("You must be signed in to withdraw");
  if (!auth.ok) {
    return auth;
  }
  const { supabase, user } = auth;

  const { data: projects, error: listError } = await supabase
    .from("projects")
    .select("images")
    .eq("user_id", user.id);

  if (listError) {
    return { ok: false, error: listError.message };
  }

  const paths = new Set<string>();
  for (const row of projects ?? []) {
    if (Array.isArray(row.images)) {
      for (const img of row.images as unknown as ProjectImage[]) {
        if (img && typeof img.path === "string") {
          paths.add(img.path);
        }
      }
    }
  }

  if (paths.size > 0) {
    await supabase.storage.from(SCREENSHOT_BUCKET).remove([...paths]);
  }

  const admin = createAdminClient();
  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    return { ok: false, error: deleteError.message };
  }

  await supabase.auth.signOut();
  // Cascading delete removes the user's projects and votes; the cached
  // grid must reflect that on next visit.
  updateTag(CACHE_TAGS.PROJECTS_GRID);
  revalidatePath("/settings");

  return { ok: true };
}
