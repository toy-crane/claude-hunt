create table public.projects (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  cohort_id uuid not null references public.cohorts(id) on delete restrict,
  title text not null check (char_length(title) between 1 and 80),
  tagline text not null check (char_length(tagline) between 1 and 140),
  project_url text not null check (project_url ~* '^https?://'),
  -- Legacy single screenshot path; new code writes to `images` instead.
  -- Made nullable in the Expand phase of the multi-image migration.
  -- Will be dropped in a follow-up Contract scope.
  screenshot_path text null check (screenshot_path is null or char_length(screenshot_path) > 0),
  -- Multi-image gallery, ordered. images[0] is the primary (board thumbnail, OG image).
  -- Length CHECK (1..5) added in the follow-up Contract scope after all writes go through this column.
  images jsonb not null default '[]',
  -- Optional GitHub repository URL — when set, the detail page exposes a "GitHub 저장소 보기" link.
  github_url text null check (github_url is null or github_url ~ '^https://github\.com/[^/[:space:]]+/[^/[:space:]]+/?$'),
  vote_count bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index projects_user_id_idx on public.projects (user_id);
create index projects_cohort_id_idx on public.projects (cohort_id);

alter table public.projects enable row level security;

create policy "Anyone can view projects"
  on public.projects for select
  to anon, authenticated
  using (true);

create policy "Owners can insert their own projects"
  on public.projects for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Owners can update their own projects"
  on public.projects for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Owners can delete their own projects"
  on public.projects for delete
  to authenticated
  using ((select auth.uid()) = user_id);

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

create trigger handle_updated_at
  before update on public.projects
  for each row
  execute procedure extensions.moddatetime (updated_at);
