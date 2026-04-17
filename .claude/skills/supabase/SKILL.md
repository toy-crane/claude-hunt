---
name: supabase
description: Guides Supabase workflow — declarative schemas, migration generation, table conventions, pgTAP testing, auth configuration, and local development. Use this skill whenever creating tables, editing schemas, generating migrations, writing database tests, working with Supabase locally, configuring auth/OAuth settings, or setting up email magic link (OTP) login. Also triggers for supabase db diff, supabase db reset, supabase test db, config.toml, auth config, signInWithOtp, magic link, Inbucket, seed data, seed.sql, demo data, local development setup, schema file edits, or any database schema discussion.
---

# Supabase Database Workflow

This skill defines the standard workflow for managing Supabase database schemas, migrations, and tests. It complements the `supabase-postgres-best-practices` skill for SQL-level optimization.

## Core Principles

- **Doc-verification**: Supabase changes frequently. Verify against [current docs](https://supabase.com/docs) before implementing unfamiliar APIs or CLI commands.
- **Verify your work**: Run `supabase test db` after every schema change. A fix without verification is incomplete.
- **Error recovery**: If a command fails after 2-3 attempts, stop and reconsider. Read the error carefully — do not retry blindly.
- **Declarative-first**: Define desired state in `supabase/schemas/*.sql`, generate migrations with `supabase db diff`. Never write migration files by hand for schema changes. See [declarative-schemas.md](references/declarative-schemas.md) for details and caveats.

## Security Checklist

Run through this checklist when working on auth, RLS, views, or user data:

- **`raw_user_meta_data` is user-editable** — never use it for authorization decisions (RLS policies, role checks). Store authorization data in `raw_app_meta_data` instead.
- **Views bypass RLS by default** — on Postgres 15+, use `CREATE VIEW ... WITH (security_invoker = true)`. On older versions, put views in an unexposed schema.
- **UPDATE requires a SELECT policy** — without a matching SELECT policy, updates silently return 0 rows (no error).
- **`security definer` in exposed schemas** — if you must use it in `public`, always set `search_path = ''`.
- **Deleting a user does not invalidate tokens** — sign out or revoke sessions first. Keep JWT expiry short for sensitive apps.
- **Never expose `service_role` key client-side** — use the publishable anon key for frontend code. In Next.js, any `NEXT_PUBLIC_` env var is sent to the browser.

## Workflows

| Task | Guide |
|------|-------|
| Create a new table | [creating-table.md](references/creating-table.md) |
| Create an auth-synced profile table | [auth-profile-table.md](references/auth-profile-table.md) |
| Modify an existing table | [modifying-table.md](references/modifying-table.md) |
| Create a storage bucket | [storage-buckets.md](references/storage-buckets.md) |
| Reset the local database | [reset-database.md](references/reset-database.md) |
| Declarative schema details and caveats | [declarative-schemas.md](references/declarative-schemas.md) |
| pgTAP testing patterns | [testing.md](references/testing.md) |
| Local OAuth setup | [oauth-local-setup.md](references/oauth-local-setup.md) |
| Production OAuth setup | [oauth-production-setup.md](references/oauth-production-setup.md) |
| Email magic link (OTP) login | [email-magiclink-local-setup.md](references/email-magiclink-local-setup.md) |
| Seed demo data | [seed-data.md](references/seed-data.md) |
| Type-safe client setup | [type-safe-client.md](references/type-safe-client.md) |

## Table Conventions

- Every table MUST have `created_at` and `updated_at` columns (always last), plus a `moddatetime` trigger on `updated_at` — `default now()` only sets the initial value. See [creating-table.md](references/creating-table.md) Step 2.
- Use `timestamptz` (never bare `timestamp`)
- Use `text` (never `varchar(n)`)
- Use `uuid` for primary keys that reference `auth.users`
- Use `numeric(10,2)` for money (never `float`)
- Only `profiles` may reference `auth.users(id)` directly. All other tables should reference `profiles(id)`

## RLS & Security Patterns

- Always `enable row level security` on every public table
- Wrap `auth.uid()` in `(select auth.uid())` for performance (evaluated once, not per row)
- Scope policies to `authenticated` role (not `public`) unless anonymous access is needed
- Grants: `anon` = SELECT only, `authenticated` = SELECT/INSERT/UPDATE, `service_role` = ALL

## Testing

Run `supabase test db` after every change. Create tests with `supabase test new <name>.test`. See [testing.md](references/testing.md) for patterns including role simulation, trigger testing, and CI/CD setup.

## Common Commands

| Command | Purpose |
|---------|---------|
| `supabase db diff -f <name>` | Generate migration from schema changes |
| `supabase migration new <name>` | Create empty migration (for triggers, DML) |
| `supabase migration up` | Apply pending migrations |
| `supabase db reset` | Reset local DB, replay all migrations |
| `supabase test db` | Run all pgTAP tests |
| `supabase test new <name>.test` | Create new test file |
| `bun run gen:types` | Regenerate TypeScript types from local DB |
| `supabase start` / `supabase stop` | Start / stop local Supabase |
