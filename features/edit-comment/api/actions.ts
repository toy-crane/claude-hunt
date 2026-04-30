"use server";

import { requireAuth } from "@shared/api/supabase/require-auth";
import { getZodErrorMessage } from "@shared/lib/validation";
import { revalidatePath } from "next/cache";
import { type EditCommentInput, editCommentInputSchema } from "./schema";

export interface EditCommentResult {
  error?: string;
  ok: boolean;
}

/**
 * Updates a comment's body. RLS gates the UPDATE to the author, so a
 * crafted request from another visitor returns zero rows. The
 * moddatetime trigger on `comments` advances `updated_at`, which
 * the UI uses to surface the "수정됨" indicator.
 */
export async function editComment(
  raw: EditCommentInput
): Promise<EditCommentResult> {
  const parsed = editCommentInputSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: getZodErrorMessage(parsed.error, "Invalid input"),
    };
  }
  const input = parsed.data;

  const auth = await requireAuth("You must be signed in to edit a comment");
  if (!auth.ok) {
    return auth;
  }
  const { supabase } = auth;

  const { data, error } = await supabase
    .from("comments")
    .update({ body: input.body })
    .eq("id", input.commentId)
    .select("id");

  if (error) {
    return { ok: false, error: error.message };
  }
  if (!data || data.length === 0) {
    return {
      ok: false,
      error: "Comment not found or you don't have permission to edit it",
    };
  }

  revalidatePath(`/projects/${input.projectId}`);
  return { ok: true };
}
