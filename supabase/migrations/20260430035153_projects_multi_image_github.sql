alter table "public"."projects" drop constraint "projects_screenshot_path_check";

drop view if exists "public"."projects_with_vote_count";

alter table "public"."projects" add column "github_url" text;

alter table "public"."projects" add column "images" jsonb not null default '[]'::jsonb;

alter table "public"."projects" alter column "screenshot_path" drop not null;

alter table "public"."projects" add constraint "projects_github_url_check" CHECK (((github_url IS NULL) OR (github_url ~ '^https://github\.com/[^/[:space:]]+/[^/[:space:]]+/?$'::text))) not valid;

alter table "public"."projects" validate constraint "projects_github_url_check";

alter table "public"."projects" add constraint "projects_screenshot_path_check" CHECK (((screenshot_path IS NULL) OR (char_length(screenshot_path) > 0))) not valid;

alter table "public"."projects" validate constraint "projects_screenshot_path_check";

create view "public"."projects_with_vote_count"
with (security_invoker = false) as
SELECT p.id,
    p.user_id,
    p.cohort_id,
    c.name AS cohort_name,
    p.title,
    p.tagline,
    p.project_url,
    p.github_url,
    p.screenshot_path,
    p.images,
    COALESCE(((p.images -> 0) ->> 'path'::text), p.screenshot_path) AS primary_image_path,
    p.created_at,
    p.updated_at,
    p.vote_count,
    pr.display_name AS author_display_name,
    pr.avatar_url AS author_avatar_url
FROM ((public.projects p
    LEFT JOIN public.cohorts c ON ((c.id = p.cohort_id)))
    LEFT JOIN public.profiles pr ON ((pr.id = p.user_id)));

-- Re-grant SELECT to public roles. The drop+create above clears the original
-- grants from the schema file (`grant select on public.projects_with_vote_count
-- to anon, authenticated`); without this re-grant, anon visitors lose access
-- to the board.
grant select on public.projects_with_vote_count to anon, authenticated;
