import { MAX_COMMENT_BODY } from "@entities/comment";
import { z } from "zod";

export const editCommentInputSchema = z.object({
  commentId: z.string().trim().min(1, "잘못된 댓글 ID 예요."),
  projectId: z.string().trim().min(1),
  body: z
    .string()
    .trim()
    .min(1, "내용을 입력해 주세요.")
    .max(MAX_COMMENT_BODY, `${MAX_COMMENT_BODY}자까지 작성할 수 있어요`),
});

export type EditCommentInput = z.infer<typeof editCommentInputSchema>;
