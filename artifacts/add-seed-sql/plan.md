# add-seed-sql Implementation Plan

## Context

The local database currently bootstraps cohort rows through a migration (`supabase/migrations/20260413155559_seed_cohorts.sql`) that inserts two placeholder names, `Cohort A` and `Cohort B`. The user wants:

1. Four real cohorts identified by stable slugs in the DB (`LGE-1`, `LGE-2`, `LGE-3`, `Inflearn`) and displayed with Korean labels in the UI (`LG전자 1기`, `LG전자 2기`, `LG전자 3기`, `인프런`).
2. Cohort rows to be seeded from a declarative `supabase/seed.sql` instead of a migration, so migrations stay purely structural.

To split identity from display, this plan adds a new `label` column to `public.cohorts`. The existing `name` column keeps its role as a stable slug (used in e2e lookups and URLs), and `label` carries the user-facing Korean text.

**Secondary cleanup picked up by the schema edit.** The `cohorts` table is currently missing the `updated_at` column and `moddatetime` trigger required by `.claude/rules/supabase-timestamps.md`. Because we are already editing `supabase/schemas/cohorts.sql`, the same change-set brings the table into compliance so we do not knowingly extend an existing rule violation while adding `label`.

**Out of scope.** The `public.projects_with_vote_count` view exposes `cohort_name` (projecting `cohorts.name`). No production UI component currently renders this field — only test fixtures reference it. Changing the view to return `cohort_label` is deferred to a future feature that actually displays cohort text on project cards.

`supabase/config.toml` already has `[db.seed] sql_paths = ["./seed.sql"]` configured; no existing `supabase/seed.sql` file is present.

## Architecture Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Name vs label separation | Keep `name` as slug; add `label` for display | Decouples UI text from stable identifiers; e2e/tests can keep targeting `name`; translators/admins can change `label` without code churn |
| Label column nullability | `label text not null` | No legacy rows to migrate (old seed rows are deleted in the same change-set); forces every new cohort to carry a label |
| Timestamp compliance | Add `updated_at` + `moddatetime` trigger to `cohorts` alongside `label` | `.claude/rules/supabase-timestamps.md` requires both on every `public.*` table; editing the schema anyway makes this the right moment to fix |
| Schema column change path | Declarative — edit `supabase/schemas/cohorts.sql`, generate migration with `supabase db diff -f add_cohort_label_and_updated_at` | Required by `.claude/rules/supabase-migration.md` |
| Trigger migration path | Manual — `supabase migration new add_cohorts_updated_at_trigger` | Required by `.claude/rules/supabase-migration.md` (triggers are explicitly listed as a manual-path exception) and by `supabase-timestamps.md` |
| Seed file path | `supabase/seed.sql` | Already declared in `config.toml`; no change needed |
| Idempotency | `INSERT ... ON CONFLICT (name) DO NOTHING` | `name` already has `unique`; matches the pattern of the deleted migration |
| Old cohort seed migration | Delete the file | Local-only project; `supabase db reset` rebuilds from migrations + seed on every machine |
| Project-view (`projects_with_vote_count.cohort_name`) | Leave unchanged | No production UI renders this field today; changing it now would expand scope unnecessarily |
| Test order | pgTAP RED before implementation | Project TDD principle |

## Infrastructure Resources

None. No runtime infrastructure introduced (buckets, cron, edge functions).

## Data Model

### `public.cohorts` (existing, extended)

Column layout after this change (ordering per `.claude/rules/supabase-timestamps.md` — `created_at`/`updated_at` last):

- `id uuid` — primary key (unchanged)
- `name text not null unique` — slug identifier (unchanged)
- `label text not null` — **NEW** human-readable display string
- `created_at timestamptz not null default now()` (unchanged)
- `updated_at timestamptz not null default now()` — **NEW** (with `moddatetime` trigger)

Post-seed rows:

| `name` | `label` |
|---|---|
| `LGE-1` | `LG전자 1기` |
| `LGE-2` | `LG전자 2기` |
| `LGE-3` | `LG전자 3기` |
| `Inflearn` | `인프런` |

## Required Skills

| Skill | Applicable Task | Purpose |
|-------|-----------------|---------|
| test-driven-development | Task 1 | RED → GREEN discipline: failing pgTAP first, then make it pass |
| supabase | Task 2 | Declarative-schema path, `supabase db diff`, `seed.sql` workflow, `supabase db reset` ordering |

Rules (loaded via CLAUDE.md — note for builder):
- `.claude/rules/supabase-migration.md` — column migration must be generated via `supabase db diff`; trigger migration must use `supabase migration new` (triggers are not captured by diff).
- `.claude/rules/supabase-timestamps.md` — verbatim template for the `moddatetime` trigger migration.

## Affected Files

| File Path | Change Type | Related Task |
|-----------|-------------|--------------|
| `supabase/tests/cohorts_test.sql` | Modify | Task 1 |
| `supabase/schemas/cohorts.sql` | Modify | Task 2 |
| `supabase/migrations/<new_ts>_add_cohort_label_and_updated_at.sql` | New (generated by `db diff`) | Task 2 |
| `supabase/migrations/<new_ts>_add_cohorts_updated_at_trigger.sql` | New (manual — `supabase migration new`) | Task 2 |
| `shared/api/supabase/types.ts` | Regenerated by `bun run gen:types` | Task 2 |
| `supabase/seed.sql` | New | Task 2 |
| `supabase/migrations/20260413155559_seed_cohorts.sql` | Delete | Task 2 |
| `features/cohort-filter/ui/cohort-dropdown.tsx` | Modify | Task 3 |
| `features/cohort-filter/ui/cohort-dropdown.test.tsx` | Modify | Task 3 |
| `features/onboarding/ui/onboarding-form.tsx` | Modify | Task 3 |
| `features/onboarding/ui/onboarding-form.test.tsx` | Modify | Task 3 |
| `app/page.test.tsx` | Modify | Task 4 |
| `app/onboarding/page.test.tsx` | Modify | Task 4 |
| `widgets/project-grid/ui/project-grid.test.tsx` | Modify | Task 4 |
| `widgets/project-grid/ui/project-card.test.tsx` | Modify | Task 4 |
| `e2e/project-board.spec.ts` | Modify | Task 4 |

Files deliberately **not** changed:
- `features/cohort-filter/api/fetch-cohorts.ts` — uses `select("*")`, so it automatically returns the new `label` column.
- `entities/cohort/model/schema.ts` — derives types from `@shared/api/supabase/types.ts`, so `Cohort` automatically gains `label: string` after `bun run gen:types`.
- `supabase/config.toml` — seed path already correct.
- `supabase/schemas/projects_with_vote_count.sql` — keeps projecting `c.name as cohort_name`; no UI currently renders this field (see Architecture Decisions).

## Tasks

### Task 1: Write failing pgTAP assertion for the new cohort contract (RED)

- **Covers**: Scenario 1 Success Criteria (cohort set equals the four target `(name, label)` pairs — full), Invariants (uniqueness — unchanged assertions stay)
- **Size**: S (1 file)
- **Dependencies**: None
- **References**:
  - test-driven-development — RED step
  - supabase — `supabase test db` runs migrations + seed before pgTAP
  - project file: `supabase/tests/cohorts_test.sql`
- **Implementation targets**:
  - `supabase/tests/cohorts_test.sql`:
    - Add `has_column('public', 'cohorts', 'label', ...)`
    - Add `has_column('public', 'cohorts', 'updated_at', ...)`
    - Replace the `count >= 2` check with a set-equality assertion (`results_eq`) against the four `(name, label)` pairs
    - Bump `SELECT plan(...)` count accordingly
- **Acceptance**:
  - [ ] `bun run test:db` fails with output naming a missing `label` column OR `updated_at` column OR a cohort-set mismatch (RED)
  - [ ] Existing assertions (RLS enabled, unique `name`, anon cannot insert) continue to pass
- **Verification**:
  - `bun run test:db` — observe new assertions fail; rest still green

---

### Task 2: Extend schema (label + updated_at + trigger), move seed to `supabase/seed.sql`

- **Covers**: Scenario 1 (full), Scenario 2 (full — idempotency), Scenario 3 (full — seed lives in `seed.sql`, not migrations); secondary `supabase-timestamps` compliance
- **Size**: M (4 non-generated files; 2 new migration files; 1 regenerated types file)
- **Dependencies**: Task 1 (this is the GREEN step)
- **References**:
  - supabase skill — declarative-schemas.md, reset-database.md
  - `.claude/rules/supabase-migration.md` — column migration via `db diff`; trigger migration via `migration new`
  - `.claude/rules/supabase-timestamps.md` — verbatim trigger template
  - project file: `supabase/config.toml` lines 66–71 (seed path)
- **Implementation targets**:
  - Edit `supabase/schemas/cohorts.sql` so the final column order is: `id`, `name`, `label text not null`, `created_at`, `updated_at timestamptz default now() not null`
  - Run `supabase db diff -f add_cohort_label_and_updated_at` → generated migration adds both new columns
  - Run `supabase migration new add_cohorts_updated_at_trigger` and write into it:
    ```sql
    create extension if not exists moddatetime schema extensions;

    create trigger handle_updated_at
      before update on public.cohorts
      for each row
      execute procedure moddatetime (updated_at);
    ```
  - Delete `supabase/migrations/20260413155559_seed_cohorts.sql`
  - Create `supabase/seed.sql`:
    ```sql
    insert into public.cohorts (name, label) values
      ('LGE-1', 'LG전자 1기'),
      ('LGE-2', 'LG전자 2기'),
      ('LGE-3', 'LG전자 3기'),
      ('Inflearn', '인프런')
    on conflict (name) do nothing;
    ```
  - Run `bun run gen:types` to regenerate `shared/api/supabase/types.ts`
- **Acceptance**:
  - [ ] After `supabase db reset`, `select name, label from public.cohorts order by name` returns exactly the four `(name, label)` pairs listed above
  - [ ] Replaying `seed.sql` a second time leaves the cohort count at 4 with no duplicate-key error
  - [ ] `grep -r "insert into public.cohorts" supabase/migrations/` returns zero matches
  - [ ] `update public.cohorts set label = label where name = 'LGE-1'` observably bumps the row's `updated_at` (trigger wiring verified)
  - [ ] The `Cohort` type exported from `@entities/cohort` includes `label: string` and `updated_at: string`
  - [ ] The pgTAP assertions introduced in Task 1 turn GREEN
- **Verification**:
  - `supabase db reset` → `bun run test:db` — pgTAP passes
  - Manual SQL: `update public.cohorts set label = label where name = 'LGE-1' returning updated_at;` — timestamp differs from `created_at`

---

### Task 3: Render `cohort.label` in onboarding + cohort-filter UIs and fix their tests

- **Covers**: Scenario 1 (onboarding-selector Success Criterion — the four Korean labels appear in the UI, full)
- **Size**: M (4 files)
- **Dependencies**: Task 2 (requires `Cohort` type to include `label`)
- **References**:
  - project file: `features/cohort-filter/ui/cohort-dropdown.tsx:66` (currently `{cohort.name}`)
  - project file: `features/onboarding/ui/onboarding-form.tsx:179` (currently `{cohort.name}`)
- **Implementation targets**:
  - `features/cohort-filter/ui/cohort-dropdown.tsx` — `{cohort.name}` → `{cohort.label}` in both the option list and the selected-trigger rendering
  - `features/cohort-filter/ui/cohort-dropdown.test.tsx`:
    - Give the two `Cohort` fixtures both `name` (slug) and `label` (display) — e.g., `{ id: "a1", name: "LGE-1", label: "LG전자 1기", created_at: ..., updated_at: ... }`
    - Update text assertions (lines 39, 45) and `findByRole("option", { name: ... })` queries (lines 53, 65) to use the `label` text
  - `features/onboarding/ui/onboarding-form.tsx` — same `.name` → `.label` change
  - `features/onboarding/ui/onboarding-form.test.tsx`:
    - Give both `Cohort` fixtures `label` (lines 26–27)
    - Update `pickCohort("...")` call sites (lines 116, 138) to pass the `label` text
- **Acceptance**:
  - [ ] Rendering the onboarding form with the four seeded cohorts shows `LG전자 1기`, `LG전자 2기`, `LG전자 3기`, `인프런` as selectable options (no slugs visible)
  - [ ] Rendering the cohort dropdown filter with the four seeded cohorts shows the same four Korean labels
  - [ ] `bun run test:unit -- cohort-dropdown onboarding-form` passes
- **Verification**:
  - `bun run test:unit -- cohort-dropdown`
  - `bun run test:unit -- onboarding-form`

---

### Task 4: Repair remaining `Cohort` fixtures + realign e2e cohort lookup

- **Covers**: Compilation invariant (all `Cohort` fixtures carry `label` + `updated_at` after Task 2); e2e flow continues to work against the new seed names
- **Size**: M (5 files)
- **Dependencies**: Task 2 (type now requires `label`/`updated_at`); Task 3 (UI renders `label`, so no e2e UI-click change needed beyond the name lookup)
- **References**:
  - project file: `e2e/project-board.spec.ts:35–43` (cohort lookup comment, `.eq("name", "Cohort A")`, error string)
- **Implementation targets**:
  - `app/page.test.tsx` — add `label` and `updated_at` to the two `Cohort` fixtures (lines 117–120); optionally rename the `cohort_name: "Cohort A"` fixture value on line 104 to `"LGE-1"` for consistency (safe: fixture is a mock view row, not DB-sourced)
  - `app/onboarding/page.test.tsx` — add `label` and `updated_at` to its `Cohort` fixture (line 62 area)
  - `widgets/project-grid/ui/project-grid.test.tsx` — rename `cohort_name: "Cohort A"` (line 12) to a new slug (e.g., `"LGE-1"`); this fixture is a `ProjectWithVoteCount` view row, not a `Cohort` entity, so no `label` field is added
  - `widgets/project-grid/ui/project-card.test.tsx` — same as above (line 13)
  - `e2e/project-board.spec.ts`:
    - Line 35 comment: `Find Cohort A (seeded via migration)` → `Find LGE-1 (seeded via seed.sql)`
    - Line 39: `.eq("name", "Cohort A")` → `.eq("name", "LGE-1")`
    - Line 42 error string: `Cohort A seed missing — run supabase db reset first` → `LGE-1 seed missing — run supabase db reset first`
- **Acceptance**:
  - [ ] `bun run test:unit` passes across all test files
  - [ ] `bun run build` succeeds with no TS errors related to missing `label` or `updated_at`
  - [ ] `bun run test:e2e -- project-board` resolves the `LGE-1` cohort and completes the end-to-end flow
- **Verification**:
  - `bun run test:unit`
  - `bun run build`
  - `bun run test:e2e -- project-board.spec.ts`

---

### Checkpoint: After Tasks 1–4

- [ ] All tests pass: `bun run test` (Vitest + pgTAP)
- [ ] E2E passes: `bun run test:e2e`
- [ ] Build succeeds: `bun run build`
- [ ] Manual verification: `supabase db reset`, then visit `/onboarding` — the cohort selector shows exactly `LG전자 1기`, `LG전자 2기`, `LG전자 3기`, `인프런` (no slugs visible to the user)

## Undecided Items

- None.
