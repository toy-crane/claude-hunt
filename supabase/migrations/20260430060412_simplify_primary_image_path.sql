-- Simplify projects_with_vote_count: drop the legacy `screenshot_path`
-- projection and the coalesce shim now that all rows store their primary
-- image at `images[0]`. The base column `projects.screenshot_path` stays
-- for the follow-up Contract scope.

drop view if exists "public"."projects_with_vote_count";

create view "public"."projects_with_vote_count"
with (security_invoker = false) as
  select
    p.id,
    p.user_id,
    p.cohort_id,
    c.name as cohort_name,
    c.label as cohort_label,
    p.title,
    p.tagline,
    p.project_url,
    p.github_url,
    p.images,
    p.images->0->>'path' as primary_image_path,
    p.created_at,
    p.updated_at,
    p.vote_count,
    pr.display_name as author_display_name,
    pr.avatar_url as author_avatar_url
  from public.projects p
  left join public.cohorts c on c.id = p.cohort_id
  left join public.profiles pr on pr.id = p.user_id;

grant select on public.projects_with_vote_count to anon, authenticated;
