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
