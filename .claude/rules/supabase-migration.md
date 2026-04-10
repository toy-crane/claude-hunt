---
description: Enforces declarative schema workflow for Supabase migrations
globs:
  - "supabase/**/*.sql"
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

## Strictly Prohibited

- Creating files in `supabase/migrations/` by hand
- Writing SQL directly into migration files for schema changes
- Skipping the `supabase db diff` step
