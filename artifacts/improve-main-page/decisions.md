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
**Result**: Partial — `design-reviewer` and `react-reviewer` returned actionable findings; `ui-quality-reviewer` was stopped before finishing because Chrome MCP screenshot timeouts were limiting its value (see "Chrome MCP unavailable" entry).

## Task execution order

**When**: Step 3
**Decision**: Execute Tasks in plan.md's stated order — T1 → T2 → T3 → T4. No parallelization.
**Why**:
- T1 (`app/_components/project-board.tsx` + its test) and T2 (`widgets/project-grid/ui/project-card.tsx` + its test) touch disjoint files and can run in either order; sequential keeps the commit history linear.
- T3 (mobile stacked card) modifies `project-card.tsx` and its test again — running it after T2 avoids editing the same file twice in one task and lets T2's nickname-only invariant become a stable baseline that T3 preserves.
- T4 is the evidence walk; it depends on all three prior tasks having shipped.
**Harness Signal**: N/A (this is the standard plan-order execution; not generalizable).
**Result**: Success — all four tasks shipped in order on commits `e0a52d2` → `9f075d7` → `7484a94` → `6d34051`; each task's test suite passed before the next began.

## Chrome MCP unavailable for Task 4 screenshots

**When**: Step 4, Task 4 (Evidence walk)
**Decision**: Write `verification.md` with test-pointers for every Success Criterion that is provable by a unit test; flag purely visual items (Scenario 8 palette hex values, Scenario 3 hover animation feel, Scenario 7 mobile 16:10 appearance, Invariant a11y keyboard walk) as "browser verification pending" and defer screenshot capture to the user.
**Why**: `mcp__claude-in-chrome__tabs_context_mcp` initially reported the browser extension was not connected; after the user reconnected it, `Page.captureScreenshot` returned CDP timeouts on every call after the first in this session. `read_page` still worked reliably, so the DOM shape of the mobile stacked card was verified via that tool — only screenshot *files* are missing from `evidence/`.
**Harness Signal**: `execute-plan` plan templates assume Chrome MCP is always available when `browser-testing-with-devtools` is listed as a required skill. A pre-check at plan start ("is the browser available? can it actually screenshot?") would let the Team Lead choose between blocking vs. documenting-for-later deterministically.
**Result**: Partial — one desktop screenshot captured and inspected live (covered Scenarios 1, 2, 5, 6 visually); mobile + theme screenshots blocked by CDP timeouts. `verification.md` records test pointers for every provable criterion and flags the remaining visual checks for a follow-up session.

## Reviewer feedback judgment — design

**When**: Step 5, after `design-reviewer` returned
**Decision**:
- Accept and fix: W1 (missing `--border-soft`), W2 (missing `--accent-terracotta`), W3 (prompt-line hardcoded hex), W6 (inline `rounded-none` overrides on shadcn Button).
- Reject as out-of-scope: W4 (vote-button `stacked` variant not `rounded-none`), W5 (edit-dialog default variant not `rounded-none`). Both variants are explicitly used *outside* the terminal surface; the spec concerns the landing-page board only. The reviewer acknowledged this in its W4 note ("Flag for confirmation of intent").
- Accept all Advisories as informational; no action needed.
**Why**: W1–W3, W6 land inside the landing surface and directly affect spec Scenario 8 palette tokens or spec Invariant color discipline. Fixing them tightens token discipline without changing observable behavior on the board. W4/W5 would require either touching `components/ui/button.tsx` (prohibited by `.claude/rules/shadcn-guard.md`) or adding unrelated variant props; both out of spec scope.
**Fix implementation** (commit `f27c9a9`):
- Added `--accent-terracotta` to `:root` (#c15f3c) and `.dark` (#e88a67) so the wordmark + prompt can use a single class across both themes.
- Added `--border-soft` (light #eeeeec, dark #21262d) + `--radius: 0` to `.terminal-surface` and `.dark .terminal-surface`.
- Rewrote `prompt-line.tsx` and `logo.tsx` `ACCENT` constants to `text-[var(--accent-terracotta)]` — dropped the `dark:` override.
- Removed redundant `className="rounded-none"` from `submit-dialog.tsx` (both branches), `edit-dialog.tsx` (icon variant), `delete-button.tsx` (icon variant). `size-7` stays — shadcn-guard §4 "ask before override" applies and the 28 px size is a spec requirement without a matching variant prop.
- Updated `logo.test.tsx` and `prompt-line.test.tsx` to assert the `--accent-terracotta` token rather than the old `dark:` class pair.
**Harness Signal**: `design-reviewer` cited the raw `.claude/rules/shadcn-guard.md` priority ladder — having it recommend the CSS-variable path (#3) rather than the `className` override (prohibited) makes the fix mechanical. No harness gap here; the rule document worked as intended.
**Result**: Success — all four accepted warnings closed; 387/387 tests still pass; build succeeds.

## Reviewer feedback judgment — react

**When**: Step 5, after `react-reviewer` returned
**Decision**:
- Accept and fix: W2 (inline render-prop arrow functions in `ProjectBoard`).
- Defer as pre-existing: W1 (sequential fetch waterfall in `app/page.tsx`), W3 (`"viewer_has_voted" in project` guard's type hole).
- Accept all Advisories as informational.
**Why**:
- W2 was introduced (or amplified) by Task 3's addition of `cohortLabelsById` to `ProjectGrid`'s prop surface; fixing it is in scope.
- W1 and W3 both predate this feature — `fetchProjects` depending on `viewer.id` is the root of the waterfall, and the `in` guard existed on `feat/improve-main-page`'s HEAD before any of Tasks 1–4 ran. Neither is a regression of this feature, and both have wider-blast-radius fixes (refactor the viewer/projects dataflow; thread `ProjectGridRow` through the widget types). Record them as follow-ups rather than fold into this plan.
**Fix implementation** (commit `f27c9a9`):
- Wrapped `renderOwnerActions` in `useCallback([])` and `renderVoteButton` in `useCallback([isAuthenticated, viewerUserId])`; typed the parameter as `ProjectWithVoteCount` to match the widget's public signature.
**Harness Signal**: `react-reviewer` cited `rerender-no-inline-components` by name; the rule mapped 1:1 to the `useCallback` fix. Advisory A4 (wrap `ProjectCard` in `React.memo` to compound the win) is a good follow-up — it depends on W2 being resolved first, which is now done.
**Result**: Success — W2 closed; deferred items recorded as follow-ups below.

## Follow-ups (not in scope this plan)

Recorded here for the next `/write-spec` or `/draft-plan` cycle:
- **`app/page.tsx` sequential fetch waterfall.** `fetchProjects` awaits after `Promise.all([fetchViewer, fetchCohorts])`. Options: (a) accept and document; (b) wrap `fetchViewer` in `React.cache` + start `fetchProjects` without waiting; (c) refactor `fetchProjects` to accept a viewer promise.
- **`"viewer_has_voted" in project` type hole.** `ProjectGrid`/`ProjectCard` declare their project prop as `ProjectWithVoteCount`, but the runtime value is `ProjectGridRow`. Either propagate `ProjectGridRow` through the widget types, or explicitly add `viewer_has_voted` to `ProjectCardProps`.
- **`React.memo` on `ProjectCard`.** Now that the render props are stable (commit `f27c9a9`), wrapping `ProjectCard` in `React.memo` would prevent per-row re-renders when unrelated `ProjectBoard` state changes.
- **Mobile + theme screenshots in `evidence/`.** A follow-up MCP session (or a one-off Playwright script against the live dev server) to produce the screenshot PNGs referenced in `verification.md`.
- **Keyboard-walk recording for the a11y invariant.** A short screen recording of a Tab walk in both themes.
