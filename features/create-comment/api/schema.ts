import { MAX_COMMENT_BODY } from "@entities/comment";
import { z } from "zod";

export const createCommentInputSchema = z.object({
  projectId: z.string().trim().min(1, "잘못된 프로젝트 ID 예요."),
  /** When set, this comment is a reply to the named top-level comment. */
  parentCommentId: z.string().trim().min(1).optional(),
  /**
   * Client-provided UUID for read-your-own-writes optimistic UI. The
   * parent list dispatches the optimistic comment with this id, and the
   * server inserts a row with the same id — React keeps the comment
   * mounted across the optimistic → real transition without a key flip.
   */
  optimisticId: z.string().uuid().optional(),
  body: z
    .string()
    .trim()
    .min(1, "내용을 입력해 주세요.")
    .max(MAX_COMMENT_BODY, `${MAX_COMMENT_BODY}자까지 작성할 수 있어요`),
});

export type CreateCommentInput = z.infer<typeof createCommentInputSchema>;
