-- Reporting view for the landing-page grid.
-- Uses security_invoker = false (definer semantics) so anonymous visitors
-- can read `author_display_name` without needing direct SELECT on profiles
-- (which holds PII like email). Only display-safe profile columns are
-- projected. Writes go directly to the base tables, which retain their
-- own RLS policies.
create view public.projects_with_vote_count
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
