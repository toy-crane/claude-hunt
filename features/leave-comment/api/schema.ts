import { MAX_COMMENT_BODY } from "@entities/comment";
import { z } from "zod";

export const leaveCommentInputSchema = z.object({
  projectId: z.string().trim().min(1, "잘못된 프로젝트 ID 예요."),
  /** When set, this comment is a reply to the named top-level comment. */
  parentCommentId: z.string().trim().min(1).optional(),
  body: z
    .string()
    .trim()
    .min(1, "내용을 입력해 주세요.")
    .max(MAX_COMMENT_BODY, `${MAX_COMMENT_BODY}자까지 작성할 수 있어요`),
});

export type LeaveCommentInput = z.infer<typeof leaveCommentInputSchema>;
