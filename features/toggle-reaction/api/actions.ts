"use server";

import { requireAuth } from "@shared/api/supabase/require-auth";
import { getZodErrorMessage } from "@shared/lib/validation";
import { revalidatePath } from "next/cache";
import { type ToggleReactionInput, toggleReactionInputSchema } from "./schema";

export interface ToggleReactionResult {
  error?: string;
  ok: boolean;
  /** "added" or "removed" — useful for callers driving optimistic UI. */
  state?: "added" | "removed";
}

/**
 * Adds the reaction if the (comment, viewer, emoji) row is missing,
 * removes it otherwise. The DB-level CHECK and UNIQUE constraints
 * reject non-allowlisted emojis or duplicate keys regardless of
 * what the client sends.
 */
export async function toggleReaction(
  raw: ToggleReactionInput
): Promise<ToggleReactionResult> {
  const parsed = toggleReactionInputSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: getZodErrorMessage(parsed.error, "Invalid input"),
    };
  }
  const input = parsed.data;

  const auth = await requireAuth("You must be signed in to react");
  if (!auth.ok) {
    return auth;
  }
  const { supabase, user } = auth;

  const { data: existing } = await supabase
    .from("comment_reactions")
    .select("id")
    .eq("comment_id", input.commentId)
    .eq("user_id", user.id)
    .eq("emoji", input.emoji)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase
      .from("comment_reactions")
      .delete()
      .eq("id", existing.id);
    if (error) {
      return { ok: false, error: error.message };
    }
    revalidatePath(`/projects/${input.projectId}`);
    return { ok: true, state: "removed" };
  }

  const { error } = await supabase.from("comment_reactions").insert({
    comment_id: input.commentId,
    user_id: user.id,
    emoji: input.emoji,
  });
  if (error) {
    return { ok: false, error: error.message };
  }
  revalidatePath(`/projects/${input.projectId}`);
  return { ok: true, state: "added" };
}
