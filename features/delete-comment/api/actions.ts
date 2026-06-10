"use server";

import { requireAuth } from "@shared/api/supabase/require-auth";
import { refresh } from "next/cache";

export interface DeleteCommentInput {
  commentId: string;
  projectId: string;
}

export interface DeleteCommentResult {
  error?: string;
  ok: boolean;
}

/**
 * Deletes a comment owned by the signed-in viewer. The cascade FKs
 * on parent_comment_id and comment_reactions take care of replies +
 * reactions. RLS gates the DELETE, so a crafted request from another
 * visitor affects 0 rows.
 */
export async function deleteComment(
  input: DeleteCommentInput
): Promise<DeleteCommentResult> {
  if (!(input.commentId && input.projectId)) {
    return {
      ok: false,
      error: "댓글을 삭제하지 못했어요. 새로고침한 뒤 다시 시도해 주세요.",
    };
  }

  const auth = await requireAuth("로그인이 풀렸어요. 다시 로그인해 주세요.");
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
      error:
        "댓글을 삭제하지 못했어요. 이미 삭제됐거나 내가 쓴 댓글이 아니에요.",
    };
  }

  refresh();
  return { ok: true };
}
