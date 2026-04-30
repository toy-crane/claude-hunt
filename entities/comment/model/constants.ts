// Must stay in lock-step with DB CHECK constraints on public.comments
// (see supabase/schemas/comments.sql).
export const MAX_COMMENT_BODY = 1000;
