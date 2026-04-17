# Seeding Data

Populate a local Supabase instance with deterministic demo data via `supabase/seed.sql` and storage fixtures.

## Principles

- **Idempotent**: every INSERT uses `on conflict (id) do nothing`.
- **Stable IDs**: hardcoded UUIDs (`00000000-0000-0000-0000-*` prefix) so tests and fixture paths are deterministic across resets.
- **All-in-SQL**: everything lives in `supabase/seed.sql` — `supabase db reset` alone produces the full state.

## Auth Users

Seed runs as `postgres` superuser, so insert directly into `auth.users` + `auth.identities`:

```sql
insert into auth.users (
  id, instance_id, email, encrypted_password,
  email_confirmed_at, raw_user_meta_data,
  role, aud, created_at, updated_at
) values (
  '00000000-0000-0000-0000-00000000000a',
  '00000000-0000-0000-0000-000000000000',
  'demo@example.com', null, now(),
  jsonb_build_object('full_name', 'Demo User'),
  'authenticated', 'authenticated', now(), now()
) on conflict (id) do nothing;

insert into auth.identities (
  id, user_id, provider_id, provider,
  identity_data, last_sign_in_at, created_at, updated_at
) values (
  gen_random_uuid(),
  '00000000-0000-0000-0000-00000000000a',
  '00000000-0000-0000-0000-00000000000a',
  'email',
  jsonb_build_object(
    'sub', '00000000-0000-0000-0000-00000000000a',
    'email', 'demo@example.com'
  ),
  now(), now(), now()
) on conflict on constraint identities_pkey do nothing;
```

If a `handle_new_user` trigger creates a profile row, UPDATE it afterward for additional fields.

## Storage Fixtures

Place files under `supabase/seed/<bucket>/` mirroring the runtime path (`<user-uuid>/<file>.png`). Add `objects_path` to the bucket in `config.toml`:

```toml
objects_path = "./seed/project-screenshots"
```

`supabase db reset` auto-uploads these files. Ensure the column value (e.g. `screenshot_path`) matches the relative path exactly.

## Verify

```bash
supabase db reset       # migrations + seed + storage upload
supabase test db        # pgTAP assertions on seed state
supabase db reset       # idempotency check — must succeed twice
```
