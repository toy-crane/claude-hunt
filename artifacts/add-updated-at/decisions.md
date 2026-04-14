# add-updated-at — Decisions Log

## No Reviewers selected

**When**: Step 2, Reviewer selection
**Decision**: Skip all four standard Reviewers (`wireframe-reviewer`, `ui-quality-reviewer`, `design-reviewer`, `react-reviewer`).
**Why**: The feature touches only Postgres schemas, migrations, pgTAP tests, and the auto-generated Supabase types file. No wireframe exists (spec has no UI). No React/Next.js code is modified. None of the four listed Reviewers match this surface area. Spec conformance is verified directly by pgTAP (`bun run test:db`) + `bun run typecheck` + `bun run build` at the final checkpoint.
**Harness Signal**: `execute-plan/SKILL.md` Step 2 lists four UI/React Reviewers but is silent on pure-infrastructure features (DB migrations, CI config, etc.). Consider adding explicit guidance: "If none of the listed Reviewers match, state that explicitly in decisions.md and rely on the plan's Verification steps as the evaluation signal." Alternatively, document a `code-reviewer` or `security-auditor` escalation path for non-UI changes.
**Result**: Success — final checkpoint (`bun run test`, `bun run typecheck`, `bun run build`) is clean without any Reviewer pass. Spec Scenarios 1–5 and all three Invariants are covered by 81 pgTAP assertions across five test files.

## Stripped `supabase db diff` output to avoid regressing undeclared resources

**When**: Step 4, Task 4 (votes column add)
**Decision**: After running `supabase db diff -f add_updated_at_to_votes`, manually edited the generated migration to keep only the `alter table public.votes add column updated_at …` line. Discarded all other statements the tool emitted.
**Why**: The declarative schemas directory (`supabase/schemas/`) only holds tables and one view. It does not declare extensions, trigger functions, non-column triggers, storage policies, or the `handle_new_user` auth trigger. The diff tool therefore sees those resources as "drift" and emits `drop` statements for them. Committing the unedited diff would have removed the `moddatetime` extension, the `handle_updated_at` triggers added in Tasks 1–2, `prevent_self_vote` + `prevent_self_vote_before_insert`, `handle_new_user` + `on_auth_user_created`, all four storage-objects policies, and recreated `projects_with_vote_count` without `with (security_invoker = false)` (a security regression). The `.claude/rules/supabase-migration.md` rule already says to "Review the generated migration file before committing" — this review caught a severe regression.
**Harness Signal**: `.claude/rules/supabase-migration.md` currently warns "Review the generated migration file before committing" but does not spell out the specific failure mode. Consider adding a bullet under *Declarative Path*: "If your `supabase/schemas/` directory does not contain every resource in the DB (triggers, functions, extensions, storage policies, etc.), the diff tool will emit drop statements for the missing ones. Strip the generated migration down to only the change you actually intended." The same applies to any project where schemas are partial.
**Result**: Success — hand-edited migration applied cleanly; existing triggers/functions/policies remain intact after `supabase db reset`.

## Dropped Task 3 (cohorts) after discovering concurrent work on main

**When**: `/merge`, during `git rebase origin/main`
**Decision**: Rebased this branch fresh off `origin/main` and cherry-picked only Tasks 1, 2, 4, and 5. Dropped the Task 3 (cohorts column + trigger) commit because `main` shipped the same work independently in `20260414043141_add_cohort_label_and_updated_at.sql` + `20260414043223_add_cohorts_updated_at_trigger.sql` (content identical to our local cohort trigger migration). Our cohorts work had already been delivered through a different PR; re-landing it would create redundant migrations.
**Why**: The rebase hit conflicts in `supabase/schemas/cohorts.sql`, `supabase/tests/cohorts_test.sql`, `supabase/schemas/votes.sql`, `supabase/tests/profiles_test.sql`, and both Cohort test fixtures. Main had also added a `label` column to cohorts and changed the `handle_new_user` semantics — enough parallel drift that the cleanest resolution was Option A: fresh branch off main, cherry-pick the non-overlapping commits only. Spec scenarios for cohorts are still satisfied (main delivered them). Plan Task 3 stays as-written in `plan.md` for historical record.
**Harness Signal**: `/merge` catches a stale branch via rebase conflicts, but has no mechanism to detect that the same work has already been delivered independently on main. Consider: before `git rebase origin/main`, run `git log origin/main --since=<branch_base_date> -- <files-this-branch-touches>` and warn if overlapping files were modified upstream. Also, `draft-plan` could query `git log origin/main --oneline` for each Task's Affected Files to surface "work already in flight on main."
**Result**: Success — fresh branch `feat/add-updated-at` has 81 pgTAP tests passing, typecheck clean (existing `app/layout.test.tsx` Twitter-metadata error is pre-existing on main and unrelated), and all Tasks 1/2/4/5 acceptance criteria verified.

## Sequential Task order 1 → 2 → 3 → 4 → 5

**When**: Step 3, Task ordering
**Decision**: Execute Tasks in the exact order listed in plan.md.
**Why**: Tasks 1–4 are mutually independent (different tables, no shared files beyond the global migrations directory which is timestamp-ordered). Task 5 depends on Tasks 3 & 4 because `gen:types` needs the new columns applied. The plan already places simplest-first (trigger-only) before more-involved (column + trigger), which also acts as a warm-up for the pgTAP assertions. No parallelization benefit inside a single-agent Team Lead loop.
**Harness Signal**: N/A
**Result**: Success — Tasks 1, 2, 4 ran cleanly in order. Task 3 was dropped at `/merge` time (see separate entry above). Task 5 consumed Task 4's schema output.
