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

-- DO NOT drop this function — referenced by the on_auth_user_created trigger on
-- auth.users (see migration 20260325024939_create_profile_trigger.sql). The
-- trigger itself cannot be declared here because migra does not cross schema
-- boundaries.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  _full_name text := coalesce(
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    new.raw_user_meta_data ->> 'user_name'
  );
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    _full_name,
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger handle_updated_at
  before update on public.profiles
  for each row
  execute procedure extensions.moddatetime (updated_at);
