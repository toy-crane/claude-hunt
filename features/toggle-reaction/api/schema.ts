import { REACTION_EMOJI } from "@entities/reaction";
import { z } from "zod";

export const toggleReactionInputSchema = z.object({
  commentId: z.string().trim().min(1, "잘못된 댓글 ID 예요."),
  projectId: z.string().trim().min(1),
  emoji: z.enum(REACTION_EMOJI),
});

export type ToggleReactionInput = z.infer<typeof toggleReactionInputSchema>;
