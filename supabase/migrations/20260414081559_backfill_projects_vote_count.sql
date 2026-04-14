-- Backfill projects.vote_count for existing rows.
-- Sets each project's vote_count to the actual count of its votes,
-- matching the authoritative value maintained by the trigger going forward.

update public.projects p
set vote_count = (
  select count(*)
  from public.votes v
  where v.project_id = p.id
);
