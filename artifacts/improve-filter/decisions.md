# improve-filter — Decisions

## Reviewer Selection

**When**: Step 2  
**Decision**: Run `ui-quality-reviewer`, `design-reviewer`, `react-reviewer`. Omit `wireframe-reviewer` (no wireframe.html).  
**Why**: Task 1 introduces a new client component (`ProjectBoard`) that composes the cohort dropdown and project grid, and refactors `CohortDropdown` into a controlled component. Three reviewers cover visual quality, shadcn/design-system compliance, and React/Next.js patterns (RSC boundary, `history.replaceState`, `useCallback`/`useMemo` usage).  
**Harness Signal**: N/A — reviewer set matches the previous `improve-cohort-filter` feature exactly for similar UI + RSC + client-state tasks. Follow-up signal: all three reviewer subagents (`ui-quality-reviewer`, `design-reviewer`, `react-reviewer`) failed to start in this session because their startup tool calls (Bash for dev server / `npx shadcn info`) were denied by the session permission layer. The `execute-plan` skill should surface a guard for this — either pre-check permissions before spawning, or fall back to an inline self-review with the reviewer's rule set when spawning fails, rather than marking the step complete with no feedback.  
**Result**: Partial — reviewers could not execute; Team Lead performed an inline self-check against the same rule sets (see below)

---

## Inline self-review (fallback for blocked reviewers)

**When**: Step 5 — after reviewer subagents failed to start  
**Decision**: Perform a Team-Lead self-check covering the same dimensions the three reviewers would have assessed, since the session permission layer blocked their startup tool calls.  
**Why**: Skipping review entirely would mean the commit ships without any verification of the reviewer dimensions. A self-check is strictly weaker than an independent reviewer but is strictly stronger than nothing.  
**Findings**:
- shadcn/design — `features/cohort-filter/ui/cohort-dropdown.tsx` uses `<Select>`/`<SelectTrigger>`/`<SelectContent>`/`<SelectItem>` as-is with only a `w-[200px]` width utility (pre-existing) and an `aria-label`; no `components/ui/*` modifications, no hex colors, no custom markup replacing a shadcn primitive. `app/_components/project-board.tsx` renders the dropdown inside a flex container using only layout utilities (`flex items-center justify-end gap-2`) and semantic tokens (`text-muted-foreground`). No violations.
- React/Next — `useState(initialCohortId)` seeds from a server prop and is safe here because `?cohort` changes do not cause the server page to re-render (client owns URL sync via `history.replaceState`); a full navigation remounts the component. `useMemo(filteredProjects)` earns its keep (filter runs on every render otherwise). `useCallback(resolveScreenshotUrl)` is justified because it is forwarded as a prop to `<ProjectGrid>`. `history.replaceState` instead of `router.replace` is the correct choice and is the entire point of the refactor — `router.replace` would trigger the RSC roundtrip this feature exists to remove. Server-only barrels (`features/cohort-filter/server.ts`, `widgets/project-grid/server.ts`) keep `next/headers` out of the client import graph — verified by a green `bun run build`.
- UI quality — cannot assess visually without a running dev server; unit tests for the filter/URL-sync behavior are green (265 passing). A manual smoke in the browser is listed in the Task 1 checkpoint and remains the user's gate before Ship.

**Harness Signal**: Reviewer coverage should not silently degrade to zero when the reviewer subagent can't start. A Team-Lead self-check captures the rule-based dimensions but not the visual one — `ui-quality-reviewer` in particular cannot be substituted and its work must happen at Verify time, not at Review time, in sessions where the dev server can't be spawned from an agent.  
**Result**: Success (for the dimensions that do not require a browser)

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
