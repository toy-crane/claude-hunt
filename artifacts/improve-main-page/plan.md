# Terminal Board — Implementation Plan

> **Context.** Most of the terminal-board redesign has already landed on this branch (`feat/improve-main-page`): scoped `.terminal-surface` palette, `PromptLine`, `CohortChips`, `ProjectGrid` with RANK/PREVIEW/NAME/AUTHOR/VOTES table header, zero-padded ranks, `RankDot`, hover thumbnail scale, square vote button `inline` variant, square `+ 프로젝트 제출`, and icon-only edit/delete variants. This plan covers the **delta** that remains before the page matches `spec.md` in full.
>
> **Visual source.** `artifacts/improve-main-page/references/TerminalBoard.jsx` (and the `terminal-board.html` / `colors_and_type.css` / `design-bundle-readme.md` that ship alongside it) is the authoritative visual source for every layout decision in this plan. The spec takes precedence when the two disagree.

## Architecture Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| URL sync on chip click | `history.pushState` + `popstate` listener on the `ProjectBoard` client component | Spec scenario 2 requires browser back/forward to restore the previously selected chip; `replaceState` (current) does not add history entries, so back/forward cannot restore. |
| Palette delivery | Keep the scoped `.terminal-surface` block in `app/globals.css` | Already in place. Redefines shadcn semantic tokens only on the landing surface; dialogs, settings, and every other route keep the default oklch palette. |
| Filter data flow | Keep the current in-memory filter over the initial server payload | Spec scenario 2 explicitly forbids an extra list-fetch on chip switch; today's behavior matches. |
| Mobile layout delivery | Rewrite the `min-[720px]:hidden` branch inside `ProjectCard` (single component, responsive classes) | Keeps one file owning the row layout for both viewports; avoids a second `MobileProjectCard` component and the dependency graph it would create. |

## Infrastructure Resources

None.

## Data Model

No entity changes. The board continues to consume the existing server payload.

- `ProjectWithVoteCount` (from `@entities/vote`) — already used by `ProjectGrid` / `ProjectCard`.
- `Cohort` (from `@entities/cohort`) — already used by `ProjectBoard`; Task 3 threads a `cohortLabelsById` map derived from this list down into `ProjectCard` so the mobile meta line can render the class label next to the rank.

## Required Skills

| Skill | Applicable Task | Purpose |
|-------|-----------------|---------|
| `test-driven-development` | All tasks | RED-first; each acceptance bullet maps 1:1 to a test case. See also `CLAUDE.md` → Testing for the project's "define success criteria, loop until verified" principle. |
| `next-best-practices` | Task 1 | Client-component state sync with URL using `window.history` + `popstate`, cleanup on unmount. |
| `vercel-react-best-practices` | Tasks 1, 3 | `useCallback`/`useEffect` for the `popstate` listener; avoid re-subscribing on every render. |
| `frontend-ui-engineering` | Task 3 | Mobile stacked card layout; consistent spacing and typographic scale. |
| `fsd` | Task 3 | Row rendering belongs in `widgets/project-grid`; `ProjectCard` keeps ownership of both viewports. |
| `shadcn` | Tasks 1, 2, 3 | Do not modify `shared/ui/*`; reuse existing primitives via class overrides. |
| `browser-testing-with-devtools` | Task 4 | Real-browser verification and evidence screenshots for each scenario. |

## Affected Files

| File Path | Change Type | Related Task |
|-----------|-------------|--------------|
| `app/_components/project-board.tsx` | Modify | Task 1 (pushState + popstate); Task 3 (pass `cohortLabelsById` into `ProjectGrid`) |
| `app/_components/project-board.test.tsx` | Modify | Task 1 |
| `widgets/project-grid/ui/project-card.tsx` | Modify | Task 2 (drop desktop author avatar bubble); Task 3 (rewrite `min-[720px]:hidden` branch) |
| `widgets/project-grid/ui/project-card.test.tsx` | Modify | Task 2; Task 3 |
| `widgets/project-grid/ui/project-grid.tsx` | Modify | Task 3 (thread `cohortLabelsById` to `ProjectCard`) |
| `widgets/project-grid/ui/project-grid.test.tsx` | Modify | Task 3 |
| `widgets/project-grid/index.ts` | Modify | Task 3 (re-export updated `ProjectGridProps`) |
| `artifacts/improve-main-page/evidence/` | New | Task 4 (screenshot evidence + `verification.md`) |

## Tasks

### Task 1: Browser back/forward restores the selected class chip

- **Covers**: Scenario 2 (partial — adds the back/forward criterion; the other seven criteria of this scenario already pass)
- **Size**: S (2 files)
- **Dependencies**: None
- **References**:
  - `test-driven-development` — RED-first on `popstate`
  - `next-best-practices` — client component `useEffect` + window listener cleanup
- **Implementation targets**:
  - `app/_components/project-board.tsx` — replace `window.history.replaceState(...)` in `handleCohortChange` with `window.history.pushState(...)`; add a `useEffect` that subscribes to `window.addEventListener("popstate", …)` and syncs `cohortId` from `new URLSearchParams(window.location.search).get("cohort")` on each event; clean up on unmount.
  - `app/_components/project-board.test.tsx` — swap the `replaceState` spy for a `pushState` spy; add a case that dispatches a `popstate` event after mutating `window.location.search` and asserts the rendered chip + subtitle count reflect the URL.
- **Acceptance**:
  - [ ] Clicking a class chip calls `history.pushState(null, "", "/?cohort=<id>")` and the matching chip becomes selected.
  - [ ] Clicking `모든 클래스` calls `history.pushState(null, "", "/")` and every cohort chip becomes deselected (the "모든 클래스" chip becomes selected).
  - [ ] After `window.location.search` changes to `?cohort=<id>` and a `popstate` event fires, the board re-renders with that cohort's chip selected and its filtered row count.
  - [ ] After `window.location.search` changes to an empty string and a `popstate` event fires, the board re-renders with `모든 클래스` selected and every row visible.
  - [ ] No additional network request is issued across chip clicks or popstate transitions.
- **Verification**:
  - `bun run test:unit -- app/_components/project-board`
  - `bun run build`
  - Browser MCP (`mcp__claude-in-chrome__*`) — load `/`, click `LG전자 1기`, click browser back, assert the address bar reads `/` and the `모든 클래스` chip is selected; save screenshot to `artifacts/improve-main-page/evidence/task-1-backforward.png`.

---

### Task 2: Desktop AUTHOR column shows nickname only (drop avatar bubble)

- **Covers**: Scenario 1 (partial — AUTHOR column rendering refinement to match the visual source)
- **Size**: S (2 files)
- **Dependencies**: None (parallel with Task 1)
- **References**:
  - `test-driven-development`
  - `shadcn` — no edits to `shared/ui/*`
- **Implementation targets**:
  - `widgets/project-grid/ui/project-card.tsx` — in the desktop `min-[720px]:grid` branch, delete the `<span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-muted font-medium text-[10px]">{authorInitial}</span>` element; keep the truncating nickname `<span>` as the sole content of the AUTHOR column. Remove the now-unused `authorInitial` local.
  - `widgets/project-grid/ui/project-card.test.tsx` — update the desktop-layout test: assert the AUTHOR column contains only the nickname text; assert no element with `rounded-full` (or the removed testid, if any) is rendered in that cell.
- **Acceptance**:
  - [ ] At viewport widths ≥ 720 px, the AUTHOR column renders only the author's nickname (truncated with ellipsis when narrow); no circular avatar initial element is present.
  - [ ] The AUTHOR column's width and vertical alignment are unchanged relative to the row's other columns (no layout shift compared to HEAD before this task).
  - [ ] The mobile `min-[720px]:hidden` branch is untouched by this task.
- **Verification**:
  - `bun run test:unit -- widgets/project-grid/ui/project-card`
  - `bun run build`
  - Browser MCP — at 1024 × 768, load `/`, capture the table header + first three rows; save to `artifacts/improve-main-page/evidence/task-2-desktop-nickname-only.png`.

---

### Checkpoint: After Tasks 1–2

- [ ] All tests pass: `bun run test`
- [ ] Build succeeds: `bun run build`
- [ ] On `/`, clicking a chip then pressing Browser Back restores the prior chip and row count.
- [ ] On ≥ 720 px, the desktop AUTHOR column shows nickname only.

---

### Task 3: Rewrite mobile row as a stacked card with full-width 16:10 thumbnail

- **Covers**: Scenario 7 (full)
- **Size**: M (5 files)
- **Dependencies**: Task 2 (both touch `project-card.tsx`; run Task 3 after Task 2 to avoid a merge conflict)
- **References**:
  - `test-driven-development`
  - `frontend-ui-engineering` — stacked card spacing, type scale
  - `fsd` — row layout stays in `widgets/project-grid`
  - `shadcn` — no edits to `shared/ui/*`
- **Implementation targets**:
  - `widgets/project-grid/ui/project-grid.tsx` — accept `cohortLabelsById: Record<string, string>` and forward it to each `ProjectCard`; update `ProjectGridProps`.
  - `widgets/project-grid/index.ts` — re-export the updated `ProjectGridProps`.
  - `widgets/project-grid/ui/project-card.tsx` — replace the `min-[720px]:hidden` horizontal h-16 row with a stacked card: (a) meta line `{zero-padded rank} · {cohort label}` with a 6 px dot to the left of the rank for ranks 1–3 (dim rank number for ranks 4+; when the project has no `cohort_id`, omit the `· {label}` segment and render only the rank); (b) full-width thumb with `aspect-[16/10]`; (c) title in heading font 16 px + tagline in sans 13 px muted; (d) bottom row with `{author} · {submittedAt}` on the left and the vote button on the right, both on the same baseline. The desktop `min-[720px]:grid` branch is not changed, and the owner/vote slot sits inline with the bottom row so the row's height stays identical whether or not `renderOwnerActions` fires.
  - `widgets/project-grid/ui/project-card.test.tsx` — add mobile-viewport assertions for the stacked structure, the no-cohort meta-line case, and the equal-height invariant; keep existing desktop assertions (including Task 2's nickname-only check) passing.
  - `widgets/project-grid/ui/project-grid.test.tsx` — thread `cohortLabelsById` through existing render helpers.
  - `app/_components/project-board.tsx` — compute `cohortLabelsById` from `cohorts` and pass it into `ProjectGrid`.
- **Acceptance**:
  - [ ] At viewport widths < 720 px, each project row stacks top-to-bottom in this order: meta line, thumbnail, title + tagline block, author/vote bottom row.
  - [ ] The meta line shows the two-digit rank number (`01`–`99`); for ranks 1–3 a 6 px rank dot appears immediately to the left of the number; for ranks 4+ the dot is absent and the rank number is rendered in the dim foreground color.
  - [ ] The meta line includes the project's class label after the rank, separated by a `·` divider (class label resolved via `cohortLabelsById`); when the project has no `cohort_id`, the meta line renders the rank alone with no trailing `·` or label.
  - [ ] The thumbnail spans the full row width with a 16:10 aspect ratio.
  - [ ] The title uses the heading font at 16 px; the tagline uses the sans font at 13 px in the muted foreground color.
  - [ ] The bottom row places `{author} · {submittedAt}` on the left and the project's vote button on the right at the same baseline.
  - [ ] On a < 720 px viewport, an owner's row and a non-owner's row render at the same total height (no vertical shift when icon buttons are present).
  - [ ] At viewport widths ≥ 720 px, the desktop grid row continues to render exactly as before this task (table header visible, row columns unchanged, AUTHOR column remains nickname-only from Task 2).
- **Verification**:
  - `bun run test:unit -- widgets/project-grid`
  - `bun run test:unit -- app/_components/project-board`
  - `bun run build`
  - Browser MCP — resize to 375 × 812, load `/`, capture the first two rows; save to `artifacts/improve-main-page/evidence/task-3-mobile-stacked.png`.
  - Browser MCP — resize to 1024 × 768, load `/`, capture the table header + first row (and an owner row if the signed-in viewer owns one); save to `artifacts/improve-main-page/evidence/task-3-desktop-regression.png`.

---

### Checkpoint: After Task 3

- [ ] All tests pass: `bun run test`
- [ ] Build succeeds: `bun run build`
- [ ] On a < 720 px viewport, rows render as stacked cards with a full-width 16:10 thumb; on ≥ 720 px, the table layout is unchanged.

---

### Task 4: Evidence walk — verify every spec scenario in a real browser

- **Covers**: Scenarios 1–8 (verification only — no code changes) + Invariants (accessibility, behavioral parity, terminology, color discipline)
- **Size**: S (one new markdown file + screenshot set)
- **Dependencies**: Tasks 1, 2, 3
- **References**:
  - `browser-testing-with-devtools`
- **Implementation targets**:
  - `artifacts/improve-main-page/evidence/verification.md` — one section per scenario and per invariant. Each section lists every Success Criterion bullet from `spec.md` verbatim and, next to each, either a `<file>:<test name>` pointer or the filename of a screenshot in `artifacts/improve-main-page/evidence/`.
  - Screenshots in `artifacts/improve-main-page/evidence/scenario-<N>-<short-name>.png` — one per scenario where the criteria are visual; grouped sensibly (a single screenshot may cover multiple bullets if they are visible in the same frame).
- **Acceptance (each bullet is a separate row in `verification.md`)**:
  - [ ] **Scenario 1 (default render).** All seven Success Criteria have pointers: prompt-line text, H1 copy, subtitle count, 2-digit rank, top-3 dots, rank-4+ dim number, and the RANK/PREVIEW/NAME/AUTHOR/VOTES header strip at ≥ 720 px are proved by `widgets/project-grid/ui/project-card.test.tsx`, `widgets/project-grid/ui/project-grid.test.tsx`, `widgets/project-grid/ui/prompt-line.test.tsx`, `widgets/project-grid/ui/rank-badge.test.tsx`, and a single desktop screenshot.
  - [ ] **Scenario 2 (class filter).** All eight Success Criteria have pointers: chip ordering, per-chip counts, inverted selected state, pushState URL sync, popstate restore, prompt-line `--class="…"` segment, subtitle count update, and no-extra-fetch are proved by `features/cohort-filter/ui/cohort-chips.test.tsx`, `app/_components/project-board.test.tsx` (after Task 1), and a two-screenshot pair showing back/forward restoring the chip.
  - [ ] **Scenario 3 (hover).** All four Success Criteria are proved by `widgets/project-grid/ui/project-card.test.tsx` (for the `hover:bg-muted` class presence on the row and `group-hover/row:scale-[1.08]` on the thumb) plus one desktop screenshot captured while hovering the top row.
  - [ ] **Scenario 4 (vote).** All six Success Criteria have pointers: square/tabular-num rendering and icon swap are proved by `features/toggle-vote/ui/vote-button.test.tsx`; unauth-routing, owner-blocked, and toggle behavior are proved by the same file; post-vote re-rank is proved by `revalidatePath("/")` in `features/toggle-vote/api/actions.ts` plus a before-and-after screenshot of a vote that moves a row's rank.
  - [ ] **Scenario 5 (submit).** All four Success Criteria are proved by `features/submit-project/ui/submit-dialog.test.tsx` plus a screenshot of the trigger button on the board and a screenshot of the open dialog.
  - [ ] **Scenario 6 (owner edit/delete).** All four Success Criteria are proved by `features/edit-project/ui/edit-dialog.test.tsx`, `features/delete-project/ui/delete-button.test.tsx`, `widgets/project-grid/ui/project-card.test.tsx`, plus one screenshot of a signed-in owner's row showing both icon buttons adjacent to the vote button.
  - [ ] **Scenario 7 (mobile).** All five Success Criteria (stacked order, meta line, 16:10 thumb, typography, bottom row, chip wrap) are proved by `widgets/project-grid/ui/project-card.test.tsx` + `features/cohort-filter/ui/cohort-chips.test.tsx` (chip-wrap already passes on HEAD) plus a 375 × 812 screenshot.
  - [ ] **Scenario 8 (theme).** All five Success Criteria have pointers. Palette hex values and rank-dot colors are proved by reading `app/globals.css` (token assertions may live in a new `app/globals.css.test.ts` or in `widgets/project-grid/ui/rank-badge.test.tsx`); the toggle flow is proved by two screenshots — dark and light — taken from the same viewport without reload.
  - [ ] **Invariant: accessibility.** Every new interactive element (chip, vote button, submit button, edit/delete icon buttons, title/thumbnail link) is reachable by Tab in natural order, and its focus outline is visible in both palettes. Verified by a keyboard-navigation walk (Tab from the top of the page through every interactive element) on both dark and light themes, captured as two short screen recordings or a sequence of focus-state screenshots.
  - [ ] **Invariant: behavioral parity.** Voting, submitting, editing, and deleting continue to honor the same auth/ownership rules as before the redesign. Covered by the existing feature-level tests listed above; no new tests required.
  - [ ] **Invariant: terminology.** `verification.md` records a `grep` across `app/`, `features/`, and `widgets/` confirming that user-visible copy uses `클래스` and that `cohort` appears only as the `--class="…"` CLI flag on the prompt line and in internal identifiers (`cohort_id`, query param).
  - [ ] **Invariant: color discipline.** `verification.md` records a `grep` confirming the only chromatic tokens used on the landing surface are `--term-rank-1/2/3`, `--accent-terracotta`, and `--accent-terracotta-dark`; every other color comes from the grayscale tokens redefined inside `.terminal-surface`.
  - [ ] A human reviewer (toycrane) signs off at the bottom of `verification.md` with a date.
- **Verification**:
  - `bun run test`
  - `bun run build`
  - Browser MCP — execute each scenario on `/` at the specified viewport and save screenshots to `artifacts/improve-main-page/evidence/`.
  - Human review — toycrane reads `verification.md`, opens each pointer, and records acceptance with a date at the bottom of the file.

---

### Checkpoint: Final

- [ ] `bun run test` passes
- [ ] `bun run build` succeeds
- [ ] `verification.md` is complete and signed off by the reviewer
- [ ] `git status` is clean; branch ready for merge to `main`

## Undecided Items

_(none — the mobile meta line omits the `· {label}` segment when `cohort_id` is null per reviewer direction; confirmed in Task 3's acceptance bullets.)_
