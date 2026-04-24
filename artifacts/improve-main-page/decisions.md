# improve-main-page — Decision Log

> Prior entries (6-task plan + wireframe era) superseded by the plan rewrite on commit `9e94455`. This file starts fresh.

## Reviewer selection

**When**: Step 2
**Decision**: Run `ui-quality-reviewer`, `design-reviewer`, and `react-reviewer` at Step 5 in parallel. Omit `wireframe-reviewer`.
**Why**:
- `wireframe-reviewer` — `artifacts/improve-main-page/wireframe.html` no longer exists (removed in `2556dac` as stale vs. the rewritten spec). The skill requires a wireframe as input, so it cannot run.
- `ui-quality-reviewer` — Tasks 2 and 3 both deliver user-visible UI changes; Task 1 is a state-management fix without direct UI impact but still affects chip behavior visible to the user.
- `design-reviewer` — The landing surface has tight palette/typography rules (`.terminal-surface` token block, terracotta accent restricted to `>` / `_` / `$`); worth a token-compliance pass after any row-layout change.
- `react-reviewer` — All changes touch React client components (`ProjectBoard`, `ProjectCard`) and Next.js App Router conventions; `popstate` subscription cleanup and prop threading are explicit concerns.
- `migration-reviewer` / `security-auditor` — omitted; no schema or auth changes in this feature.
**Harness Signal**: `execute-plan` SKILL.md step 2 selects `wireframe-reviewer` on "wireframe.html exists". It did not consider the case where a prior plan's wireframe has been explicitly retired — a single check of the current plan preamble for a "No wireframe" / "wireframe removed" marker would cover this.
**Result**: Pending

## Task execution order

**When**: Step 3
**Decision**: Execute Tasks in plan.md's stated order — T1 → T2 → T3 → T4. No parallelization.
**Why**:
- T1 (`app/_components/project-board.tsx` + its test) and T2 (`widgets/project-grid/ui/project-card.tsx` + its test) touch disjoint files and can run in either order; sequential keeps the commit history linear.
- T3 (mobile stacked card) modifies `project-card.tsx` and its test again — running it after T2 avoids editing the same file twice in one task and lets T2's nickname-only invariant become a stable baseline that T3 preserves.
- T4 is the evidence walk; it depends on all three prior tasks having shipped.
**Harness Signal**: N/A (this is the standard plan-order execution; not generalizable).
**Result**: Pending
