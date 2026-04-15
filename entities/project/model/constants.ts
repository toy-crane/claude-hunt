// Must stay in lock-step with DB CHECK constraints on public.projects
// (see supabase/schemas/projects.sql).
export const MAX_TITLE_LENGTH = 80;
export const MAX_TAGLINE_LENGTH = 140;
