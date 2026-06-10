"use server";

import { requireAuth } from "@shared/api/supabase/require-auth";
import { getZodErrorMessage } from "@shared/lib/validation";
import { refresh } from "next/cache";
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
      error: getZodErrorMessage(
        parsed.error,
        "댓글을 수정하지 못했어요. 입력한 내용을 확인해 주세요."
      ),
    };
  }
  const input = parsed.data;

  const auth = await requireAuth("로그인이 풀렸어요. 다시 로그인해 주세요.");
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
      error:
        "댓글을 수정하지 못했어요. 이미 삭제됐거나 내가 쓴 댓글이 아니에요.",
    };
  }

  refresh();
  return { ok: true };
}
