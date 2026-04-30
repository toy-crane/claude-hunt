// Must stay in lock-step with DB CHECK constraints on public.projects
// (see supabase/schemas/projects.sql).
export const MAX_TITLE_LENGTH = 80;
export const MAX_TAGLINE_LENGTH = 140;

// Multi-image gallery cap. Enforced in the application layer during the
// Expand phase; the DB CHECK lands in the follow-up Contract scope.
export const MAX_PROJECT_IMAGES = 5;

// Restricts github_url to https://github.com/<owner>/<repo>(/) shape.
// Mirrors the CHECK constraint on projects.github_url.
export const GITHUB_URL_PATTERN =
  /^https:\/\/github\.com\/[^/\s]+\/[^/\s]+\/?$/;
