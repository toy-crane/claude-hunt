# Resetting Local Database

Reset the local database to a clean state by dropping all data and replaying all migrations.

## When to Use

- Local schema is out of sync with migration files
- Testing that all migrations apply cleanly from scratch
- After pulling schema changes from the team
- Corrupted local data

## Reset

```bash
supabase db reset
```

This drops the local database, re-applies all migrations in order, and runs seed files if configured.

## Partial Reset

Roll back to a specific migration version:

```bash
supabase db reset --version <timestamp>
```

Never reset to a version already deployed to production. For deployed changes, revert the schema file and generate a new forward migration.

## Verify

```bash
supabase test db
```

## Important

This is **local only** — it does not affect the remote/production database.
