-- Add denormalized vote_count column to projects.
-- This column is maintained by the maintain_projects_vote_count trigger
-- (created in a subsequent migration) and backfilled for existing rows
-- in the backfill_projects_vote_count migration.

alter table "public"."projects" add column "vote_count" bigint not null default 0;

-- Replace the view to read p.vote_count directly instead of aggregating
-- over the votes table on every query.
drop view if exists "public"."projects_with_vote_count";

create view "public"."projects_with_vote_count"
with (security_invoker = false) as
select
  p.id,
  p.user_id,
  p.cohort_id,
  c.name as cohort_name,
  p.title,
  p.tagline,
  p.project_url,
  p.screenshot_path,
  p.created_at,
  p.updated_at,
  p.vote_count,
  pr.display_name as author_display_name,
  pr.avatar_url as author_avatar_url
from public.projects p
left join public.cohorts c on c.id = p.cohort_id
left join public.profiles pr on pr.id = p.user_id;

grant select on public.projects_with_vote_count to anon, authenticated;
