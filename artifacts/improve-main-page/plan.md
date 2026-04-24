# improve-main-page Implementation Plan

> Turn the landing page body from a Product-Hunt-style card grid into a dense, monospace "터미널 보드" (dark-first, terracotta-only accent), keeping the existing Header, Footer, and every interaction rule shipped today. Wireframe option 🅰️ (compact mobile, chip wrap, 48×48 thumb with rank badge overlay, horizontal vote button) is the final layout.

## Architecture Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Terminal palette placement | Scoped CSS variables on the landing page `<main>` wrapper (new `.terminal-surface` class), **not** a global `:root` override | Spec explicitly excludes header/footer visual changes; `/login`, `/settings`, `/onboarding`, dialogs, etc. must not shift aesthetics. Scoping the 14 terminal hex values to the landing main keeps blast radius = one page. |
| Existing widget folder | **Keep** `widgets/project-grid/` name; swap UI components in place (grid→list) | Avoids renaming churn across `app/page.tsx`, `app/opengraph-image.tsx` (still needs `fetchTopProjects`), `app/__tests__/page.test.tsx`, `app/_components/project-board.*`. Folder name becomes historical; internal components are renamed/rewritten to match the new model. |
| ProjectCard / RankBadge | **Rewrite in place** — `project-card.tsx` becomes a horizontal row; `rank-badge.tsx` becomes dot-only (no "1st/2nd/3rd" label) | Project rule (CLAUDE.md): if unused, delete; avoid parallel-widget drift. Both are only consumed from `ProjectGrid` so a rewrite is safe. |
| EmptyState | **Keep unchanged** | Spec lists it as excluded from this round (reuse current copy + layout). |
| VoteButton compact variant | Add `variant="inline"` prop (horizontal, square-cornered) to the existing `features/toggle-vote/ui/vote-button.tsx`; default remains `"stacked"` | Only one caller (the landing row) needs the inline look; a sibling component would duplicate auth/ownership logic. |
| Edit/Delete inline triggers | Add `variant="icon"` prop (icon-only trigger) to the existing `EditDialog` and `DeleteButton` | Same pattern as VoteButton; keeps auth and dialog wiring inside the feature slice. |
| Cohort URL param | **Keep** `?cohort=<id>` (unchanged) — user-visible copy switches to `클래스`, but the query key stays for link-compat | No breaking change for shared URLs; Korean word lives only in chip labels and the `--class="…"` prompt flag. |
| `ViewTransition` wrapper | Preserve the existing `<ViewTransition key={project.id}>` wrapper around each row | Scenario 4 requires smooth re-sort on vote change; today's grid already animates via React's View Transition API. |
| CohortDropdown after swap | **Delete** `cohort-dropdown.tsx` + test after chips land | Only consumer is the landing page; YAGNI. |

## Infrastructure Resources

None. No new DB columns, buckets, cron jobs, or env vars.

## Data Model

Unchanged. Uses existing reads:
- `public.projects_with_vote_count` (view) — via `fetchProjects`
- `public.cohorts` (table) — via `fetchCohorts`
- `public.votes` (table) — viewer-vote merge inside `fetchProjects`

## Required Skills

| Skill | Applicable Task | Purpose |
|-------|-----------------|---------|
| test-driven-development | All tasks | RED → GREEN per acceptance bullet; criterion-to-test mapping |
| frontend-ui-engineering | T1, T2, T3, T4, T5 | Production-quality component quality bar |
| shadcn | T1, T2, T4, T6 | Variants on existing shadcn components (Button, Dialog, Select replacement); no raw style overrides — add `variant` props instead |
| fsd | T2, T3, T4 | Slice public API, no cross-slice imports |
| vercel-react-best-practices | T2, T3, T4 | Keyed list, stable callbacks, avoid needless re-renders; memoize heavy handlers |
| vercel-react-view-transitions | T2 | Preserve row re-sort animation on vote change |
| next-best-practices | T2, T3 | RSC/client boundary, `history.replaceState` rules, subtitle count refresh |
| web-design-guidelines | T4, T5, T6 | Tab order, focus rings visible in both palettes, touch-friendly targets |
| run-dev-server | T1–T6 | Browser-MCP verification loop against `http://localhost:3000/` |

## Affected Files

| File Path | Change Type | Related Task |
|-----------|-------------|--------------|
| `app/globals.css` | Modify | T6 (terminal palette tokens) |
| `app/page.tsx` | Modify | T1 (prompt line section), T2 (layout refresh) |
| `app/__tests__/page.test.tsx` | Modify | T1, T2 |
| `app/_components/project-board.tsx` | Modify | T1, T2, T3, T4, T5 |
| `app/_components/project-board.test.tsx` | Modify | T1, T2, T3, T4 |
| `app/opengraph-image.tsx` | Untouched | — (only imports `fetchTopProjects`) |
| `widgets/project-grid/index.ts` | Modify | T2, T3 (exports `PromptLine`, `RankDot`, rewire `ProjectList`) |
| `widgets/project-grid/ui/prompt-line.tsx` | New | T1 |
| `widgets/project-grid/ui/prompt-line.test.tsx` | New | T1 |
| `widgets/project-grid/ui/rank-badge.tsx` | Modify (becomes dot-only; renamed export `RankDot`) | T2 |
| `widgets/project-grid/ui/rank-badge.test.tsx` | Modify | T2 |
| `widgets/project-grid/ui/project-card.tsx` | Modify (rewrite as horizontal row + mobile variant) | T2 (desktop), T5 (mobile) |
| `widgets/project-grid/ui/project-card.test.tsx` | Modify | T2, T5 |
| `widgets/project-grid/ui/project-grid.tsx` | Modify (flat list container, `flex-col` instead of `grid-cols-3`) | T2 |
| `widgets/project-grid/ui/project-grid.test.tsx` | Modify | T2 |
| `widgets/project-grid/ui/empty-state.tsx` | Untouched | — (reused as-is) |
| `widgets/project-grid/ui/empty-state.test.tsx` | Untouched | — |
| `features/cohort-filter/index.ts` | Modify (export `CohortChips`) | T3 |
| `features/cohort-filter/ui/cohort-chips.tsx` | New | T3 |
| `features/cohort-filter/ui/cohort-chips.test.tsx` | New | T3 |
| `features/cohort-filter/ui/cohort-dropdown.tsx` | Delete | T3 (after swap) |
| `features/cohort-filter/ui/cohort-dropdown.test.tsx` | Delete | T3 |
| `features/toggle-vote/ui/vote-button.tsx` | Modify (add `variant="inline"`) | T2 |
| `features/toggle-vote/ui/vote-button.test.tsx` | Modify | T2 |
| `features/edit-project/ui/edit-dialog.tsx` | Modify (add `variant="icon"`) | T4 |
| `features/edit-project/ui/edit-dialog.test.tsx` | Modify | T4 |
| `features/delete-project/ui/delete-button.tsx` | Modify (add `variant="icon"`) | T4 |
| `features/delete-project/ui/delete-button.test.tsx` | Modify | T4 |
| `artifacts/improve-main-page/evidence/` | New | T1–T6 (Playwright / Browser-MCP screenshots + notes) |

---

## Tasks

### ✅ Task 1: Prompt line component + dynamic filter flag

- **Covers**: Scenario 1 (partial — prompt-line text), Scenario 2 (partial — prompt-line rewrites on class change)
- **Size**: S (3–4 files)
- **Dependencies**: None
- **References**:
  - `test-driven-development` — colocated `.test.tsx`, criterion-to-test mapping
  - `next-best-practices` — client-component boundary (prompt depends on client-filter state)
  - `artifacts/improve-main-page/spec.md` § Scenario 1, 2
  - `artifacts/improve-main-page/wireframe.html` → Screen 0 prompt line, Screen 1 prompt line
  - `artifacts/improve-main-page/references/TerminalBoard.jsx` lines 278–281
- **Implementation targets**:
  - `widgets/project-grid/ui/prompt-line.tsx` (new; receives `cohortLabel: string | null`, renders `$ claude-hunt ls … --sort=votes`)
  - `widgets/project-grid/ui/prompt-line.test.tsx` (new)
  - `widgets/project-grid/index.ts` (export `PromptLine`)
  - `app/_components/project-board.tsx` (render PromptLine above the grid, wired to current cohort state — compute `cohortLabel` from `cohortId` + `cohorts`)
  - `app/_components/project-board.test.tsx` (assert prompt appears with / without cohort)
- **Acceptance**:
  - [ ] With no cohort selected, PromptLine renders exactly `$ claude-hunt ls --sort=votes`.
  - [ ] The leading `$ ` is wrapped in a span whose class or inline style carries the brand terracotta color (light: `#c15f3c`, dark: `#e88a67`).
  - [ ] With cohort `LG전자 1기` selected, PromptLine renders exactly `$ claude-hunt ls --class="LG전자 1기" --sort=votes`.
  - [ ] PromptLine re-renders its text whenever the parent's `cohortId` state changes (no stale snapshot).
  - [ ] The word `cohort` does not appear in any user-visible string rendered by PromptLine (the flag name is `class`).
- **Verification**:
  - `bun run test:unit -- prompt-line` — colocated Vitest; assert exact text strings via `screen.getByText`.
  - `bun run test:unit -- app/_components/project-board` — assert PromptLine renders with correct label inside ProjectBoard's tree (using a mock cohort prop).
  - `bun run build` — type check.
  - Browser MCP (`mcp__claude-in-chrome__navigate` + `find`) against `http://localhost:3000/` — confirm default text; click a class chip (once Task 3 lands) and re-verify; save screenshot to `artifacts/improve-main-page/evidence/t1-prompt-line.png`.

---

### ✅ Task 2: Grid → list layout, rank dot, inline vote button, row hover

- **Covers**: Scenario 1 (full — ranked list, two-digit rank, desktop table header), Scenario 3 (full — hover lift + thumb scale), Scenario 4 (full — inline vote button, auth/owner rules, re-sort after vote), Scenario 5 (partial — submit button stays at H1 right, square + fg/bg inverted)
- **Size**: M (upper-edge; 6 direct file changes + tests)
- **Dependencies**: Task 1 (PromptLine already above; Task 2 drops the old grid beneath it without breaking the page)
- **References**:
  - `test-driven-development`
  - `vercel-react-best-practices` — list keys, stable callbacks, `tabular-nums`
  - `vercel-react-view-transitions` — preserve `<ViewTransition key={project.id}>` wrapper so re-sort animates
  - `shadcn` — add `variant` prop to existing VoteButton instead of overriding classes
  - `artifacts/improve-main-page/spec.md` § Scenarios 1, 3, 4, 5
  - `artifacts/improve-main-page/wireframe.html` → Screen 0 desktop rows
  - `artifacts/improve-main-page/references/TerminalBoard.jsx` (desktop `Row` branch, lines 77–172)
- **Implementation targets**:
  - `widgets/project-grid/ui/rank-badge.tsx` (rewrite: 6 px colored dot only for rank 1–3; export renamed to `RankDot`)
  - `widgets/project-grid/ui/rank-badge.test.tsx` (rewrite)
  - `widgets/project-grid/ui/project-card.tsx` (rewrite desktop branch: 5-column grid `52px 72px 1fr 130px auto`, rank + dot, 40 px-tall thumb with `group-hover:scale-[1.08]`, title+tagline stack, author with 20 px initials circle, vote button slot)
  - `widgets/project-grid/ui/project-card.test.tsx` (rewrite)
  - `widgets/project-grid/ui/project-grid.tsx` (switch container from `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` to a single stacked list with a 1 px border frame and sticky header row `RANK PREVIEW NAME AUTHOR VOTES` rendered `hidden md:grid`)
  - `widgets/project-grid/ui/project-grid.test.tsx` (rewrite — assert flat list, header strip visible above 720 px)
  - `widgets/project-grid/index.ts` (export `RankDot`; remove `RankBadge` / `ProjectCard` export if renamed)
  - `features/toggle-vote/ui/vote-button.tsx` (add `variant?: "stacked" | "inline"` — inline = horizontal, `rounded-none`, filled-fg on voted, outline on idle, tabular-num count)
  - `features/toggle-vote/ui/vote-button.test.tsx` (add cases for `variant="inline"`)
  - `app/_components/project-board.tsx` (pass `variant="inline"` to VoteButton via `renderVoteButton`)
- **Acceptance**:
  - [ ] Rendering 6 projects produces 6 row elements in the document with vote-count-descending order; `vote_count` ties fall back to `created_at` desc (unchanged from server).
  - [ ] Rank cells show exactly `01`, `02`, `03`, `04`, `05`, `06` (zero-padded two-digit strings).
  - [ ] Rank 1 row contains an element styled with amber background (`#f59e0b` in light / `#f0b84c` in dark); rank 2 with zinc (`#a1a1aa` / `#a1a1aa`); rank 3 with orange (`#c2410c` / `#ffa657`); rank 4+ renders no dot element (`data-testid="rank-dot"` is absent).
  - [ ] Desktop viewport (≥ 720 px) shows a table-header strip labelled `RANK  PREVIEW  NAME  AUTHOR  VOTES`; at < 720 px this strip is not in the DOM.
  - [ ] Hovering a row toggles a `data-hover="true"` attribute (or applies a surface-2 class) on exactly that row; mouse-leave removes it.
  - [ ] Hovering a row transforms its `<img>` from `scale(1)` to `scale(1.08)` within 200 ms (transition value is testable via computed style).
  - [ ] Clicking the project title opens `project.project_url` in a new tab (`target="_blank"`, `rel="noopener noreferrer"`).
  - [ ] `VoteButton variant="inline"` renders a horizontal `inline-flex` element, 1 px border when `alreadyVoted=false`, filled primary-fg background when `alreadyVoted=true`; count uses `tabular-nums`.
  - [ ] Clicking the inline vote button toggles optimistic state (count ±1, arrow icon swap from `RiArrowUpLine` → `RiArrowUpFill`); failed server action reverts the state.
  - [ ] After a successful toggle that moves a project into top-3, the corresponding row gains the appropriate rank dot (re-sort is end-to-end observable).
  - [ ] Submit button stays anchored to the right of the H1/subtitle block; clicking it opens the existing `SubmitDialog` (behavior unchanged).
  - [ ] Submit button renders a `+` icon followed by the `프로젝트 제출` label, uses square corners (`rounded-none`), and applies the terminal-fg fill with terminal-bg text (asserted via class names or `getComputedStyle`).
- **Verification**:
  - `bun run test:unit -- widgets/project-grid` — colocated Vitest.
  - `bun run test:unit -- vote-button` — inline variant cases.
  - `bun run test:unit -- app/_components/project-board` — integration stub test.
  - `bun run build` — type check.
  - `bun run test:e2e` with a new Playwright spec (`e2e/terminal-board-desktop.spec.ts`) that boots against local Supabase: navigates `/`, asserts 01/02/03 dot colors, hovers a row (verifies `data-hover`), clicks the inline vote button on a non-owner row (verifies optimistic count and eventual re-sort). E2E keeps mocks out at the boundary the criterion actually rides on.
  - Browser MCP — visual sanity check against `http://localhost:3000/`; screenshot to `artifacts/improve-main-page/evidence/t2-desktop.png`.

---

### Checkpoint: After Tasks 1–2

- [ ] `bun run test` passes (Vitest + pgTAP).
- [ ] `bun run build` succeeds.
- [ ] `/` on desktop renders a monospace row list with prompt line, ordered by votes, with top-3 dots; hover and voting work; submit still works; the old `CohortDropdown` is still filtering (chips land in Task 3).

---

### ✅ Task 3: Class filter chips replace dropdown + URL sync

- **Covers**: Scenario 2 (full — chip row, count, inverted selected, URL sync via `history.replaceState`, browser back/forward, no network fetch, subtitle count refresh)
- **Size**: M (5 files)
- **Dependencies**: Task 2 (row list already in place; chips swap atop the same list)
- **References**:
  - `fsd` — new slice UI, public API in `index.ts`
  - `shadcn` — chip is a button with `variant`/`aria-pressed`; no rounded corners
  - `next-best-practices` — `history.replaceState` (no RSC round-trip) on client; URL remains the source of truth for shared links
  - `artifacts/improve-main-page/spec.md` § Scenario 2
  - `artifacts/improve-main-page/wireframe.html` → Screen 0 + Screen 1 chip rows
- **Implementation targets**:
  - `features/cohort-filter/ui/cohort-chips.tsx` (new; props: `cohorts: Cohort[]`, `counts: Record<string, number>` + `allCount: number`, `value: string | null`, `onValueChange: (id: string | null) => void`; renders `모든 클래스` first, then `cohort.label` for each)
  - `features/cohort-filter/ui/cohort-chips.test.tsx` (new)
  - `features/cohort-filter/index.ts` (export `CohortChips`)
  - `app/_components/project-board.tsx` (compute counts from `projects` + `cohorts`, swap `<CohortDropdown>` for `<CohortChips>`, keep existing `handleCohortChange` that does `history.replaceState`; update subtitle to reflect filtered count)
  - `app/_components/project-board.test.tsx` (swap stub, assert count-per-chip, assert subtitle count updates)
  - `features/cohort-filter/ui/cohort-dropdown.tsx` + test (delete)
- **Acceptance**:
  - [ ] CohortChips renders exactly one `모든 클래스` chip followed by one chip per cohort, in the order returned by `fetchCohorts`.
  - [ ] Every chip shows its count (number of projects matching that cohort, or the full list for `모든 클래스`).
  - [ ] The selected chip carries `aria-pressed="true"` and uses the inverted color pair (fg background, bg text); unselected chips carry a 1 px border and `aria-pressed="false"`.
  - [ ] Clicking `LG전자 1기` calls `onValueChange` with that cohort's `id`; clicking `모든 클래스` calls `onValueChange(null)`.
  - [ ] Inside `ProjectBoard`, clicking a class chip updates `window.location.search` to `?cohort=<id>` via `history.replaceState` (URL changes without a page reload); clicking `모든 클래스` removes the param so the URL becomes `/`.
  - [ ] Browser back/forward restores the previous chip selection and list filter (tested in E2E via `page.goBack()`).
  - [ ] The subtitle `{N}개 프로젝트 · 마음에 드는 곳에 응원을 보내주세요.` updates `{N}` to the filtered count on chip click.
  - [ ] No network request for the project list is issued on chip click (client-side filter; same initial payload).
  - [ ] PromptLine (from Task 1) re-renders with the new cohort label when a class chip is clicked.
  - [ ] User-visible copy under `/` contains no occurrence of the English word `cohort` anywhere in the DOM text (chip labels, subtitle, H1, table header, etc.) — only `클래스` is used as the Korean term. The `--class="…"` flag on the prompt line is the sole English appearance, and the word is `class`, not `cohort`.
- **Verification**:
  - `bun run test:unit -- cohort-chips` — colocated Vitest.
  - `bun run test:unit -- app/_components/project-board` — count rendering, subtitle update.
  - `bun run build`.
  - `bun run test:e2e -- terminal-board-chips.spec.ts` — Playwright: click a class chip, assert URL updated, assert no network fetch for the project list, assert prompt-line text, press Back, assert restored state.
  - Browser MCP — visual check; `artifacts/improve-main-page/evidence/t3-chips.png`.

---

### ✅ Task 4: Owner-only inline edit/delete icon actions

- **Covers**: Scenario 6 (full — inline icons always visible to owner, invisible to non-owner, no layout shift, dialogs unchanged)
- **Size**: M (5 files)
- **Dependencies**: Task 2 (row layout + vote slot already exists via `renderOwnerActions`)
- **References**:
  - `shadcn` — icon-only button variant
  - `web-design-guidelines` — 24 px min icon target; `aria-label` on icon-only buttons
  - `artifacts/improve-main-page/spec.md` § Scenario 6
  - `artifacts/improve-main-page/wireframe.html` → Screen 1 owner row
- **Implementation targets**:
  - `features/edit-project/ui/edit-dialog.tsx` (add `variant?: "default" | "icon"` → `"icon"` renders a 28 px square Button with `<RiEditLine>` and `aria-label="프로젝트 편집"`)
  - `features/edit-project/ui/edit-dialog.test.tsx` (add variant case)
  - `features/delete-project/ui/delete-button.tsx` (add `variant?: "default" | "icon"` → 28 px square Button with `<RiDeleteBinLine>` and `aria-label="프로젝트 삭제"`)
  - `features/delete-project/ui/delete-button.test.tsx`
  - `app/_components/project-board.tsx` (pass `variant="icon"` through the existing `renderOwnerActions` slot)
  - `app/_components/project-board.test.tsx`
- **Acceptance**:
  - [ ] `EditDialog variant="icon"` renders a single button with no text content; `aria-label` contains `편집` or `Edit`; clicking opens the same dialog that `variant="default"` opens.
  - [ ] `DeleteButton variant="icon"` renders a single button with no text content; `aria-label` contains `삭제` or `Delete`; clicking fires the same delete flow.
  - [ ] On the landing row, when viewer owns the project, exactly two icon buttons render to the left of the vote button and are always visible (no `display: none`, no hover-only reveal).
  - [ ] On the same row rendered for a non-owner viewer, neither icon button is in the DOM.
  - [ ] Owner and non-owner rows have identical computed height (no layout shift when switching `cohort` filter that moves owner's project in/out of the visible set).
- **Verification**:
  - `bun run test:unit -- edit-dialog` and `delete-button` — variant cases; assert `aria-label` + dialog trigger behavior.
  - `bun run test:unit -- app/_components/project-board` — rendering both viewer-owned and viewer-not-owned projects; assert visibility.
  - `bun run test:e2e -- terminal-board-owner.spec.ts` — Playwright: sign in as project owner (seed fixture); assert icons visible on own row; click edit → dialog opens; click delete → confirmation flow.
  - Browser MCP — screenshot owner row; `artifacts/improve-main-page/evidence/t4-owner.png`.

---

### Checkpoint: After Tasks 3–4

- [ ] `bun run test` passes.
- [ ] `bun run build` succeeds.
- [ ] `/` on desktop renders a full terminal row list with chip filter, prompt line, owner inline actions — all desktop scenarios (1, 2, 3, 4, 5, 6) observable end-to-end.
- [ ] `CohortDropdown` and its test are deleted; no dangling imports (`grep -rn "CohortDropdown"` returns zero hits outside history).

---

### ✅ Task 5: Mobile row layout (< 720 px) + chip wrap

- **Covers**: Scenario 7 (full — stacked card row, rank overlay on thumb, horizontal vote button, chip wrap, no scrollbar)
- **Size**: S (2–3 files)
- **Dependencies**: Task 2 (desktop row), Task 3 (chips)
- **References**:
  - `artifacts/improve-main-page/spec.md` § Scenario 7 (⚠ see "Spec sync pending" at end; 3 bullets need updating to match wireframe 🅰️)
  - `artifacts/improve-main-page/wireframe.html` → Screen 2 mobile rows (64 px fixed row, 48×48 thumb with rank badge overlay, horizontal vote button)
  - `next-best-practices` — Tailwind responsive with `@container` / `md:` breakpoints
- **Implementation targets**:
  - `widgets/project-grid/ui/project-card.tsx` (add mobile branch: 64 px-tall row, 48×48 square thumb with a 2 px-offset rank-badge overlay in the top-left, a 3-line text stack (title · tagline · `{author} · {submittedAt}`), and the horizontal VoteButton from Task 2)
  - `widgets/project-grid/ui/project-card.test.tsx` (add mobile layout assertions; mock `matchMedia` or use container-query jsdom-compatible assertions)
  - `features/cohort-filter/ui/cohort-chips.tsx` (confirm `flex-wrap` on the chip container — no `overflow-x-auto`)
- **Acceptance**:
  - [ ] At viewport width 375 px, the chip row wraps onto multiple lines (no horizontal scrollbar — the container has no `overflow-x` value).
  - [ ] At viewport width 375 px, each project row has computed height 64 px (± 2 px), with a 48 px × 48 px thumb on the left, a 3-line text block in the middle, and a horizontal vote button on the right.
  - [ ] The rank badge renders as an absolutely-positioned element inside the thumbnail, top: 2 px, left: 2 px; for rank 1–3 it includes a colored dot + two-digit number; for rank 4+ it includes only the dim two-digit number (no dot).
  - [ ] The text block shows three one-line truncated strings: title (fg), tagline (dim), `{author} · {submittedAt}` (dim).
  - [ ] The desktop `RANK PREVIEW NAME AUTHOR VOTES` header strip is absent at 375 px.
  - [ ] Vote button below 720 px is the same horizontal inline variant used on desktop (no separate vertical variant re-emerges).
  - [ ] H1, subtitle, and `프로젝트 제출` button stack vertically; submit button remains visible without horizontal scroll.
- **Verification**:
  - `bun run test:unit -- project-card` — mobile branch assertions with `matchMedia` mock.
  - `bun run test:e2e -- terminal-board-mobile.spec.ts` — Playwright: set viewport to 375 × 812, load `/`, measure row height, assert chip wrap via bounding boxes of first vs last chip (different `y` coordinates), assert no horizontal scroll on `<body>`.
  - Browser MCP with `resize_window` to 375 × 812; `artifacts/improve-main-page/evidence/t5-mobile.png`.
  - Human review (design judgment): you (the maintainer) confirm that the mobile row reads as "card-ish" rather than "squished table row" per the option 🅰️ decision. Save screenshot under `evidence/t5-mobile-review.png` with a one-line note.

---

### ✅ Task 6: Terminal palette — exact hex tokens, dark + light

- **Covers**: Scenario 8 (full — exact hex values in both modes, terracotta $ / `_` preserved, theme change without data refetch) + Scenario 5 (full remainder — submit button uses terminal fg/bg) + Invariant "Color discipline"
- **Size**: S (3–4 files)
- **Dependencies**: Tasks 1–5 (tokens land last so earlier tasks use whatever semantic tokens work and this task retunes to exact values)
- **References**:
  - `artifacts/improve-main-page/spec.md` § Scenario 8, § Invariants → Color discipline
  - `artifacts/improve-main-page/references/TerminalBoard.jsx` lines 17–63 (token definitions for both modes)
  - `shadcn` — `cssVariables: true` pattern; do not redefine `:root` semantic tokens
- **Implementation targets**:
  - `app/globals.css` (add a new `@theme` block + `.terminal-surface` scope under `:root` and `.dark` that declares `--term-bg`, `--term-surface`, `--term-surface-2`, `--term-fg`, `--term-dim`, `--term-muted`, `--term-border`, `--term-border-soft`, `--rank-1`, `--rank-2`, `--rank-3` with the exact hexes from the spec)
  - `app/page.tsx` (wrap `<main>` with `className="terminal-surface"` or equivalent; apply `bg-[var(--term-bg)] text-[var(--term-fg)]`)
  - `widgets/project-grid/ui/project-card.tsx`, `project-grid.tsx`, `rank-badge.tsx`, `prompt-line.tsx`, `features/cohort-filter/ui/cohort-chips.tsx`, `features/toggle-vote/ui/vote-button.tsx` (`variant="inline"` path only) — swap Tailwind semantic classes to arbitrary values pointing at the new tokens (`bg-[var(--term-surface-2)]`, `border-[var(--term-border)]`, etc.)
  - `widgets/project-grid/ui/rank-badge.tsx` — map rank 1/2/3 to `var(--rank-1/2/3)` in both modes
- **Acceptance**:
  - [ ] Under `.dark`, a freshly-rendered `<main class="terminal-surface">` has `background-color` = `#0d1117` and `color` = `#e6edf3` (verified via `getComputedStyle`).
  - [ ] Under light mode, the same element has `background-color` = `#fafaf9` and `color` = `#1a1512`.
  - [ ] Surface-2 hover background is `#1f262e` dark / `#f4f4f3` light; row border uses `#30363d` dark / `#e5e5e3` light.
  - [ ] Rank-1 dot is `#f0b84c` in dark and `#f59e0b` in light; rank-2 is `#a1a1aa` in both; rank-3 is `#ffa657` dark / `#c2410c` light.
  - [ ] Toggling theme via the existing header menu repaints the board within one frame without any `fetchProjects` request being issued (network tab assertion in Playwright / Browser MCP).
  - [ ] Outside `.terminal-surface` (i.e., inside Header and Footer widgets), computed background and foreground values are unchanged from their current shadcn oklch values.
  - [ ] No element on `/` uses a chromatic color other than (a) the three rank dots, (b) the brand terracotta on the wordmark `>` `_` and the prompt `$ `. A DOM sweep asserts no stray Tailwind color utility (e.g., `text-green-500`, `bg-blue-*`) is applied.
- **Verification**:
  - `bun run test:unit -- project-card project-grid prompt-line cohort-chips` — assert class names contain the expected `var(--term-*)` arbitrary values; use `getComputedStyle` where possible.
  - `bun run build` — Tailwind 4 arbitrary-value safelisting.
  - `bun run test:e2e -- terminal-board-theme.spec.ts` — Playwright: load `/` dark, assert `getComputedStyle(main).backgroundColor === 'rgb(13, 17, 23)'`; toggle to light via HeaderMenu; assert `rgb(250, 250, 249)`; assert no `[data-testid="project-grid"]` fetch was issued during the toggle.
  - Browser MCP — capture dark + light screenshots; `artifacts/improve-main-page/evidence/t6-dark.png`, `t6-light.png`.
  - Human review — confirm that header (unchanged shadcn palette) and board (terminal palette) sit together acceptably; note any re-tuning request in `evidence/t6-review.md`.

---

### Checkpoint: After Tasks 5–6 (final)

- [ ] `bun run test` passes (Vitest + pgTAP).
- [ ] `bun run test:e2e` passes (all new spec files).
- [ ] `bun run build` succeeds.
- [ ] Manual walkthrough on `/` across desktop (1280 × 800) and mobile (375 × 812) in both dark and light — every scenario (1–8) passes visual sanity.
- [ ] Accessibility invariant verified end-to-end: starting from the page body, pressing `Tab` reaches (in this order) each active class chip → the submit button → each row's title link → each row's vote button → (for owner rows) edit icon → delete icon. Every focused element shows a visible focus ring in both dark and light palettes. Record the tab-order walk in `artifacts/improve-main-page/evidence/final-a11y-walk.md`.
- [ ] `artifacts/improve-main-page/evidence/` contains screenshots for each task.
- [ ] No dangling imports of `CohortDropdown` or `RankBadge` (renamed/deleted) anywhere in the tree.

---

## Undecided Items

- **Spec sync pending (scenario-7 wording).** The wireframe 🅰️ decision overrides three Success Criteria bullets in `spec.md` § Scenario 7:
  1. "a 34 px-tall thumbnail" → should read "a 48×48 square thumbnail with a rank-badge overlay in its top-left corner".
  2. "vertical vote button (up-arrow over count)" → should read "horizontal vote button (up-arrow + count inline), matching the desktop inline variant".
  3. "Filter chips scroll horizontally when the set overflows the viewport" → should read "Filter chips wrap onto multiple lines; no horizontal scrollbar is introduced".

  The `sketch-wireframe` skill forbids touching `spec.md` from within the wireframe loop. Before `/execute-plan` starts Task 5, run a short `/write-spec` pass to apply these three line-level edits so the Success Criteria and the Acceptance bullets don't diverge. This plan's Task 5 Acceptance bullets reflect the 🅰️ decision (not the stale spec bullets); the sync keeps the two in lockstep.

- **None others.** All other design / architecture questions were resolved in the `/write-spec` and `/sketch-wireframe` passes (owner actions inline-always-visible, class-flag token, 클래스 terminology, wireframe option 🅰️).
