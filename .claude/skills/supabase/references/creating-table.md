# Creating a New Table

Step-by-step workflow for adding a new table to the project.

## Step 1: Create Schema File

Create `supabase/schemas/<table_name>.sql`:

```sql
-- supabase/schemas/posts.sql

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  content text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Indexes
create index idx_posts_user_id on public.posts (user_id);
create index idx_posts_created_at on public.posts (created_at desc);

-- RLS
alter table public.posts enable row level security;

create policy "Users can view their own posts"
  on public.posts for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own posts"
  on public.posts for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own posts"
  on public.posts for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Grants (least-privilege)
grant select on table public.posts to anon;
grant select, insert, update on table public.posts to authenticated;
grant all on table public.posts to service_role;
```

**Conventions to follow:**
- `created_at` and `updated_at` always go last
- Use `timestamptz` (never bare `timestamp`)
- Use `text` (never `varchar(n)`)
- Use `uuid` for PKs that reference `auth.users` or `profiles`
- Only `profiles` references `auth.users(id)` directly. All other tables reference `profiles(id)`
- Wrap `auth.uid()` in `(select auth.uid())` for performance
- Scope policies to `authenticated` (not `public`)
- Grants: `anon` = SELECT only, `authenticated` = SELECT/INSERT/UPDATE, `service_role` = ALL

## Step 2: Generate Migration

```bash
supabase db diff -f create_posts
```

## Step 3: Review the Generated Migration

Open the file in `supabase/migrations/` and check:
- Only intended changes are present
- No unexpected ALTER or DROP statements
- Grants follow least-privilege (watch for duplicated grants — a known `migra` issue)

For known caveats of the diff tool, see `declarative-schemas.md`.

## Step 4: Apply

```bash
supabase migration up
```

## Step 5: Write pgTAP Test

Create a test file in `supabase/tests/` covering:
- Table and column existence
- RLS policies (positive and negative cases)
- Role-based access (`authenticated`, `anon`)

See `testing.md` for patterns.

## Step 6: Regenerate Types

```bash
bun run gen:types
```

This updates `types/database.types.ts` with the new table. See `type-safe-client.md` for details.

## Step 7: Verify

```bash
supabase test db
bun run typecheck
```
