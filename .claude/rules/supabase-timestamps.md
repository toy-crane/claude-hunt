---
description: Requires created_at/updated_at columns and moddatetime trigger on all public tables
globs:
  - "supabase/schemas/*.sql"
  - "supabase/migrations/*.sql"
---

# Supabase Timestamp Guard

## Required Columns

Every `public.*` table MUST include these columns, in this order, as the last two columns:

```sql
created_at timestamptz default now() not null,
updated_at timestamptz default now() not null
```

Use `timestamptz` — never bare `timestamp`.

## Required Trigger

`default now()` only sets the **initial** value of `updated_at`. To keep it current on every UPDATE, every table with `updated_at` MUST have a `moddatetime` trigger.

Declare the trigger in the same schema file as the table (`supabase/schemas/<table>.sql`). `supabase db diff` captures public-schema triggers, so no separate manual migration is needed.

```sql
create trigger handle_updated_at
  before update on public.<table>
  for each row
  execute procedure extensions.moddatetime (updated_at);
```

The `moddatetime` extension itself is declared once in `supabase/schemas/cohorts.sql` (the first file in `schema_paths`). Do not redeclare it in other schema files.

Always call the function as `extensions.moddatetime(...)`. Bare `moddatetime(...)` works locally but breaks `supabase db push` on the remote DB.

## Strictly Prohibited

- Creating a `public.*` table without `created_at` and `updated_at`
- Adding `updated_at` without the corresponding `moddatetime` trigger declaration in `schemas/`
- Using bare `timestamp` instead of `timestamptz`
- Placing `created_at` / `updated_at` anywhere except the last two columns
- Calling the trigger function as bare `moddatetime(...)` instead of `extensions.moddatetime(...)`
