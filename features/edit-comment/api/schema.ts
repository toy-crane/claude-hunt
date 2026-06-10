import { MAX_COMMENT_BODY } from "@entities/comment";
import { z } from "zod";

export const editCommentInputSchema = z.object({
  commentId: z
    .string()
    .trim()
    .min(1, "댓글을 수정하지 못했어요. 새로고침한 뒤 다시 시도해 주세요."),
  projectId: z.string().trim().min(1),
  body: z
    .string()
    .trim()
    .min(1, "내용을 입력해 주세요.")
    .max(MAX_COMMENT_BODY, `${MAX_COMMENT_BODY}자까지 쓸 수 있어요.`),
});

export type EditCommentInput = z.infer<typeof editCommentInputSchema>;
