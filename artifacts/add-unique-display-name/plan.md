# add-unique-display-name Implementation Plan

## Architecture Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Uniqueness layer | Unique functional index on `lower(btrim(display_name))` in `public.profiles` | DB is the single source of truth. Unique indexes are atomic under concurrent writes and honour the spec's invariant from any write path (onboarding, settings, future admin paths). Indexing on `lower(btrim(...))` enforces the case-insensitive-after-trim rule independently from the app layer (defence in depth, since the app already trims before writing). |
| NULL handling | Rely on Postgres default (multiple NULLs are distinct under a unique index) | Profiles exist with `display_name IS NULL` between signup and onboarding completion; those rows must not collide with each other or with set names. No `WHERE` predicate needed. |
| Stored casing | Column stays `text`; no normalization of stored value | Spec requires the user's original casing to remain visible on project cards and the header menu. Only the *comparison* is case-insensitive. |
| Error mapping | Server actions detect Postgres error code `23505` whose `constraint` refers to the new index, and return a stable `"That display name is already taken"` message | Keeps the UI surface unchanged — forms already render `result.error` / `result.error.message`. Matching the specific constraint (not any 23505) avoids misreporting unrelated unique conflicts. |
| Self-save semantics | No explicit "same value" short-circuit | Updating a row to a value that only collides with its own `lower(btrim(...))` is permitted by the unique index. The DB naturally satisfies Scenario 4 without app-side special casing. |
| Test boundaries | pgTAP for the DB invariant; Vitest for the action-layer error mapping; reuse existing form tests for the UI surfacing | Per the project's testing principle, pick the lowest boundary where each criterion is actually provable. Unit tests that mock Supabase cannot prove atomicity; pgTAP can. Error-message pass-through is pure action logic. |

## Infrastructure Resources

None — this feature is a schema constraint and two action changes. No new buckets, env vars, cron jobs, or webhooks.

## Data Model

### Profile (existing)
- id (uuid, FK → auth.users)
- email (required)
- full_name
- **display_name** (nullable; newly constrained — unique across profiles after `lower(btrim(...))`)
- avatar_url
- cohort_id → Cohort
- created_at, updated_at

No new entities, no new columns.

## Required Skills

| Skill | Applicable Task | Purpose |
|-------|-----------------|---------|
| test-driven-development | All tasks | RED → GREEN discipline; one acceptance bullet → one test case |
| supabase | Task 1 | `supabase db diff` workflow, schema-first edits, pgTAP assertions |
| supabase-postgres-best-practices | Task 1 | Functional unique indexes, 23505 semantics, NULL-in-unique-index behaviour |

## Affected Files

| File Path | Change Type | Related Task |
|-----------|-------------|--------------|
| `supabase/schemas/profiles.sql` | Modify | Task 1 |
| `supabase/migrations/<timestamp>_add_unique_display_name_to_profiles.sql` | New (generated via `supabase db diff`) | Task 1 |
| `supabase/tests/profiles_test.sql` | Modify (add ~5 assertions, bump `plan(N)`) | Task 1 |
| `shared/api/supabase/types.ts` | Regenerated (no expected diff — a functional index does not change the TS surface) | Task 1 |
| `features/onboarding/api/actions.ts` | Modify | Task 2 |
| `features/onboarding/api/actions.test.ts` | Modify (add conflict-mapping tests) | Task 2 |
| `features/settings/api/actions.ts` | Modify | Task 3 |
| `features/settings/api/actions.test.ts` | Modify (add conflict-mapping + self-save tests) | Task 3 |

## Tasks

### Task 1: Enforce case-insensitive uniqueness on profiles.display_name at the DB — ✅ Complete

- **Covers**: Invariant (data consistency); underpins Scenarios 2, 3, 4 (provides the constraint they rely on)
- **Size**: M (schema + migration + pgTAP tests = 3 files)
- **Dependencies**: None
- **References**:
  - `supabase` skill — keywords: modifying-table, declarative-schemas, testing, db diff
  - `supabase-postgres-best-practices` skill — keywords: functional index, unique index, 23505
  - `.claude/rules/supabase-migration.md` — diff-first workflow is mandatory
  - `supabase/schemas/profiles.sql`
  - `supabase/tests/profiles_test.sql`
- **Implementation targets**:
  - `supabase/schemas/profiles.sql` — add `create unique index profiles_display_name_ci_unique on public.profiles (lower(btrim(display_name)));`
  - `supabase/tests/profiles_test.sql` — new pgTAP assertions (bump `plan(26)` accordingly)
  - `supabase/migrations/<timestamp>_add_unique_display_name_to_profiles.sql` — generated, reviewed, left unedited
- **Acceptance**:
  - [x] `supabase test db` passes after the migration is applied
  - [x] Inserting a second profile with `display_name = 'alice'` while another profile holds `'Alice'` raises a unique-violation error (23505)
  - [x] Inserting a second profile with `display_name = '  Alice  '` (surrounding whitespace) while another holds `'Alice'` also raises 23505 (proves the `btrim` half of the rule)
  - [x] Two rows with `display_name IS NULL` coexist without error
  - [x] A user updating their own profile's `display_name` from `'Alice'` to `'ALICE'` succeeds (own-row case-variant is not a conflict)
  - [x] The unique index `profiles_display_name_ci_unique` exists on `public.profiles`
- **Verification**:
  - `supabase db reset` (clean replay of all migrations)
  - `bun run test:db`
  - `bun run gen:types` then `bun run typecheck` (no type change expected, but verify)

---

### Task 2: Onboarding action maps unique-violation to "already taken" — ✅ Complete

- **Covers**: Scenario 1 (full), Scenario 2 (full)
- **Size**: S (2 files)
- **Dependencies**: Task 1 (the unique index must exist, otherwise the 23505 can never fire in reality)
- **References**:
  - `test-driven-development` skill — keywords: RED-GREEN, one-bullet-one-test
  - `features/onboarding/api/actions.ts`
  - `features/onboarding/api/actions.test.ts`
- **Implementation targets**:
  - `features/onboarding/api/actions.ts` — after the `supabase.from("profiles").upsert(...)` call, inspect the returned error: if `error.code === "23505"` and `error.message`/`error.details` references `profiles_display_name_ci_unique`, return `{ ok: false, error: "That display name is already taken" }`; otherwise keep the existing pass-through behaviour
  - `features/onboarding/api/actions.test.ts` — new test cases stubbing `upsertError` with `{ code: "23505", message: "...profiles_display_name_ci_unique..." }`
- **Acceptance**:
  - [x] `completeOnboarding({ displayName: "Alice", cohortId })` with no upsert error → returns `{ ok: true }` (Scenario 1)
  - [x] `completeOnboarding({ displayName: "alice", cohortId })` where the upsert returns a `23505` error referencing `profiles_display_name_ci_unique` → returns `{ ok: false, error: "That display name is already taken" }` (Scenario 2 — the value the form will render as its error message)
  - [x] An unrelated `23505` (hypothetical future constraint) does NOT get mapped to the "already taken" message — other upsert errors still pass through unchanged (guards against Task-3 regressions too)
  - [x] The existing server-error-passthrough test in `onboarding-form.test.tsx` (`surfaces server-side errors and does not redirect`) continues to pass when the action returns the new message, proving the form preserves the typed value and does not navigate
  - [x] Existing `widgets/header/ui/header-menu.test.tsx` assertions that render the profile's `display_name` continue to pass unchanged (Scenario 1 Success Criterion 2 — the header reflects the newly-set name on next render; this feature does not alter the header surface, only the pre-redirect action path)
- **Verification**:
  - `bun run test:unit -- features/onboarding`
  - `bun run test:unit -- widgets/header` (no regression)
  - `bun run build`

---

### Checkpoint: After Tasks 1–2

- [ ] All tests pass: `bun run test`
- [ ] Build succeeds: `bun run build`
- [ ] End-to-end smoke (manual, optional): with two local accounts, the second signup cannot complete onboarding with an existing display name and sees the "already taken" error

---

### Task 3: Settings action maps unique-violation to "already taken" (including self-save) — ✅ Complete

- **Covers**: Scenario 3 (full), Scenario 4 (full)
- **Size**: S (2 files)
- **Dependencies**: Task 1 (unique index must exist); independent of Task 2
- **References**:
  - `test-driven-development` skill — keywords: RED-GREEN
  - `features/settings/api/actions.ts`
  - `features/settings/api/actions.test.ts`
  - `features/settings/ui/settings-form.test.tsx` (already surfaces `result.error.message`)
- **Implementation targets**:
  - `features/settings/api/actions.ts` — after the `update(...).eq("id", user.id)` call, inspect the error: if `error.code === "23505"` and references `profiles_display_name_ci_unique`, return `{ ok: false, error: { field: "displayName", message: "That display name is already taken" } }`
  - `features/settings/api/actions.test.ts` — new test cases: (a) 23505 on the unique index maps to the "already taken" message; (b) no-op self-save (same value, no DB error) returns `{ ok: true }`; (c) unrelated errors still pass through
- **Acceptance**:
  - [x] `updateDisplayName("Bob")` with a `23505` error referencing `profiles_display_name_ci_unique` → returns `{ ok: false, error: { field: "displayName", message: "That display name is already taken" } }` (Scenario 3 — this is exactly what `<SettingsForm />` renders as an inline error)
  - [x] `updateDisplayName("Alice")` when the DB does not error (user's current value is "Alice" so no collision) → returns `{ ok: true }`, update is called with `{ display_name: "Alice" }` (Scenario 4)
  - [x] An unrelated `23505` is passed through as the raw error message (not remapped)
  - [x] When the unique-violation path fires, the Supabase `update` mutation is never committed — the action test asserts `eq(...)` resolves with an error and the caller receives `ok: false` before any downstream write (Scenario 3 Success Criterion 3: since no row changes, project cards authored by this user cannot flip to the rejected name)
  - [x] Existing settings-form tests still pass — `router.refresh` runs on success and the error message renders under the field on failure (proves "stored value unchanged" from Scenario 3: the UI never flips to the attempted value on error)
- **Verification**:
  - `bun run test:unit -- features/settings`
  - `bun run build`

---

### Checkpoint: After Task 3

- [ ] All tests pass: `bun run test`
- [ ] Build succeeds: `bun run build`
- [ ] Vertical slice works end-to-end: a signed-in user on `/settings` cannot rename to another user's display name (case-insensitive), but can save their own current name with no error

---

## Undecided Items

_None — all decisions captured above._
