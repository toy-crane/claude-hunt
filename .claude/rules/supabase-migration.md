---
description: Enforces declarative workflow for Supabase schemas and config-declared resources
globs:
  - "supabase/**/*.sql"
  - "supabase/config.toml"
---

# Supabase Migration Guard

## Golden Rule

**NEVER create or write migration files directly.** Always edit schema files and generate migrations.

## Declarative Path (default)

1. Edit or create the schema file in `supabase/schemas/*.sql`
2. Run `supabase db diff -f <descriptive_name>` to generate the migration
3. Review the generated migration file before committing

## Manual Migration Path (exceptions only)

Use `supabase migration new <descriptive_name>` **only** for entities the diff tool cannot capture:

- Triggers and trigger functions
- DML statements (`INSERT`, `UPDATE`, `DELETE`)
- `ALTER POLICY` statements
- Materialized views
- View ownership, grants, and security invoker
- Column/schema privileges
- Comments (`COMMENT ON`)
- Partitions
- `CREATE DOMAIN`
- `ALTER PUBLICATION ... ADD TABLE`

## Config-Declared Resources

Some Supabase resources are declared in `supabase/config.toml`, **not** via SQL schemas or migrations.

- **Storage buckets** — declare under `[storage.buckets.<name>]`. See the `supabase` skill's `storage-buckets.md`.

`supabase db diff` does **not** capture `config.toml` changes. Do not try to generate a migration for a bucket — edit `config.toml` and restart local Supabase.

RLS on `storage.objects` is still SQL — use the Manual Migration Path (`supabase migration new ...`) because the diff tool cannot reliably capture policies in the `storage` schema.

## Strictly Prohibited

- Creating files in `supabase/migrations/` by hand
- Writing SQL directly into migration files for schema changes
- Skipping the `supabase db diff` step
- Creating migrations for storage bucket definitions — edit `supabase/config.toml` instead
