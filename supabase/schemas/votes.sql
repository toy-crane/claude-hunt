create table public.votes (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, project_id)
);

create index votes_project_id_idx on public.votes (project_id);

alter table public.votes enable row level security;

create policy "Anyone can view votes"
  on public.votes for select
  to anon, authenticated
  using (true);

create policy "Users can insert their own votes"
  on public.votes for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own votes"
  on public.votes for delete
  to authenticated
  using ((select auth.uid()) = user_id);

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

create trigger maintain_vote_count
  after insert or delete on public.votes
  for each row
  execute procedure public.maintain_project_vote_count();

create trigger handle_updated_at
  before update on public.votes
  for each row
  execute procedure extensions.moddatetime (updated_at);
