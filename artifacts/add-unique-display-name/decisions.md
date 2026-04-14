# add-unique-display-name — Execution Decisions

## Branch pointer drifted to main mid-execution

**When**: Step 4, between Task 1 commit and Task 3 commit — observed twice
**Decision**: Detected both times via `git branch --show-current` after commit. Used `git branch -f feat/add-unique <sha>` + `git checkout feat/add-unique` to move commits onto the intended branch without any destructive operations.
**Why**: At two points during execution, HEAD was on `main` when I expected `feat/add-unique`. Root cause unknown — possibly cmux worktree/auto-pull behavior syncing main. Leaves `main` locally ahead of `origin/main` by the Task 1 commit; this is stale and should be reset back to `origin/main` before any future `main` work (not done here because `git reset --hard` is a destructive command per CLAUDE.md safety rules; flagged for user).
**Harness Signal**: Branch-drift mid-execution is a silent failure mode that `execute-plan` does not currently guard against. Consider adding a lightweight branch-check hook or instructing the skill to re-assert `git branch --show-current == expected_branch` before each commit. Especially relevant in environments where something (pull automation, worktree tooling) can silently fast-forward or checkout branches.
**Result**: Success — all three Task commits landed on `feat/add-unique`; no code lost; `main` cleanup deferred to user.

## Reviewer selection — react-reviewer only

**When**: Step 2, Reviewer combination
**Decision**: Run `react-reviewer` at the end. Skip `wireframe-reviewer`, `ui-quality-reviewer`, and `design-reviewer`.
**Why**:
- `wireframe-reviewer` requires a wireframe — this feature has none (no UI structure change, only new error strings on existing forms)
- `ui-quality-reviewer` / `design-reviewer` require UI changes — none present
- `react-reviewer` applies because Task 2 and Task 3 modify Next.js server actions; keeping it in the loop is cheap insurance against subtle RSC/`revalidatePath` regressions even though the change is narrow
**Harness Signal**: For pure data-layer + action-layer features with no UI delta, the reviewer list often collapses to just `react-reviewer`. Consider adding a template line to `execute-plan` SKILL.md: "if no UI Tasks, select only `react-reviewer` (still valid because server actions are React/Next.js)."
**Result**: Success — `react-reviewer` passed all concerns (use server, revalidatePath, auth in action, error flow, RSC boundaries); one Advisory noting acceptable helper duplication across two call sites

## Stripped noisy drops from generated migration

**When**: Step 4, Task 1 — after running `supabase db diff`
**Decision**: Reduce `supabase/migrations/20260414052316_add_unique_display_name_to_profiles.sql` to a single statement: `CREATE UNIQUE INDEX profiles_display_name_ci_unique ...`. Removed `DROP EXTENSION moddatetime`, four `DROP TRIGGER handle_updated_at` statements, `DROP TRIGGER prevent_self_vote_before_insert`, `DROP FUNCTION handle_new_user`, `DROP FUNCTION prevent_self_vote`, `DROP VIEW projects_with_vote_count` + its `CREATE OR REPLACE` re-insert, `DROP TRIGGER on_auth_user_created`, and four storage-objects `DROP POLICY` statements.
**Why**: These resources are created by manual migrations (triggers, functions, storage policies cannot be captured by `supabase db diff` — see `.claude/skills/supabase/references/declarative-schemas.md` and the CLI's own warning). If retained, the migration would delete live runtime resources: cohort/profiles/projects/votes would lose their `updated_at` automation, `on_auth_user_created` would stop auto-creating profiles, vote-self-blocking would disappear, and the storage bucket's RLS policies would vanish. The view drop+recreate is a safe round-trip but unnecessary for an index-only change.
**Harness Signal**: This specific noise pattern is recurring (every recent migration diff in the repo would trip on it). Consider adding to the `supabase` skill's `declarative-schemas.md` a concrete "expected noise to strip" checklist — or a `scripts/` helper that post-processes `db diff` output to remove drops for non-declarative resources.
**Result**: Success — cleaned migration applied cleanly via `supabase db reset`; pgTAP suite (86 tests) passes; all live triggers/functions/views/storage policies preserved

## Task execution order — 1 → 2 → 3 (sequential)

**When**: Step 3, Task ordering
**Decision**: Execute Task 1 first (DB constraint), then Task 2 (Onboarding action), then Task 3 (Settings action). Sequential, no parallelism.
**Why**:
- Tasks 2 and 3 both depend on Task 1 — without the unique index, the 23505 path can never fire in a real integration test, and the pgTAP assertions in Task 1 prove the DB invariant that the action-layer code presumes
- Tasks 2 and 3 are independent of each other in principle, but they share the same "detect 23505 → return friendly message" pattern. Running 2 first lets me finalize the pattern and apply it identically in 3, minimizing divergence risk
**Harness Signal**: N/A — standard dependency-first ordering
**Result**: Success — executed 1 → 2 → 3 as planned; each Task committed atomically
