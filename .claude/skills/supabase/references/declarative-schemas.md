---
title: Declarative Database Schema Workflow
description: Full workflow for managing Supabase schemas declaratively and known limitations of the migra diff tool
---

# Declarative Database Schema Workflow

## Overview

Declarative schemas let you define the desired database state in SQL files under `supabase/schemas/`. The Supabase CLI generates versioned migration files by diffing the current database state against your declared schema.

## Creating a Schema

Create SQL files in `supabase/schemas/` that define your tables:

```sql
-- supabase/schemas/employees.sql
create table public.employees (
  id bigint generated always as identity primary key,
  name text not null,
  email text not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.employees enable row level security;
```

## Generating Migrations

After editing a schema file, generate the migration:

```bash
supabase db diff -f <descriptive_name>
```

This creates a timestamped file in `supabase/migrations/` with the incremental SQL needed to reach the declared state.

## Schema File Ordering

Schema files are applied in **lexicographic order** by default. This matters for foreign keys — the parent table must be created first.

For explicit ordering, declare paths in `config.toml`:

```toml
[db.migrations]
schema_paths = [
  "./schemas/users.sql",
  "./schemas/*.sql",
]
```

Glob patterns are evaluated, deduplicated, and sorted lexicographically.

## Rolling Back

During development, rollback to a previous migration version:

```bash
supabase db reset --version <timestamp>
```

Then edit the schema and regenerate. Never reset a version already deployed to production.

For deployed changes, revert the schema file changes and generate a new forward migration containing the down migration.

## Deploying to Production

```bash
supabase login
supabase link        # link to remote project
supabase db push     # deploy migrations
```

## Known Caveats of the `migra` Diff Tool

The following entities are **NOT captured** by `supabase db diff`. You must manage them via manual versioned migrations using `supabase migration new <name>`:

### Not Tracked
- **DML statements**: `INSERT`, `UPDATE`, `DELETE` (use seed files or manual migrations)
- **Trigger functions and triggers**: must be created manually
- **View ownership and grants**: including security invoker on views
- **Materialized views**: not supported
- **`ALTER POLICY` statements**: policy changes require manual migration
- **Column privileges**: not tracked
- **Schema privileges**: each schema is diffed separately
- **Comments**: `COMMENT ON` statements are ignored
- **Partitions**: partition definitions not tracked
- **`ALTER PUBLICATION ... ADD TABLE`**: not captured
- **`CREATE DOMAIN`**: domain statements are ignored
- **Grant duplication**: grant statements may be duplicated from default privileges — review and clean up generated grants

### View Column Changes
When altering a column type used in a view, the diff tool does not automatically recreate the view. You may need to manually drop and recreate it.

### Best Practice
Always review generated migration files before committing. The diff tool provides a good starting point, but manual adjustment may be needed for:
- Cleaning up duplicated or overly broad grant statements
- Ensuring correct ordering of dependent operations
- Adding entities the tool cannot capture
