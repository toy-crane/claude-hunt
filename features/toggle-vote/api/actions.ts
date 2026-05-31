"use server";

import { requireAuth } from "@shared/api/supabase/require-auth";
import { CACHE_TAGS } from "@shared/config/cache-tags";
import { revalidatePath, updateTag } from "next/cache";

export interface ToggleVoteResult {
  error?: string;
  ok: boolean;
  voted?: boolean;
}

/**
 * RLS gates both writes; the self-vote trigger on insert blocks owner
 * self-votes at the DB as defence-in-depth against any UI bypass.
 */
export async function toggleVote(projectId: string): Promise<ToggleVoteResult> {
  if (!projectId || typeof projectId !== "string") {
    return { ok: false, error: "Invalid project id" };
  }

  const auth = await requireAuth("You must be signed in to vote");
  if (!auth.ok) {
    return auth;
  }
  const { supabase, userId } = auth;

  const { data: existing, error: selectError } = await supabase
    .from("votes")
    .select("id")
    .eq("user_id", userId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (selectError) {
    return { ok: false, error: selectError.message };
  }

  if (existing) {
    const { error: deleteError } = await supabase
      .from("votes")
      .delete()
      .eq("id", existing.id);
    if (deleteError) {
      return { ok: false, error: deleteError.message };
    }
    updateTag(CACHE_TAGS.PROJECTS_GRID);
    revalidatePath(`/projects/${projectId}`);
    return { ok: true, voted: false };
  }

  const { error: insertError } = await supabase
    .from("votes")
    .insert({ user_id: userId, project_id: projectId });
  if (insertError) {
    return { ok: false, error: insertError.message };
  }
  updateTag(CACHE_TAGS.PROJECTS_GRID);
  revalidatePath(`/projects/${projectId}`);
  return { ok: true, voted: true };
}
