"use server";

import { createClient } from "@shared/api/supabase/server.ts";
import { revalidatePath } from "next/cache";

export interface ToggleVoteResult {
  error?: string;
  ok: boolean;
  voted?: boolean;
}

/**
 * Toggles the signed-in viewer's vote on a project. If no vote exists,
 * insert; if one exists, delete. RLS gates both writes; the self-vote
 * trigger on insert blocks owner self-votes at the DB as defence-in-
 * depth against any UI bypass.
 */
export async function toggleVote(projectId: string): Promise<ToggleVoteResult> {
  if (!projectId || typeof projectId !== "string") {
    return { ok: false, error: "Invalid project id" };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return { ok: false, error: "You must be signed in to vote" };
  }

  const { data: existing, error: selectError } = await supabase
    .from("votes")
    .select("id")
    .eq("user_id", user.id)
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
    revalidatePath("/");
    return { ok: true, voted: false };
  }

  const { error: insertError } = await supabase
    .from("votes")
    .insert({ user_id: user.id, project_id: projectId });
  if (insertError) {
    return { ok: false, error: insertError.message };
  }
  revalidatePath("/");
  return { ok: true, voted: true };
}
