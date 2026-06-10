"use server";

import { requireAuth } from "@shared/api/supabase/require-auth";
import { getZodErrorMessage } from "@shared/lib/validation";
import { refresh } from "next/cache";
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
      error: getZodErrorMessage(
        parsed.error,
        "반응을 저장하지 못했어요. 잠시 후 다시 시도해 주세요."
      ),
    };
  }
  const input = parsed.data;

  const auth = await requireAuth("로그인 후 반응을 남길 수 있어요.");
  if (!auth.ok) {
    return auth;
  }
  const { supabase, userId } = auth;

  const { data: existing } = await supabase
    .from("comment_reactions")
    .select("id")
    .eq("comment_id", input.commentId)
    .eq("user_id", userId)
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
    refresh();
    return { ok: true, state: "removed" };
  }

  const { error } = await supabase.from("comment_reactions").insert({
    comment_id: input.commentId,
    user_id: userId,
    emoji: input.emoji,
  });
  if (error) {
    return { ok: false, error: error.message };
  }
  refresh();
  return { ok: true, state: "added" };
}
