"use server";

import { requireAuth } from "@shared/api/supabase/require-auth";
import { getZodErrorMessage } from "@shared/lib/validation";
import { revalidatePath } from "next/cache";
import { type LeaveCommentInput, leaveCommentInputSchema } from "./schema";

export interface LeaveCommentResult {
  commentId?: string;
  error?: string;
  ok: boolean;
}

/**
 * Inserts a comment for the signed-in viewer. Top-level when
 * `parentCommentId` is omitted; a reply otherwise. The DB-level
 * depth-1 trigger rejects reply-to-reply attempts.
 */
export async function leaveComment(
  raw: LeaveCommentInput
): Promise<LeaveCommentResult> {
  const parsed = leaveCommentInputSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: getZodErrorMessage(parsed.error, "Invalid input"),
    };
  }
  const input = parsed.data;

  const auth = await requireAuth("You must be signed in to leave a comment");
  if (!auth.ok) {
    return auth;
  }
  const { supabase, user } = auth;

  const { data: inserted, error } = await supabase
    .from("comments")
    .insert({
      project_id: input.projectId,
      user_id: user.id,
      parent_comment_id: input.parentCommentId ?? null,
      body: input.body,
    })
    .select("id")
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath(`/projects/${input.projectId}`);
  return { ok: true, commentId: inserted?.id };
}
