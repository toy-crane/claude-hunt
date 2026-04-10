# Modifying an Existing Table

Safe workflow for adding columns, indexes, constraints, or RLS policies to an existing table.

## Step 1: Locate the Existing Schema File

Find the schema file in `supabase/schemas/`. **Do NOT create a new file** — edit the existing one.

```bash
ls supabase/schemas/
```

## Step 2: Edit the Schema File

Add your changes directly to the existing file. Common patterns:

**Adding a column** (place before `created_at`/`updated_at`):
```sql
-- In the CREATE TABLE block, add:
  bio text,
```

**Adding an index:**
```sql
create index idx_profiles_email on public.profiles (email);
```

**Adding an RLS policy:**
```sql
create policy "Users can delete their own posts"
  on public.posts for delete
  to authenticated
  using ((select auth.uid()) = user_id);
```

**Modifying an RLS policy** (drop and recreate):
```sql
drop policy if exists "Old policy name" on public.posts;

create policy "New policy name"
  on public.posts for select
  to authenticated
  using ((select auth.uid()) = user_id);
```

## Step 3: Generate Migration

```bash
supabase db diff -f <descriptive_name>
# Example: supabase db diff -f add_bio_to_profiles
```

## Step 4: Review the Generated Migration

Open the file in `supabase/migrations/` and check:
- [ ] Only intended changes are present
- [ ] No unexpected `DROP TABLE` or `DROP COLUMN` statements
- [ ] No duplicated grant statements (a known `migra` issue — remove duplicates)
- [ ] Column types are correct

If the change involves triggers, functions, or `ALTER POLICY`, create a separate manual migration with `supabase migration new` (these are not captured by `db diff`). See `declarative-schemas.md` for the full list of unsupported entities.

## Step 5: Apply

```bash
supabase migration up
```

For destructive changes (dropping columns, changing types), prefer `supabase db reset` to validate all migrations from scratch.

## Step 6: Update Tests

Update existing pgTAP tests or add new assertions for the changed columns/policies. See `testing.md` for patterns.

## Step 7: Regenerate Types

```bash
bun run gen:types
```

## Step 8: Verify

```bash
supabase test db
bun run typecheck
```
