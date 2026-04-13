# Micro-Hunt Execution Decisions

Running log of Team Lead judgment calls during `/execute-plan`. See
`.claude/skills/execute-plan/references/decisions-template.md` for format.

---

## Reviewer selection

**When**: Step 2
**Decision**: Use `ui-quality-reviewer`, `design-reviewer`, and `react-reviewer`. Skip `wireframe-reviewer`.
**Why**: No `wireframe.html` exists in `artifacts/micro-hunt/`, so wireframe-vs-impl comparison is not applicable. The plan has heavy UI work (Tasks 5, 6, 7, 9, 10, 11) composed of shadcn components inside React Server Components + client islands, so the other three reviewers all apply.
**Harness Signal**: N/A — the rule in `SKILL.md` Step 2 already captures this ("when wireframe.html exists" / "when UI present" / "when UI components present" / "when React/Next.js present").
**Result**: Pending

---

## Task execution order

**When**: Step 3
**Decision**: Execute in plan.md order — `1 → 2 → 3 → 4 → 5 → 6 → 7 → 8a → 8b → 9 → 10 → 11 → 12`.
**Why**: plan.md already encodes dependencies in the "Dependencies" field per Task, and the sequence honors them:
- Tasks 1–3 build DB schema bottom-up (cohorts → projects → votes).
- Task 4 (storage bucket) has no hard deps on 1–3 but belongs in the "infrastructure" group before any UI consumer.
- Tasks 5–11 depend on 1–4 and on each other (5 → 6 → 7 → 8a → 9 → 10 → 11, with 8b parallel to 9+).
- Task 12 depends on 5–11.
No reordering was needed; the plan's ordering is already dependency-correct.
**Harness Signal**: N/A — plan.md's explicit per-Task "Dependencies" field made ordering derivable without guesswork.
**Result**: Pending

---

## Task 1: accepted pre-existing drift on `handle_new_user` / `on_auth_user_created`

**When**: Step 4, Task 1, `supabase db diff` verification
**Decision**: Strip the auto-generated drop statements for `public.handle_new_user()` and the `on_auth_user_created` trigger from the generated migration, and ignore them in the post-migration drift check.
**Why**: Per `.claude/rules/supabase-migration.md`, triggers and trigger functions live exclusively in manual migrations. The declarative diff tool cannot represent them, so it always emits drops when regenerating schema. This drift exists independently of Task 1's changes and was present in the repo before I started. Leaving the drops in the migration would break profile auto-creation on new signups.
**Harness Signal**: The `supabase` skill could add a "Expected residual drift" note explaining that projects using the trigger-via-migration pattern will always show `drop function`/`drop trigger` lines in `supabase db diff`, and that the fix is to delete those lines from the generated migration (never hand-modify the manual trigger migration itself).
**Result**: Success — tests pass, `bun run build` green, trigger still wired on reset.

---

## Task 1: anon vs authenticated access to profile author names

**When**: Step 4, Task 1, RLS design
**Decision**: Broaden `profiles` SELECT to `authenticated` (all rows), leave anon with no direct profile access. Defer the anon-sees-author-name requirement to Task 2 via the `projects_with_vote_count` view's `security_invoker` setting.
**Why**: spec.md Scenario 1 says anon visitors see cards that include `author display_name`, but plan.md Task 1 explicitly scopes the broader SELECT policy to `authenticated` only, and plan.md Task 2 says the view should be `security_invoker = true`. These two statements conflict for anon readers. Deferring resolution to Task 2 keeps the Task 1 change surface minimal and lets the view be tuned there (e.g. joining via a narrow public-projection view or switching to `security_invoker = false` scoped to the display-only columns).
**Harness Signal**: `draft-plan` could check spec Scenarios marked "any visitor" against plan.md RLS decisions and flag any authenticated-only policies on entities that anon needs to read through a view. A "public reachability" cross-check would catch this before execution.
**Result**: Pending — resolution belongs to Task 2.
