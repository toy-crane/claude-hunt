import type {
  Tables,
  TablesInsert,
  TablesUpdate,
} from "@shared/api/supabase/types.ts";

export type Vote = Tables<"votes">;
export type VoteInsert = TablesInsert<"votes">;
export type VoteUpdate = TablesUpdate<"votes">;

/**
 * Row shape returned by the `projects_with_vote_count` view — the grid's
 * primary read model. Combines all project columns with author metadata
 * and the aggregated `vote_count` (never null: the view coalesces to 0).
 */
export type ProjectWithVoteCount = Tables<"projects_with_vote_count">;
