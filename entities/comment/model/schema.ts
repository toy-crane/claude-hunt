import type {
  Tables,
  TablesInsert,
  TablesUpdate,
} from "@shared/api/supabase/types";

export type Comment = Tables<"comments">;
export type CommentInsert = TablesInsert<"comments">;
export type CommentUpdate = TablesUpdate<"comments">;

/**
 * A comment treated as edited when its updated_at differs from its
 * created_at. The moddatetime trigger on `comments` advances
 * updated_at on every UPDATE; the initial INSERT leaves them equal.
 */
export function isCommentEdited(
  c: Pick<Comment, "created_at" | "updated_at">
): boolean {
  return c.updated_at !== c.created_at;
}
