# Create Seed Data Implementation Plan

## Architecture Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Auth user creation in SQL | `DO $$ ... $$` block that INSERTs into `auth.users` (with `email_confirmed_at = now()`, `encrypted_password = null`) and `auth.identities` (email provider) | Keeps all seed logic in `supabase/seed.sql` so `supabase db reset` alone produces the full state. No password is needed because demo-account sign-in is out of scope; the identity row leaves the door open for a future magic-link sign-in via Inbucket without schema changes. |
| Stable user identity | Hardcoded UUIDs (`00000000-0000-0000-0000-00000000000a`..`c`) | Tests and fixture image paths can reference owner folders deterministically; re-running reset produces identical IDs. |
| Cohort spread | `LGE-1`, `LGE-2`, `Inflearn` (three of the four seeded cohorts) | Exercises cohort filter with multi-cohort data; leaves `LGE-3` empty so tests can verify the "no projects in this cohort" case. |
| Screenshot storage seeding | `objects_path = "./seed/project-screenshots"` on the `project-screenshots` bucket block in `supabase/config.toml`; three PNGs laid out as `<user-uuid>/<filename>.png` | The CLI auto-uploads these on `supabase start` / `supabase db reset`. Folder-per-user mirrors the app's upload convention so paths work through the existing storage URL resolver. |
| Idempotency safety | `on conflict (id) do nothing` on every seeded row, even though `supabase db reset` starts from an empty DB | Defensive against partial re-runs or `supabase start` on a container where seed previously ran. |

## Infrastructure Resources

| Resource | Type | Declared in | Creation Task |
|----------|------|-------------|---------------|
| `project-screenshots` bucket seed objects (3 PNGs) | Storage objects | `supabase/config.toml` (`objects_path`) + `supabase/seed/project-screenshots/**/*.png` | Task 2 |

## Data Model

### Seed User (x3)
- `auth.users` row — id (fixed UUID), email, `email_confirmed_at = now()`, `encrypted_password = null`, raw_user_meta_data (full_name)
- `auth.identities` row — links user to `email` provider
- `public.profiles` row — created by `handle_new_user` trigger; then UPDATEd to set `display_name` + `cohort_id`

### Seed Project (x3, 1 per user)
- `public.projects` row — user_id, cohort_id (matches owner's), title, tagline, project_url, screenshot_path (`<owner-uuid>/<file>.png`), vote_count=0

### Fixture Image (x3)
- PNG file at `supabase/seed/project-screenshots/<owner-uuid>/<file>.png` — same key as referenced by `projects.screenshot_path`

## Required Skills

| Skill | Applicable Task | Purpose |
|-------|-----------------|---------|
| test-driven-development | All tasks | RED → GREEN discipline; map each Success Criteria bullet to a concrete test. |
| supabase | Tasks 1, 2 | Seed / migration conventions, storage bucket seeding via `config.toml`, local auth user patterns. |

## Affected Files

| File Path | Change Type | Related Task |
|-----------|-------------|--------------|
| `supabase/seed.sql` | Modify | Task 1, Task 2 |
| `supabase/config.toml` | Modify (add `objects_path`) | Task 2 |
| `supabase/seed/project-screenshots/<u1>/<f1>.png` | New | Task 2 |
| `supabase/seed/project-screenshots/<u2>/<f2>.png` | New | Task 2 |
| `supabase/seed/project-screenshots/<u3>/<f3>.png` | New | Task 2 |
| `supabase/tests/seed_test.sql` | New | Task 1, Task 2 |
| `e2e/seed-demo.spec.ts` | New | Checkpoint after Task 2 |

## Tasks

### Task 1: Demo users exist with distributed cohort assignments ✅

- **Covers**: Scenario 2 (partial — cohort distribution only), Scenario 3 (partial — idempotency of user rows)
- **Size**: M (2 files)
- **Dependencies**: None
- **References**:
  - `supabase/migrations/20260325024939_create_profile_trigger.sql` (trigger shape)
  - `supabase/tests/projects_test.sql` (auth.users insert pattern)
  - supabase skill — keywords: local auth seeding, `auth.identities`, `email_confirmed_at`
  - https://laros.io/seeding-users-in-supabase-with-a-sql-seed-script
- **Implementation targets**:
  - `supabase/seed.sql` (extend)
  - `supabase/tests/seed_test.sql` (new — assert profile state post-seed)
- **Acceptance**:
  - [ ] After `supabase db reset`, `public.profiles` contains exactly three rows whose `display_name` and `cohort_id` are both non-null
  - [ ] The three profiles' `cohort_id` values resolve to cohort names `LGE-1`, `LGE-2`, and `Inflearn` — one profile per cohort
  - [ ] Running `supabase db reset` a second time produces the same three profile rows with the same IDs and same `display_name` values
- **Verification**:
  - `bun run test:db` — new pgTAP file asserts profile count per cohort and stable IDs
  - Manual: `supabase db reset && supabase db reset` exits 0 twice and `psql -c "SELECT count(*) FROM public.profiles"` returns 3

---

### Task 2: Home page renders three project cards with real screenshots

- **Covers**: Scenario 1 (full), Scenario 2 (partial — filtered-view counts), Scenario 3 (full — images and project rows both idempotent)
- **Size**: M (5 files)
- **Dependencies**: Task 1 (profiles must exist before projects can FK to them)
- **References**:
  - `supabase/migrations/20260414085808_create_project_screenshots_bucket.sql` (bucket shape, MIME allowlist)
  - `widgets/project-grid/api/fetch-projects.ts` (URL resolution from `screenshot_path`)
  - `shared/config/storage.ts` (bucket name constant)
  - supabase skill — keywords: `objects_path`, `[storage.buckets]`, storage seeding
  - https://github.com/supabase/cli/issues/2413 (CLI support for `objects_path`)
- **Implementation targets**:
  - `supabase/config.toml` (add `objects_path` line inside existing `[storage.buckets."project-screenshots"]` block)
  - `supabase/seed/project-screenshots/<owner-uuid>/<file>.png` × 3 (real PNG fixtures, each < 500 KB, MIME `image/png`)
  - `supabase/seed.sql` (INSERT three `public.projects` rows)
  - `supabase/tests/seed_test.sql` (extend — assert 3 project rows with matching screenshot paths)
  - `e2e/seed-demo.spec.ts` (new — Playwright asserts rendered cards and cohort filter)
- **Acceptance**:
  - [ ] After `supabase db reset`, visiting `/` renders exactly three `project-card` testids, each with an `img` whose HEAD response is 200 and `content-type` is `image/png`
  - [ ] Each rendered card shows a non-empty title (≤ 80 chars), tagline (≤ 140 chars), and the correct author's `display_name`
  - [ ] The three rendered cards show three distinct `display_name` values (one per author)
  - [ ] Filtering the home page by each seeded cohort returns exactly one card; filtering by `LGE-3` (seeded but not assigned) returns zero cards
  - [ ] Each project's `screenshot_path` value matches a file present in the `storage.objects` table under bucket `project-screenshots`
  - [ ] Re-running `supabase db reset` produces the same three cards with the same image URLs
- **Verification**:
  - `bun run test:db` — pgTAP asserts project-row count, FK integrity, and that each `screenshot_path` has a matching row in `storage.objects`
  - `bun run test:e2e -- e2e/seed-demo.spec.ts` — Playwright asserts three cards visible, HEAD-fetches each image URL to confirm 200 + `image/png`, and asserts cohort-filtered card counts (1 each for `LGE-1`/`LGE-2`/`Inflearn`; 0 for `LGE-3`)
  - `bun run build` — ensures no broken imports from seed changes

---

### Checkpoint: After Tasks 1-2

- [ ] `bun run test` passes (Vitest unit + pgTAP seed assertions)
- [ ] `bun run test:e2e -- e2e/seed-demo.spec.ts` passes: home page shows 3 image-backed cards; cohort filter returns 1 / 1 / 1 / 0 across the four cohorts
- [ ] `bun run build` succeeds
- [ ] Manual: `supabase db reset` twice in a row, both exit 0, final state is identical
- [ ] Evidence: screenshot of home page showing three seeded cards saved to `artifacts/create-seed-data/evidence/home-page.png`

## Undecided Items

- Exact three fixture images: will use Lorem-style generated PNGs (gradient + text label) ≤ 500 KB each unless the reviewer specifies a different source. If you want a specific look, swap the files in Task 2 — the paths in `seed.sql` can stay unchanged.
