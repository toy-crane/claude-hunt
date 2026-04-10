# Creating an Auth-Synced Profile Table

Guide for creating a profile table that automatically syncs with `auth.users` via a trigger.

## When to Use

- Store additional user information beyond what `auth.users` provides
- Need automatic profile creation on signup

## Step 1: Create Schema File

Create `supabase/schemas/profiles.sql` with the table, RLS policies, and grants:

```sql
create table public.profiles (
  id uuid not null references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  display_name text,
  avatar_url text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);
```

## Step 2: Generate Migration for the Table

```bash
supabase db diff -f create_profiles
```

## Step 3: Create Manual Migration for the Trigger

> **CRITICAL:** `supabase db diff` does NOT capture triggers on the `auth` schema. You MUST use `supabase migration new` and write the trigger migration manually.

```bash
supabase migration new create_profile_trigger
```

Then write the trigger function in the generated file:

```sql
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
  insert into public.profiles (id, email, full_name, display_name, avatar_url)
  values (
    new.id,
    new.email,
    _full_name,
    _full_name,
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

**Key patterns in this trigger:**
- `security definer set search_path = ''` — required because the function is in the `public` schema
- `coalesce` chain for `full_name` — different OAuth providers use different metadata keys
- `on conflict (id) do nothing` — prevents duplicate insert errors during re-auth

## Step 4: Apply and Verify

```bash
supabase db reset
supabase test db
```

Use `db reset` (not `migration up`) because the trigger migration depends on the table migration being applied first.

## Troubleshooting

**Profile not created after signup:**
```sql
-- Check trigger exists
select * from information_schema.triggers
where event_object_table = 'users' and event_object_schema = 'auth';
```

**Trigger migration missing after `db diff`:**
This is expected — `db diff` cannot capture auth schema triggers. Always use `supabase migration new` for triggers.

**Metadata keys not mapping correctly:**
Check which keys the OAuth provider sends in `raw_user_meta_data`. The coalesce chain (`full_name` -> `name` -> `user_name`) covers most providers but may need adjustment.
