create table public.profiles (
  id uuid not null references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  display_name text,
  avatar_url text,
  cohort_id uuid references public.cohorts(id) on delete set null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Case-insensitive, trim-aware uniqueness for display_name.
-- Comparison ignores letter case and surrounding whitespace, so "Alice",
-- "alice", and "  Alice  " all map to the same key. The stored column keeps
-- the user's original casing — only the index expression is normalized.
-- NULL display_names remain distinct under a unique index (multiple unset
-- profiles can coexist between signup and onboarding).
create unique index profiles_display_name_ci_unique
  on public.profiles (lower(btrim(display_name)));

alter table public.profiles enable row level security;

create policy "Authenticated users can view all profiles"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  to authenticated
  with check ((select auth.uid()) = id);
