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
3. Spawn `migration-reviewer` agent to review the generated migration (see Post-Diff Review below)
4. Strip or resolve all flagged items, then commit

## Manual Migration Path (exceptions only)

Use `supabase migration new <descriptive_name>` **only** for entities the diff tool cannot capture:

- Cross-schema triggers (on `auth.users`, `storage.objects`, etc.) — migra does not cross schema boundaries
- Cross-schema RLS policies (e.g., on `storage.objects`)
- DML statements (`INSERT`, `UPDATE`, `DELETE`)
- `ALTER POLICY` statements
- Materialized views
- View ownership, grants, and security invoker
- Column/schema privileges
- Comments (`COMMENT ON`)
- Partitions
- `CREATE DOMAIN`
- `ALTER PUBLICATION ... ADD TABLE`

Public-schema triggers and trigger functions are captured by `supabase db diff` — declare them alongside their table in `supabase/schemas/`.

## Config-Declared Resources

Some Supabase resources are partly declared in `supabase/config.toml`.

### Storage buckets — dual-source pattern (required)

Every project-owned storage bucket **must** be declared in **both** places:

1. `supabase/config.toml` under `[storage.buckets.<name>]` — local development only. The CLI materialises the row on `supabase start` / `db reset`, but **`supabase db push` does NOT propagate `config.toml` to remote**.
2. A manual upsert migration in `supabase/migrations/` — the canonical source of truth for any non-local environment (production, staging, CI, fresh clones).

The migration must use `on conflict (id) do update set ...` so it is idempotent and reconciles any drift between config.toml and the database row.

See the `supabase` skill's `storage-buckets.md` for the full workflow, canonical SQL template, and units-conversion table.

RLS on `storage.objects` is still SQL — use the Manual Migration Path (`supabase migration new ...`) because the diff tool cannot reliably capture policies in the `storage` schema.

## Post-Diff Review

Every generated migration MUST be reviewed before commit. Spawn the `migration-reviewer` agent with:
1. The path to the generated migration file
2. The path to the edited schema file(s)

The agent applies a universal safety checklist (cross-schema DROPs, extension DROPs, view modifier regressions, unintended public-schema DROPs, unexpected statements, function body drift). Strip or resolve everything it flags before committing.

## Strictly Prohibited

- Creating files in `supabase/migrations/` by hand
- Writing SQL directly into migration files for schema changes
- Skipping the `supabase db diff` step
- Declaring a storage bucket in `config.toml` **without** a matching upsert migration — config.toml alone never reaches remote
- Committing a generated migration without running the `migration-reviewer` agent
