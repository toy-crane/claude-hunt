import type { Tables, TablesInsert } from "@shared/api/supabase/types";

/**
 * Allowed reaction emojis. Mirrors the CHECK constraint on
 * public.comment_reactions.emoji. Order is the display order in the
 * popover (most-positive first).
 */
export const REACTION_EMOJI = ["👍", "💡", "🎉", "❤️"] as const;

export type ReactionEmoji = (typeof REACTION_EMOJI)[number];

export type CommentReaction = Tables<"comment_reactions">;
export type CommentReactionInsert = TablesInsert<"comment_reactions">;

export function isReactionEmoji(value: string): value is ReactionEmoji {
  return (REACTION_EMOJI as readonly string[]).includes(value);
}
