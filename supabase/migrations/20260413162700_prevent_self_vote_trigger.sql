-- BEFORE INSERT trigger on public.votes that blocks self-votes at the DB
-- level. The UI hides the upvote button on the owner's own cards, and
-- the toggle-vote server action performs the same check, but this
-- trigger is the authoritative guard: any hand-crafted request that
-- slips past both layers still fails here.

create or replace function public.prevent_self_vote()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  project_owner_id uuid;
begin
  select user_id into project_owner_id
  from public.projects
  where id = new.project_id;

  if project_owner_id is null then
    raise exception 'project % does not exist', new.project_id
      using errcode = 'foreign_key_violation';
  end if;

  if project_owner_id = new.user_id then
    raise exception 'users cannot vote on their own projects'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger prevent_self_vote_before_insert
  before insert on public.votes
  for each row
  execute function public.prevent_self_vote();
