"use server";

import { requireAuth } from "@shared/api/supabase/require-auth";
import { revalidatePath } from "next/cache";

export interface DeleteCommentInput {
  commentId: string;
  projectId: string;
}

export interface DeleteCommentResult {
  error?: string;
  ok: boolean;
}

/**
 * Deletes a comment owned by the signed-in viewer. Cascades remove
 * the comment's replies and reactions via FKs declared in T2/T3.
 * RLS gates the DELETE, so a crafted request from another visitor
 * affects 0 rows.
 */
export async function deleteComment(
  input: DeleteCommentInput
): Promise<DeleteCommentResult> {
  if (!(input.commentId && input.projectId)) {
    return { ok: false, error: "Invalid input" };
  }

  const auth = await requireAuth("You must be signed in to delete a comment");
  if (!auth.ok) {
    return auth;
  }
  const { supabase } = auth;

  const { data, error } = await supabase
    .from("comments")
    .delete()
    .eq("id", input.commentId)
    .select("id");

  if (error) {
    return { ok: false, error: error.message };
  }
  if (!data || data.length === 0) {
    return {
      ok: false,
      error: "Comment not found or you don't have permission to delete it",
    };
  }

  revalidatePath(`/projects/${input.projectId}`);
  return { ok: true };
}
