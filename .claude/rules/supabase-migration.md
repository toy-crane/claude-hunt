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
3. Review the generated migration against the Post-Diff Review checklist below
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

Every generated migration MUST pass these checks before commit:

1. **Cross-schema DROPs → strip.** Any `DROP` targeting `auth.*`, `storage.*`, or `extensions.*` is noise — migra cannot cross schema boundaries.
2. **Extension DROPs → strip.** `DROP EXTENSION IF EXISTS ...` is never intentional in a generated diff.
3. **View recreate losing modifiers → block.** A `DROP VIEW` + `CREATE OR REPLACE VIEW` that omits `security_invoker` or grants is a silent security regression. Strip both statements.
4. **Unintended public-schema DROPs → investigate.** A `DROP TRIGGER/FUNCTION/POLICY` on `public.*` not matching a `schemas/` removal means either a missing declaration or an accidental deletion.
5. **Unexpected statements → investigate.** `ALTER TABLE` on unedited tables, stray `CREATE INDEX`, or any DML (`INSERT`/`UPDATE`/`DELETE`) do not belong in a diff-generated migration.
6. **Function body drift → investigate.** A `CREATE OR REPLACE FUNCTION` means `schemas/` differs from the live DB — verify the change is intentional and not a copy error.

## Strictly Prohibited

- Creating files in `supabase/migrations/` by hand
- Writing SQL directly into migration files for schema changes
- Skipping the `supabase db diff` step
- Declaring a storage bucket in `config.toml` **without** a matching upsert migration — config.toml alone never reaches remote
- Committing a generated migration without passing the Post-Diff Review checklist
