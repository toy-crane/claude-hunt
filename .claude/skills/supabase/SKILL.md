---
name: supabase
description: Guides Supabase workflow — declarative schemas, migration generation, table conventions, pgTAP testing, and local development configuration. Use this skill whenever creating tables, editing schemas, generating migrations, writing database tests, working with Supabase locally, or configuring auth/OAuth settings. Also triggers for supabase db diff, supabase db reset, supabase test db, config.toml, auth config, local development setup, schema file edits, or any database schema discussion.
---

# Supabase Database Workflow

This skill defines the standard workflow for managing Supabase database schemas, migrations, and tests in this project. It complements the `supabase-postgres-best-practices` skill, which covers SQL-level query and schema optimization.

## Declarative Schema Workflow

This project uses Supabase's **declarative schema** approach. You define the desired database state in SQL files, and the CLI generates migrations automatically.

### Core Rules

1. **Define schemas in `supabase/schemas/*.sql`** — these are the source of truth for table structure
2. **Never write migration files by hand** for schema changes — always generate them with `supabase db diff`
3. **Manually write migrations only** for entities the diff tool cannot capture (triggers, functions, DML, RLS policy alterations)

### Generating Migrations

```bash
# After editing a schema file:
supabase db diff -f <descriptive_name>

# For triggers, functions, or DML (not captured by diff):
supabase migration new <descriptive_name>
# Then edit the generated file manually
```

### Applying and Verifying

```bash
# Reset local database and apply all migrations from scratch:
supabase db reset

# Or apply only pending migrations:
supabase migration up
```

Always review generated migration files before committing — the diff tool is not foolproof. See `references/declarative-schemas.md` for the full workflow details and known caveats.

## Table Conventions

Every table in this project follows these conventions:

### Required Timestamp Columns

Every table MUST include both `created_at` and `updated_at` columns:

```sql
create table public.example (
  id uuid not null references auth.users on delete cascade primary key,
  -- ... other columns ...
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);
```

These columns provide audit trails, enable debugging, and support time-based queries. Always append new columns before the timestamp columns to keep them consistently at the end.

### Data Type Guidelines

- **Timestamps**: Always use `timestamptz` (never bare `timestamp` — timezone info matters)
- **Strings**: Use `text` (not `varchar(n)` — same performance, no artificial limit)
- **UUIDs**: Use `uuid` for primary keys that reference `auth.users`
- **Money**: Use `numeric(10,2)` (not `float` — precision matters)

## RLS & Security

Every table must have Row Level Security enabled. Follow these patterns:

```sql
alter table public.example enable row level security;

-- Wrap auth.uid() in (select ...) — evaluated once, not per row
create policy "Users can view their own data"
  on public.example
  for select
  to authenticated
  using ((select auth.uid()) = user_id);
```

Key rules:
- Always `enable row level security` on every public table
- Wrap `auth.uid()` in `(select auth.uid())` for performance (avoids per-row function call)
- Scope policies to `authenticated` role (not `public`) unless there's a specific reason for anonymous access
- Apply least-privilege grants: `anon` gets `SELECT` only, `authenticated` gets `SELECT/INSERT/UPDATE`, `service_role` gets all

For detailed SQL patterns, index strategies, and security best practices, consult the `supabase-postgres-best-practices` skill.

## Testing with pgTAP

Write database tests using pgTAP to verify table structure, RLS policies, and triggers.

### Creating and Running Tests

```bash
# Create a new test file:
supabase test new <name>.test

# Run all tests:
supabase test db
```

### Test Structure

```sql
BEGIN;
SELECT plan(N);  -- declare number of test cases

-- Test table/column existence
SELECT has_table('public', 'example', 'example table should exist');
SELECT has_column('public', 'example', 'id', 'should have id column');

-- Test RLS policies by simulating roles
SET local role authenticated;
SET local request.jwt.claims TO '{"sub": "<user-uuid>"}';

SELECT results_eq(
  'SELECT count(*)::int FROM example',
  ARRAY[expected_count],
  'User should only see their own data'
);

-- Test negative cases (what users should NOT be able to do)
SET local role anon;
SELECT results_eq(
  'SELECT count(*)::int FROM example',
  ARRAY[0],
  'Anonymous user cannot see any data'
);

SELECT * FROM finish();
ROLLBACK;
```

### What to Test
- Table and column existence
- RLS policies: both positive (can access own data) and negative (cannot access others' data)
- Role-based access: test as `authenticated`, `anon`, and reset role
- Trigger functions: verify they fire and produce expected results
- Constraints and foreign keys

See `references/testing.md` for detailed patterns, application-level testing, and CI/CD setup.

## Local Development

When configuring `config.toml` or OAuth providers, always use `localhost` (not `127.0.0.1`) for all URLs. Supabase's `additional_redirect_urls` performs exact string matching — a hostname mismatch will silently break OAuth callbacks.

See `references/local-development.md` for the full URL convention and OAuth callback flow.

## Workflow Summary

1. Edit or create schema files in `supabase/schemas/`
2. Run `supabase db diff -f <descriptive_name>` to generate migration
3. Review the generated migration file
4. For triggers/functions/DML: use `supabase migration new <name>` and write manually
5. Write pgTAP tests in `supabase/tests/`
6. Run `supabase db reset` then `supabase test db` to verify
7. Consult `supabase-postgres-best-practices` skill to review SQL quality
