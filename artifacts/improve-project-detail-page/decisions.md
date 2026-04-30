# improve-project-detail-page Execution Decisions

Running log of Team Lead judgment calls during `/execute-plan`. See `.claude/skills/execute-plan/references/decisions-template.md` for format.

---

## Reviewer selection

**When**: Step 2
**Decision**: Run `wireframe-reviewer`, `ui-quality-reviewer`, `design-reviewer`, `react-reviewer` at the end (Step 5).
**Why**: `artifacts/improve-project-detail-page/wireframe.html` exists with three screens (Submit page, Detail body, Comments). Tasks T4-T15 ship UI built from shadcn primitives + reui hooks inside Next.js App Router (server components + client islands), so all four reviewer rules trigger.
**Harness Signal**: N/A — the rule in `SKILL.md` Step 2 already captures this.
**Result**: Pending

---

## Task execution order

**When**: Step 3
**Decision**: Execute in plan.md order (T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8 → T9 → T10 → T11 → T12 → T13 → T14 → T15 → T16) with checkpoints after T3, T5, T8, T10, T14, T16.
**Why**: plan.md encodes per-Task `Dependencies` fields and the order honors them:
- T1-T3 schema layer (each depends on the prior).
- T4-T5 detail-page reachability (T4 needs T1, T5 needs T4).
- T6-T8 submit-flow conversion (T6 needs T4 for redirect; T7 needs T6; T8 needs T7+T4).
- T9-T10 gallery + edit page (need prior schema + submit work).
- T11-T14 comments (T11 needs T2+T4; subsequent tasks build up).
- T15-T16 polish.
No reordering needed.
**Harness Signal**: N/A — plan.md's explicit per-Task `Dependencies` made order derivable.
**Result**: Pending

---

## T1: pgTAP `col_default_is` not used for jsonb default

**When**: Step 4, Task 1
**Decision**: Skip `col_default_is` for the `images jsonb` default and rely on indirect verification (the backfill migration assertion + an INSERT-then-SELECT round trip if added later).
**Why**: pgTAP's `_def_is` helper double-casts the default expression text (`'[]'::jsonb`) back to jsonb and the round-trip fails for jsonb literal defaults — the `'` characters in the text break the cast.
**Harness Signal**: The `supabase` skill's `testing.md` could note that `col_default_is` is unsafe for jsonb literal defaults; recommend testing the default via INSERT round-trip instead.
**Result**: Pending

---

## T1: accepted spurious view-recreate in `db diff` output

**When**: Step 4, Task 1, post-diff drift verification
**Decision**: Treat the view-recreate drift in `supabase db diff` as a known migra serialization limitation and not a real drift. The shipped migration explicitly includes `with (security_invoker = false)` and re-grants `select` to `anon, authenticated`; the live DB state confirms both are applied.
**Why**: When the view's column list changes, migra emits `drop view + create view` text but cannot serialize `WITH (security_invoker = ...)` reloptions or grants. The schema file and the migration both include them, so the actual DB is correct — this is the same residual-drift pattern documented for `handle_new_user` / `on_auth_user_created` in `artifacts/project-board/decisions.md`.
**Harness Signal**: The `supabase` skill's post-diff checklist (`.claude/rules/supabase-migration.md`) could add a note: "View recreates that lose `WITH` reloptions or `GRANT` statements are migra serialization gaps — verify the migration restores them, then ignore the recurring diff." A migrate-verifier could also cross-check `pg_class.reloptions` and `pg_proc` privileges against the schema.
**Result**: Pending
