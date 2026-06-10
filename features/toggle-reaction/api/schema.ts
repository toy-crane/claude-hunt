import { REACTION_EMOJI } from "@entities/reaction";
import { z } from "zod";

export const toggleReactionInputSchema = z.object({
  commentId: z
    .string()
    .trim()
    .min(1, "댓글을 찾지 못했어요. 새로고침 후 다시 시도해 주세요."),
  projectId: z.string().trim().min(1),
  emoji: z.enum(REACTION_EMOJI),
});

export type ToggleReactionInput = z.infer<typeof toggleReactionInputSchema>;
