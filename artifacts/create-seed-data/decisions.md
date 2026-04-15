# Decisions — create-seed-data

## No Reviewers for this feature

**When**: Step 2, Reviewer selection
**Decision**: Skip `wireframe-reviewer`, `ui-quality-reviewer`, `design-reviewer`, `react-reviewer`.
**Why**: Task 3 (dev-only login UI) was removed before execution. Remaining Tasks 1 and 2 are pure data/infra — SQL seed, config.toml, PNG fixtures, pgTAP test, Playwright E2E. No React/Next.js UI code is added or modified, and no wireframe exists. None of the listed reviewers match the scope.
**Harness Signal**: `execute-plan` reviewer list assumes UI changes are the main risk surface. For pure-data/infra features, a `sql-reviewer` or `supabase-reviewer` equivalent would be useful — today, such features skip formal review entirely.
**Result**: Pending

## Task execution order: Task 1 → Task 2

**When**: Step 3, Task ordering
**Decision**: Execute Task 1 (auth users + profiles) before Task 2 (projects + screenshots).
**Why**: Task 2's `public.projects` rows FK into `public.profiles.id`. Reversing the order would fail FK constraints at seed time.
**Harness Signal**: plan.md already encodes this via the `Dependencies: Task 1` field on Task 2. No harness change needed.
**Result**: Pending

## Demo display_names collided with existing pgTAP fixtures

**When**: Step 4, Task 1 verification
**Decision**: Renamed demo profiles from `Alice` / `Bob` / `Carol` to `지우` / `하늘` / `소라`.
**Why**: `profiles_test.sql:273` claims `'Alice'` as the reference value for a case-insensitive uniqueness collision test. Because seed.sql persists across resets, the seeded Alice was already present when the test tried to insert its own Alice — causing a 4-test failure. Renaming to distinctive Korean names removes the collision without touching the test file.
**Harness Signal**: When plan.md adds fixture data that persists in the DB (seed.sql), existing pgTAP tests that create overlapping fixtures will fail. The plan's Acceptance bullets did not include a "seed must not collide with existing test fixtures" check, and `/draft-plan` has no step that surveys existing test data for naming conflicts. Consider adding a "fixture-collision scan" to `/draft-plan` when a Task modifies `supabase/seed.sql`.
**Result**: Success — all 105 pgTAP tests pass after rename.
