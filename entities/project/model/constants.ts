// Title stays in lock-step with the DB CHECK on public.projects
// (see supabase/schemas/projects.sql).
export const MAX_TITLE_LENGTH = 80;

// Tagline is a true one-liner: the app enforces 60 on every write. The DB
// CHECK stays at 140 (a looser backstop) on purpose — production already has
// taglines up to ~134 chars that predate the split into tagline + description,
// and tightening the constraint would fail the migration. Existing long
// taglines are grandfathered; they are only re-validated to 60 when an owner
// edits the project. Longer copy now belongs in `description`.
export const MAX_TAGLINE_LENGTH = 60;

// Optional long-form body shown on the detail page. Has a strict DB CHECK
// (1..1000) since the column is brand-new with no rows to grandfather.
export const MAX_DESCRIPTION_LENGTH = 1000;

// Multi-image gallery cap. Enforced in the application layer during the
// Expand phase; the DB CHECK lands in the follow-up Contract scope.
export const MAX_PROJECT_IMAGES = 5;

// Shown on the project URL field when an image-less submission or save
// cannot open the URL to capture its first screen.
export const PROJECT_URL_UNREACHABLE_MESSAGE =
  "프로젝트 URL을 열 수 없어요. 주소가 맞는지, 로그인 없이 열리는지 확인해 주세요.";

// Restricts github_url to https://github.com/<owner>/<repo>(/) shape.
// Mirrors the CHECK constraint on projects.github_url.
export const GITHUB_URL_PATTERN =
  /^https:\/\/github\.com\/[^/\s]+\/[^/\s]+\/?$/;
