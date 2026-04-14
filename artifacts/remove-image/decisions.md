# remove-image — Execution Decisions

## No UI/React reviewers applicable

**When**: Step 2, Reviewer selection
**Decision**: Skip `wireframe-reviewer`, `ui-quality-reviewer`, `design-reviewer`, and `react-reviewer`. Run `code-reviewer` as a general quality gate at Step 5.
**Why**: The feature only changes server actions and tests — no UI, no React components, no design tokens. Four of the five conditional reviewers' preconditions (UI change / React code / wireframe / UI component) are not met. The plan's Required Skills list does call for `code-review-and-quality` at the final checkpoint, so `code-reviewer` still runs.
**Harness Signal**: execute-plan/SKILL.md Step 2 lists only four conditional reviewers keyed to UI/React. A pure-backend feature has no obvious fit. Consider adding "server-action-reviewer" or explicitly noting that `code-reviewer` is the default when none of the four apply.
**Result**: Success

## Task order: 1 → 2 → 3

**When**: Step 3, Task ordering
**Decision**: Execute Task 1 (edit-project cleanup), then Task 2 (delete-project non-blocking test), then Task 3 (E2E).
**Why**: Task 3's replace-side 4xx assertion requires Task 1's cleanup to be live. Task 2 has no dependency on Task 1, but keeping it in the middle ends both server-action changes before the real-bucket E2E work begins. Sequential execution is simpler to reason about than parallel here — three small tasks in one file each.
**Harness Signal**: N/A
**Result**: Success

## Strengthened the non-blocking test before RED→GREEN

**When**: Step 4, Task 1 (during RED)
**Decision**: Added `expect(storageRemove).toHaveBeenCalledTimes(1)` to the "still returns ok when storage removal fails" case. The original draft only asserted `{ ok: true }`, which passes trivially when no cleanup is attempted at all — a false positive.
**Why**: RED showed only 1 of the 4 new cases failed on the un-patched action. The non-blocking test was vacuous without pinning that cleanup *was* attempted. Tightening it turned the invariant into a real regression guard.
**Harness Signal**: When writing a test for a "fail-soft" / "errors are ignored" invariant, assert both (a) the protective behavior was exercised, and (b) the happy result was preserved. A single assertion on the happy result alone is vacuous.
**Result**: Success — tightened test still passed under the patched action.

## Added SUPABASE_SECRET_KEY to .env.local (used wrong value first)

**When**: Step 4, Task 3 (E2E preflight)
**Decision**: Appended `SUPABASE_SECRET_KEY=sb_secret_...` to `.env.local` (gitignored). First attempt used the S3 storage secret key instead of the Supabase auth Secret; corrected after seeing "invalid JWT" at teardown.
**Why**: `createAdminClient` in `e2e/helpers/supabase-admin.ts` needs the Supabase auth secret to impersonate the service role. `supabase status` lists two similar-looking "Secret" fields (auth Secret and S3 Secret Key) — the S3 one is not an auth credential.
**Harness Signal**: CLAUDE.md says "copy from `supabase status`" but the output exposes two "Secret" fields. Clarifying that the *auth* Secret (format `sb_secret_...`) is the one needed — not the S3 Secret Key — would prevent this misstep.
**Result**: Success — E2E ran once the correct key was in place.

## Ran `supabase db reset` mid-execution

**When**: Step 4, Task 3 (E2E preflight)
**Decision**: Ran `supabase db reset` once the test reported "Cohort A seed missing".
**Why**: The E2E helper depends on a "Cohort A" row seeded by migration `20260413155559_seed_cohorts.sql`. Local DB had been in an older state; `db reset` replays migrations and seeds.
**Harness Signal**: N/A (standard preflight; CLAUDE.md already documents the requirement).
**Result**: Success — cohort seed present after reset.

## Ignored pre-existing `auth/signup-to-main` E2E failure

**When**: Step 4, Task 3 (full E2E run)
**Decision**: Did not fix `e2e/auth/signup-to-main.spec.ts` failure ("unexpected value …/onboarding?next=/"). Confirmed identical failure on the base branch via `git stash && bun run test:e2e -- --grep "new user lands on main page"`.
**Why**: Out of scope for the remove-image feature — no files changed by this work touch the auth/onboarding flow. Spec conformance is the goal; unrelated pre-existing failures are not part of this execution.
**Harness Signal**: execute-plan/SKILL.md could call out explicitly that pre-existing, unrelated test failures observed during final verification should be (a) proved pre-existing, (b) logged here, (c) surfaced in Step 6 — rather than blocking the execution.
**Result**: Success (surface in Step 6 report).
