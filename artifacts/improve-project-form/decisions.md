# Decisions — improve-project-form

## Reviewer selection: ui-quality-reviewer + design-reviewer + react-reviewer

**When**: Step 2, Reviewer selection
**Decision**: Run `ui-quality-reviewer`, `design-reviewer`, and `react-reviewer`. Skip `wireframe-reviewer`.
**Why**: No `wireframe.html` exists for this feature, so `wireframe-reviewer` has nothing to verify against. The other three apply: UI changes (trigger button, dialog, toast) → `ui-quality-reviewer`; shadcn components (`Dialog`, `Button`, `Sonner Toaster`) → `design-reviewer`; Next.js App Router page + new client component → `react-reviewer`.
**Harness Signal**: N/A — the skill's selection rules already align with what I picked.
**Result**: Pending

## Task execution order: 1 → 2 → 3 → 4 → 5

**When**: Step 3, Task ordering
**Decision**: Execute in plan-declared order: Task 1 (Sonner infra) → Task 2 (SubmitForm onSuccess refactor) → Task 3 (SubmitDialog) → Task 4 (page integration) → Task 5 (E2E spec update).
**Why**: Tasks 1 and 2 are both dependency-free and can run in either order. Task 3 depends on both. Task 4 depends on Task 3. Task 5 depends on Task 4. The plan-declared order already reflects this dependency graph, so no re-ordering is needed.
**Harness Signal**: N/A — plan.md already encodes the order.
**Result**: Pending
