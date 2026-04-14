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

Because triggers are not captured by `supabase db diff`, add the trigger via the **Manual Migration Path** (see `supabase-migration.md`):

```bash
supabase migration new add_<table>_updated_at_trigger
```

Write into the generated migration file:

```sql
create extension if not exists moddatetime schema extensions;

create trigger handle_updated_at
  before update on public.<table>
  for each row
  execute procedure extensions.moddatetime (updated_at);
```

The `create extension` line is idempotent and safe to repeat in every trigger migration.

Always call the function as `extensions.moddatetime(...)`. Bare `moddatetime(...)` works locally but breaks `supabase db push` on the remote DB.

## Strictly Prohibited

- Creating a `public.*` table without `created_at` and `updated_at`
- Adding `updated_at` without the corresponding `moddatetime` trigger migration
- Using bare `timestamp` instead of `timestamptz`
- Placing `created_at` / `updated_at` anywhere except the last two columns
- Calling the trigger function as bare `moddatetime(...)` instead of `extensions.moddatetime(...)`
