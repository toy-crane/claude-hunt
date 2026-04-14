-- Creates the `project-screenshots` storage bucket as a database row.
--
-- WHY THIS IS A MANUAL MIGRATION (not a schema diff):
--   Storage buckets are DML (INSERT into storage.buckets), which `supabase db diff`
--   cannot capture. This follows the Manual Migration Path in
--   .claude/rules/supabase-migration.md.
--
-- RELATIONSHIP TO config.toml:
--   supabase/config.toml declares [storage.buckets."project-screenshots"] for
--   LOCAL development only. The CLI reads that file on `supabase start` / `db reset`
--   and creates the bucket row, but `supabase db push` does NOT propagate config.toml
--   to remote. This migration is the canonical source of truth for any non-local
--   environment (production, staging, CI, fresh clones).
--
-- VALUES MATCH config.toml:
--   public          = true         (config: public = true)
--   file_size_limit = 5242880      (config: file_size_limit = "5MiB"; bigint bytes)
--   allowed_mime_types = [...]     (config: allowed_mime_types = [...])
--
-- IDEMPOTENCY:
--   The ON CONFLICT clause makes this safe to re-run. After `supabase db reset`,
--   config.toml initialises the row first; this migration then reconciles any drift
--   back to the canonical values below. Row count for this id remains 1.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-screenshots',
  'project-screenshots',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
