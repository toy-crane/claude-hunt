# Fix Production Buckets — Implementation Plan

## Architecture Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Bucket source of truth | Manual SQL migration with `insert ... on conflict (id) do update set ...` | Spec Option B — local↔remote parity, drift-free, idempotent, captured in git history |
| Role of `config.toml` for buckets | Local convenience layer kept in sync manually | Enables `supabase seed buckets`, fast local iteration, but never reaches remote |
| Backfill scope | `project-screenshots` only (the only currently declared bucket) | No other buckets exist; future buckets follow the new harness rule from the start |
| Migration naming | `<ts>_create_project_screenshots_bucket.sql` | Mirrors existing convention (e.g. `..._add_cohorts_updated_at_trigger.sql`) |
| Conflict strategy | `do update set public, file_size_limit, allowed_mime_types` | Re-asserts the full row each time — prevents stale values when settings change later |

## Infrastructure Resources

| Resource | Type | Declared in | Creation Task |
|----------|------|-------------|---------------|
| `project-screenshots` bucket on production | Storage bucket | `supabase/migrations/<ts>_create_project_screenshots_bucket.sql` (canonical) + `supabase/config.toml` (local mirror) | Task 1 (declares); Task 2 (applies to remote) |

## Data Model

No application table changes. Only one row in `storage.buckets`:

### storage.buckets (single row)
- `id = 'project-screenshots'`
- `name = 'project-screenshots'`
- `public = true`
- `file_size_limit = 5242880` (5 MiB in bytes; `bigint`)
- `allowed_mime_types = ['image/jpeg', 'image/png', 'image/webp']` (`text[]`)

## Required Skills

| Skill | Applicable Task | Purpose |
|-------|-----------------|---------|
| `test-driven-development` | Task 1 | Drive migration via existing pgTAP suite (`supabase/tests/storage_project_screenshots_test.sql`); ensure bucket-row assertions still pass after `supabase db reset` |
| `supabase` | Tasks 1, 2, 3 | Manual migration path, `supabase db reset`, `supabase test db`, `supabase db push`; bucket row column types live in this skill's `storage-buckets.md` reference |
| `documentation-and-adrs` | Task 3 | Update project rules and the supabase skill reference so the dual config.toml + migration pattern is the documented standard |
| `git-workflow-and-versioning` | All tasks | One logical commit per task (migration · production push · harness rule) |

## Affected Files

| File Path | Change Type | Related Task |
|-----------|-------------|--------------|
| `supabase/migrations/<ts>_create_project_screenshots_bucket.sql` | New | Task 1 |
| `supabase/tests/storage_project_screenshots_test.sql` | Modify (header comment only — note migration is source of truth, drop "Task 12" reference) | Task 1 |
| `.claude/rules/supabase-migration.md` | Modify (Config-Declared Resources section + Strictly Prohibited list) | Task 3 |
| `.claude/skills/supabase/references/storage-buckets.md` | Modify (add Step "Upsert migration as source of truth" with units table) | Task 3 |

`supabase/config.toml` itself is **not** modified — its existing `[storage.buckets."project-screenshots"]` block already matches the canonical values.

## Tasks

### Task 1: Add upsert migration that creates `project-screenshots` on any environment

- **Covers**: Scenario 2 (full — local reset stays green), Scenario 3 (full — migration is authoritative), Scenario 1 (partial — declares the row; remote application happens in Task 2)
- **Size**: S (1 new file + 1 minor comment update)
- **Dependencies**: None
- **References**:
  - skill `supabase` — keywords: manual migration path, `supabase migration new`, `supabase db reset`, `supabase test db`, `storage.buckets`
  - skill `test-driven-development` — keywords: existing pgTAP suite, RED→GREEN, criterion-to-test
  - project file `supabase/tests/storage_project_screenshots_test.sql` (existing assertions on bucket row settings 1–4)
  - project file `.claude/rules/supabase-migration.md` (Manual Migration Path)
- **Implementation targets**:
  - `supabase/migrations/<ts>_create_project_screenshots_bucket.sql` — `insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('project-screenshots', 'project-screenshots', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']) on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;`
  - Header comment block explaining: (a) why this is a manual migration (DML), (b) that it deliberately mirrors `config.toml` and is the canonical source for any remote
  - `supabase/tests/storage_project_screenshots_test.sql` — update header comment so it points at this migration as the source of truth (remove the stale "verified implicitly via Task 12" reference)
- **Acceptance**:
  - [ ] `supabase db reset` exits 0 with the new migration in place; local `storage.buckets` row for `project-screenshots` matches `public = true`, `file_size_limit = 5242880`, `allowed_mime_types = {image/jpeg, image/png, image/webp}` (Scenario 2 success criterion)
  - [ ] `supabase test db` passes — in particular the existing assertions #1-4 in `storage_project_screenshots_test.sql` still hold after reset, demonstrating the upsert leaves the canonical state untouched (Scenario 2 success criterion)
  - [ ] Re-running migrations against an already-migrated DB (e.g. `supabase migration up` twice in a row) does not error and the row count for `id = 'project-screenshots'` remains 1 (Scenario 2 success criterion — idempotency)
  - [ ] Manually editing `config.toml` to a smaller `file_size_limit` (e.g. `"1MiB"`), running `supabase db reset`, and querying `storage.buckets` returns `file_size_limit = 5242880` (the migration's value), then revert the config edit — manual one-time check per spec Scenario 3 success criterion
- **Verification**:
  - `supabase db reset` (idempotent re-application + clean state)
  - `bun run test:db` (alias for `supabase test db`)
  - **Manual one-time check (Scenario 3 drift)**: temporarily edit `config.toml` `file_size_limit` to `"1MiB"` → `supabase db reset` → query `select file_size_limit from storage.buckets where id = 'project-screenshots'` returns `5242880` → revert the config edit. Do NOT commit the temporary edit.

---

### Task 2: Apply migration to production and verify the bucket-not-found error is resolved

- **Covers**: Scenario 1 (full)
- **Size**: S (no source files; 1 deploy command + verification queries)
- **Dependencies**: Task 1 (migration must exist before push)
- **References**:
  - skill `supabase` — keywords: `supabase db push`, `supabase migration list --linked`
  - project root: `claude-hunt` Supabase project (ref `sphsvgudpwjwfurkulmr`)
- **Implementation targets**:
  - No file changes. Operational task: run `supabase db push` against the linked project, then verify with the queries below.
- **Acceptance**:
  - [ ] `supabase migration list --linked` shows the new migration timestamp present in both Local and Remote columns (Scenario 1 success criterion)
  - [ ] Querying production via `supabase` MCP / SQL editor: `select id, public, file_size_limit, allowed_mime_types from storage.buckets where id = 'project-screenshots'` returns one row matching the canonical values (Scenario 1 success criterion)
  - [ ] Smoke test from the production app: upload a ~100 KB JPEG via the project-creation flow → returns success and the resulting public URL renders the image (Scenario 1 success criterion — happy path)
  - [ ] Smoke test: upload a `application/pdf` is rejected by the storage API (Scenario 1 success criterion — MIME enforcement)
  - [ ] Smoke test: upload a >5 MiB JPEG is rejected by the storage API (Scenario 1 success criterion — size enforcement)
- **Verification**:
  - `supabase migration list --linked` (sync state)
  - Production SQL query (bucket row presence)
  - Manual smoke test in production browser (uploads succeed/fail as expected)

---

### Checkpoint: After Tasks 1-2 (production fix delivered)
- [ ] `supabase db reset` clean locally
- [ ] `bun run test:db` passes
- [ ] `bun run test` (full Vitest + pgTAP) passes — note: this validates the **local** state shaped by Task 1 (the test suite does not hit production)
- [ ] Production `storage.buckets` contains the `project-screenshots` row (verified separately via SQL query against the linked project — Task 2 acceptance bullet 2)
- [ ] Production app upload smoke test succeeds
- [ ] No regression in the `widgets/header` Log out flow or `app/settings` (recently merged) — sanity-check by visiting `/settings`

---

### Task 3: Update harness so future buckets follow the dual config.toml + migration pattern

- **Covers**: Scenario 4 (full), Scenario 5 (full)
- **Size**: M (2 markdown files; substantive rewrite of one section in each)
- **Dependencies**: Task 1 (the new migration is referenced as the canonical example), Task 2 (production has been proven; the rule reflects shipped reality)
- **References**:
  - skill `documentation-and-adrs` — keywords: rule files, project-level governance, decision capture
  - project file `.claude/rules/supabase-migration.md` (current Config-Declared Resources + Strictly Prohibited sections to revise)
  - project file `.claude/skills/supabase/references/storage-buckets.md` (current Step 1/2/4 — needs new Step inserted between Step 1 and Step 2)
  - project file `artifacts/fix-production-buckets/spec.md` (Scenarios 4 + 5 wording)
- **Implementation targets**:
  - `.claude/rules/supabase-migration.md`:
    - Rewrite the **Config-Declared Resources → Storage buckets** bullet to require both `config.toml` AND a manual upsert migration, naming the migration as the source of truth for any remote environment
    - **Delete the contradictory sentence on the existing line 41** (`"Do not try to generate a migration for a bucket — edit `config.toml` and restart local Supabase."`) — it directly opposes the new pattern
    - Remove the contradictory **Strictly Prohibited → "Creating migrations for storage bucket definitions — edit `supabase/config.toml` instead"** line; replace with a positive bullet that prohibits declaring a bucket in `config.toml` *without* a matching upsert migration
    - Add an explicit note that `supabase db push` does not propagate `config.toml` storage buckets to remote
  - `.claude/skills/supabase/references/storage-buckets.md`:
    - Insert a new step (between current Step 1 "Declare in config.toml" and current Step 2 "RLS migration") titled e.g. "Add an upsert migration as source of truth"
    - **Renumber subsequent steps**: current Step 2 → 3, Step 3 → 4, Step 4 → 5, Step 5 → 6, Step 6 → 7. Update any in-doc cross-references (e.g. "see Step 2" → "see Step 3")
    - Include the canonical SQL template (`insert ... on conflict (id) do update set ...`)
    - Include a units-conversion table mapping `config.toml` strings to migration `bigint` bytes (e.g. `"1MiB" → 1048576`, `"5MiB" → 5242880`, `"10MiB" → 10485760`)
    - Add an explicit subsection titled "Changing an existing bucket's settings" that requires a new upsert migration each time
- **Acceptance**:
  - [ ] `.claude/rules/supabase-migration.md` no longer contains the line prohibiting bucket migrations; instead it explicitly requires the dual config.toml + manual upsert migration pattern (Scenario 4 success criterion — rule states the requirement)
  - [ ] `.claude/skills/supabase/references/storage-buckets.md` contains a step that shows the upsert SQL template and the units-conversion table (Scenario 4 success criterion — canonical template visible)
  - [ ] `.claude/skills/supabase/references/storage-buckets.md` contains a subsection covering the settings-change flow that requires a new migration each time (Scenario 5 success criterion — settings-change path is documented)
  - [ ] A future session asked to add a hypothetical `user-avatars` bucket, given only these updated docs, would produce both `config.toml` entry AND a matching upsert migration in the same change set (Scenario 4 success criterion — observable via code review on the next bucket addition)
- **Verification**:
  - Read both files end-to-end and confirm wording matches the acceptance bullets
  - Cross-check for residual contradictions with the new pattern by searching for the specific contradicting phrases (not all `config.toml` mentions, which produces false positives):
    - `grep -rn "edit.*config.toml" .claude/`
    - `grep -rn "do not.*migration.*bucket" .claude/ -i`
    - `grep -rn "config.toml.*instead" .claude/`
    - Manual scan of `CLAUDE.md` and any `.claude/rules/*.md` for stale storage-bucket guidance
  - No automated test — observable via documentation diff and via a code-review of the next bucket-addition PR

---

### Checkpoint: After Task 3 (governance shipped)
- [ ] `.claude/rules/supabase-migration.md` and `.claude/skills/supabase/references/storage-buckets.md` consistently describe the dual-source pattern
- [ ] `grep -rn` for contradicting text in `.claude/` returns nothing relevant
- [ ] All earlier verifications still hold (`bun run test`, production bucket row present)

---

## Undecided Items

- Whether to add an automated CI / lint check that flags a `config.toml` bucket without a matching upsert migration. Skipped for now per spec; revisit if the rule is ever broken in practice.
