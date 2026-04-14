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
