# Creating a Storage Bucket

Workflow for declaring a bucket in both local and remote Supabase.

> **Key caveat**: `supabase db diff` does **not** capture `config.toml` changes, and it cannot reliably capture RLS policies on the `storage` schema. `config.toml` is local-only — **`supabase db push` does NOT propagate it to remote**. Every bucket requires both a `config.toml` entry (local) and an upsert migration (canonical source of truth). See `.claude/rules/supabase-migration.md`.

## Step 1: Declare the Bucket in `config.toml`

Edit `supabase/config.toml`, adding a `[storage.buckets.<name>]` block (the commented template around lines 109–119 shows the shape):

```toml
[storage.buckets.avatars]
public = true
file_size_limit = "5MiB"
allowed_mime_types = ["image/png", "image/jpeg", "image/webp"]
objects_path = "./seed/buckets/avatars"
```

**Field reference:**
- `public` — when `true`, reads bypass RLS (anyone with the URL can download). Writes/updates/deletes still enforce RLS.
- `file_size_limit` — upload size cap (supports `KB` / `MB` / `MiB`).
- `allowed_mime_types` — array of accepted MIME types; rejects others at the Storage API layer.
- `objects_path` — optional local folder whose files are uploaded by `supabase seed buckets`.

Bucket name conventions: use `snake_case`. To pick up changes, restart local Supabase (`supabase stop && supabase start`).

Docs: [Local Development Configuration](https://supabase.com/docs/guides/cli/local-development).

## Step 2: Add an upsert migration as source of truth

`config.toml` only creates the bucket locally. For production and any other remote environment you must add a manual migration:

```bash
supabase migration new create_<bucket_name>_bucket
```

Fill the generated file with an upsert that matches your `config.toml` values exactly:

```sql
-- <ts>_create_<bucket_name>_bucket.sql
-- WHY MANUAL: DML (INSERT) is not captured by `supabase db diff`.
-- WHY UPSERT: idempotent — safe to re-run after `supabase db reset`,
-- and reconciles any drift between config.toml and the DB row.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  '<bucket_name>',
  '<bucket_name>',
  true,           -- match config.toml `public`
  5242880,        -- match config.toml `file_size_limit` (bigint bytes — see table below)
  array['image/jpeg', 'image/png', 'image/webp']  -- match config.toml `allowed_mime_types`
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
```

### `config.toml` string → migration `bigint` bytes

| config.toml string | bigint value |
|---|---|
| `"1MiB"` | `1048576` |
| `"2MiB"` | `2097152` |
| `"5MiB"` | `5242880` |
| `"10MiB"` | `10485760` |
| `"50MiB"` | `52428800` |
| `"100MiB"` | `104857600` |

### Changing an existing bucket's settings

Every settings change (e.g. raising `file_size_limit`) requires a **new** upsert migration that re-asserts the full bucket definition with updated values. Update `config.toml` at the same time so local and remote stay in sync.

```bash
supabase migration new update_<bucket_name>_bucket
```

```sql
-- Re-assert with updated values; ON CONFLICT updates the remote row.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('<bucket_name>', '<bucket_name>', true, <new_bytes>, array[...])
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
```

## Step 3: Write RLS on `storage.objects` via Manual Migration

Generate a migration file — do **not** put these into `supabase/schemas/*.sql` because the diff tool cannot reliably capture policies in the `storage` schema:

```bash
supabase migration new avatars_storage_rls
```

Fill the migration with per-bucket policies. The per-user folder pattern scopes writes to a folder named after the owner's uid:

```sql
-- Owner-scoped writes: files live under <auth.uid()>/...
create policy "Users can upload to their own avatar folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users can update their own avatars"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users can delete their own avatars"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Public read (bucket is public=true, but keep an explicit policy so server-side listing works)
create policy "Anyone can read avatars"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'avatars');
```

**Conventions to follow:**
- Wrap `auth.uid()` in `(select auth.uid())` for per-row performance (same rule as `creating-table.md`).
- Uploads should use paths like `<user_id>/<filename>.<ext>` so `(storage.foldername(name))[1]` resolves to the owner's uid.
- Scope every policy by `bucket_id = '<name>'` — one policy set per bucket, never a blanket `storage.objects` rule.
- When `public = true`, the SELECT policy is still useful because some server-side listing paths honor it even though the public URL bypasses it.

Docs: [Storage Access Control](https://supabase.com/docs/guides/storage/security/access-control).

## Step 4: (Optional) Seed Fixture Files

For deterministic local / test data, point `objects_path` at a version-controlled folder and run the seed command:

```bash
mkdir -p supabase/seed/buckets/avatars
# drop fixture files into that folder
supabase seed buckets
```

`supabase seed buckets` uploads every file under `objects_path` to the declared bucket. Re-run it after `supabase db reset`.

## Step 5: Apply and Reset

`config.toml` changes require a restart:

```bash
supabase stop
supabase start
```

Migration RLS is applied via the normal path:

```bash
supabase migration up
```

`supabase db reset` recreates Postgres, re-applies migrations, and clears the local Storage objects volume. Re-run `supabase seed buckets` afterward to restore fixtures.

## Step 6: Write Tests

`storage.objects` is a regular Postgres table — pgTAP can assert RLS on it. Follow the patterns in `testing.md`:

```sql
-- simulate an authenticated user and assert an insert into another user's folder is blocked
SET local role authenticated;
SET local request.jwt.claims TO '{"sub": "00000000-0000-0000-0000-000000000001"}';

SELECT throws_ok(
  $$INSERT INTO storage.objects (bucket_id, name, owner)
    VALUES ('avatars', '00000000-0000-0000-0000-000000000002/foo.png', '00000000-0000-0000-0000-000000000001')$$,
  'new row violates row-level security policy',
  'User cannot write into another user folder'
);
```

For end-to-end upload flows (multipart, size-limit rejection, MIME enforcement at the HTTP layer), use Playwright against the local Storage API — pgTAP cannot exercise that layer.

Docs: [pgTAP Extended](https://supabase.com/docs/guides/local-development/testing/pgtap-extended).

## Step 7: Verify

```bash
supabase test db
supabase start   # confirms config.toml parses cleanly
```
