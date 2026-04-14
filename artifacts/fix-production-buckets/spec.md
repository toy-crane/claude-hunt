## Overview
The `project-screenshots` storage bucket is declared only in `supabase/config.toml`, which is local-only — production has no such bucket and uploads fail with `bucket not found`. This feature backfills the missing bucket on remote and establishes a harness rule so every project-owned storage bucket is defined twice (once in `config.toml` for local convenience, once in a manual upsert migration as the source of truth for any environment).

## Scope

### Included
- A manual SQL migration that creates the `project-screenshots` bucket row in `storage.buckets` with `public = true`, a 5 MiB size limit, and the MIME allow-list `image/jpeg, image/png, image/webp`.
- The migration uses upsert semantics so it is safe to re-run, applies cleanly to a fresh remote, and reconciles any drift back to the canonical values it declares.
- After the migration is applied to remote, the production database has the bucket and authenticated uploads of project screenshots succeed end-to-end.
- Local development continues to work after `supabase db reset`: the migration runs without error even though `config.toml` already created the bucket during `supabase start`.
- Harness update: the project rules and the `supabase` skill's storage-bucket reference are revised so that adding a new bucket — or changing an existing bucket's settings — requires both a `config.toml` change and a new upsert migration.

### Excluded
- RLS policies for `project-screenshots`. Reason: already shipped via `20260413160904_project_screenshots_rls.sql` and present on remote.
- Other `config.toml`-declared resources (auth, `s3_protocol`, image transformation, etc.). Reason: those are runtime config, not database rows that the local CLI auto-creates from `config.toml`. Only storage buckets exhibit the local↔remote drift this feature addresses.
- Adding or modifying any bucket other than `project-screenshots`. Reason: it is the only bucket currently declared; the harness rule covers future additions, but no other backfill is needed today.
- CI / lint enforcement that flags a `config.toml` bucket without a matching migration. Reason: rule-based discipline first; automation only if the rule is broken in practice. Tracked under Undecided.

## Scenarios

### 1. Production gains the missing bucket and uploads succeed
- **Given** the production database currently has no row in `storage.buckets` with id `project-screenshots`, and uploads from the production app fail with `bucket not found`
- **When** all pending migrations are applied to remote
- **Then** the bucket exists on production with the canonical settings, and a subsequent authenticated upload of a small JPEG/PNG/WebP from the project flow succeeds without error

Success Criteria:
- [ ] On production, a query for `storage.buckets` filtered by `id = 'project-screenshots'` returns exactly one row with `public = true`, `file_size_limit = 5242880`, and `allowed_mime_types` containing exactly `image/jpeg`, `image/png`, `image/webp`.
- [ ] Uploading a 100 KB JPEG to `project-screenshots` from the production app via the existing project-creation flow returns success and the file is then publicly readable via its storage URL.
- [ ] Uploading a `application/pdf` to `project-screenshots` is rejected by the storage API.
- [ ] Uploading a 6 MiB JPEG to `project-screenshots` is rejected by the storage API.

### 2. Local development is unaffected after the migration is added
- **Given** a developer's local Supabase has the bucket already initialized from `config.toml`
- **When** they run `supabase db reset` (which re-applies all migrations including the new one)
- **Then** the reset completes without error and the local bucket ends with the canonical settings

Success Criteria:
- [ ] `supabase db reset` exits with status 0 with the new migration in place.
- [ ] After reset, `select public, file_size_limit, allowed_mime_types from storage.buckets where id = 'project-screenshots'` on the local DB returns the canonical values.
- [ ] Re-running the migration against an already-migrated DB does not error and does not produce duplicate rows.

### 3. The migration is the authoritative definition
- **Given** the values declared in the migration differ from the values declared in `config.toml` (e.g. someone temporarily lowers the local cap to test)
- **When** any database — local after `supabase db reset`, or remote after `supabase db push` — has the migration applied
- **Then** the resulting `storage.buckets` row matches the migration's values, not `config.toml`'s

Success Criteria:
- [ ] If `config.toml` declares `file_size_limit = "1MiB"` while the migration declares `5242880`, after `supabase db reset` the local row's `file_size_limit` equals `5242880`.
- [ ] The harness documentation explicitly identifies the migration as the source of truth and `config.toml` as a local development convenience that must be kept in sync manually.

### 4. Adding a future bucket follows the dual-source pattern automatically
- **Given** a developer asks an AI session (or Claude) to add a new storage bucket called `user-avatars`
- **When** the work is performed under the updated harness
- **Then** the resulting change set includes both a new `[storage.buckets.user-avatars]` block in `config.toml` and a new manual migration that upserts the same bucket row, and after applying both, local and remote converge on identical settings

Success Criteria:
- [ ] The harness rule (project-level rule file and / or the `supabase` skill's storage-bucket reference) explicitly states that adding a new bucket requires both files.
- [ ] The harness rule shows the upsert pattern (`insert ... on conflict (id) do update set ...`) as the canonical template, including how to translate `config.toml`'s human units (e.g. `5MiB`) into the migration's `bigint` byte value.
- [ ] When asked to add `user-avatars`, a future session produces both files in the same PR without prompting.

### 5. Changing an existing bucket's settings is propagated to remote
- **Given** the `project-screenshots` size cap needs to be raised from 5 MiB to 10 MiB
- **When** a developer follows the updated harness rule
- **Then** the change set updates the `config.toml` value AND adds a new upsert migration that re-asserts the full bucket definition with the new limit, and after the migration runs, both local (post-reset) and remote reflect the new limit

Success Criteria:
- [ ] The harness rule explicitly covers settings updates, not just initial creation.
- [ ] After the new migration is applied, `select file_size_limit from storage.buckets where id = 'project-screenshots'` returns the new value on both local and remote.

## Invariants
- **Data consistency**: For every bucket declared in `supabase/config.toml`, there exists at least one manual migration in `supabase/migrations/` that upserts that bucket. The migration's values are authoritative; `config.toml` must be kept in sync.
- **Idempotency**: All bucket migrations are safe to re-run; `supabase db reset` and re-applied migrations always converge to the same `storage.buckets` state.
- **Local ↔ remote parity**: After `supabase db push`, the remote `storage.buckets` row for any project-managed bucket matches the local row obtained from a clean `supabase db reset`.

## Dependencies
- The repository is linked to the production Supabase project (`claude-hunt`, ref `sphsvgudpwjwfurkulmr`) and the developer applying the migration has remote push permission.
- The existing RLS migration for `project-screenshots` (`20260413160904_project_screenshots_rls.sql`) remains applied on remote.

## Undecided Items
- Whether to add an automated check (CI step or lint hook) that flags a bucket declared in `config.toml` without a matching upsert migration. Skipped for now to avoid up-front friction; revisit if the rule is broken in practice.
