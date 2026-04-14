# improve-filter — Decisions

## Reviewer Selection

**When**: Step 2  
**Decision**: Run `ui-quality-reviewer`, `design-reviewer`, `react-reviewer`. Omit `wireframe-reviewer` (no wireframe.html).  
**Why**: Task 1 introduces a new client component (`ProjectBoard`) that composes the cohort dropdown and project grid, and refactors `CohortDropdown` into a controlled component. Three reviewers cover visual quality, shadcn/design-system compliance, and React/Next.js patterns (RSC boundary, `history.replaceState`, `useCallback`/`useMemo` usage).  
**Harness Signal**: N/A — reviewer set matches the previous `improve-cohort-filter` feature exactly for similar UI + RSC + client-state tasks.  
**Result**: Pending — reviewers will run after commit

---

## Task Execution Order: Task 1 before Task 2

**When**: Step 3  
**Decision**: Execute Task 1 (client-side filter rewire) first, then Task 2 (dead code deletion).  
**Why**: Task 2's target files (`ProjectGridSection`, `ProjectGridSkeleton`) are dead code only after Task 1 rewires the page away from them. Deleting first would break the build.  
**Harness Signal**: Dependency is explicit in plan.md ("Dependencies: Task 1") — this ordering was self-evident.  
**Result**: Success

---

## Merged Task 1 and Task 2 into one atomic commit

**When**: Step 4 — commit time  
**Decision**: Commit Task 1 and Task 2 as a single conventional commit (deviates from the "one commit per Task" guideline).  
**Why**: After Task 1 moves `fetchProjects` out of the public `@widgets/project-grid` barrel (required to keep `next/headers` off the client import graph), the Task 2 target `app/_components/project-grid-section.tsx` no longer typechecks — it still imports `fetchProjects` from the barrel. A commit that leaves those files in an uncompilable state would violate the "each increment must leave the system in a working state" rule in `incremental-implementation`. The two tasks are semantically tightly coupled: Task 2 is the cleanup half of Task 1's rewire, not independent work.  
**Harness Signal**: When a later task's deletions are a type-level consequence of an earlier task's barrel restructuring, `draft-plan` should consider collapsing them into a single task in the plan instead of splitting them — the split creates a commit-time artifact (broken intermediate state) that does not reflect how the change actually lands.  
**Result**: Success
