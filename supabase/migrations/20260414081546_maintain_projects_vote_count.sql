-- Trigger function and trigger to maintain projects.vote_count as a
-- counter-cache. On each INSERT into votes, increments the corresponding
-- project's vote_count. On each DELETE, decrements it (floor at 0).
-- Uses GREATEST(..., 0) as a safety net so concurrent deletions can never
-- push the column negative.

create or replace function public.maintain_project_vote_count()
returns trigger
language plpgsql
security definer
as $$
begin
  if (TG_OP = 'INSERT') then
    update public.projects
    set vote_count = vote_count + 1
    where id = NEW.project_id;
  elsif (TG_OP = 'DELETE') then
    update public.projects
    set vote_count = greatest(vote_count - 1, 0)
    where id = OLD.project_id;
  end if;
  return null;
end;
$$;

create trigger maintain_vote_count
  after insert or delete on public.votes
  for each row
  execute procedure public.maintain_project_vote_count();
