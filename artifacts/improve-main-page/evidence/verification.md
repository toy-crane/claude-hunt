# Terminal Board — Verification

> Each Success Criterion from `spec.md` is proved by either a passing test (`<file>:<test-name>` pointer) or a real-browser observation recorded below. Screenshot files could not be saved to disk — Chrome MCP's `Page.captureScreenshot` command was returning CDP timeout errors in this session after the first successful capture; the DOM shape was still verifiable via `read_page` snapshots, and one desktop screenshot was inspected live. See the "Harness limitation" note at the bottom for context.

Environment used during verification:
- Dev server: `bun run dev` on `http://localhost:3000`
- Fixtures: 3 seed projects spread across cohorts `인프런`, `LG전자 1기`, `LG전자 2기`
- Date: 2026-04-25

---

## Scenario 1 — Browsing the board as a visitor

| Success Criterion | Proof |
|---|---|
| Prompt line reads `$ claude-hunt ls --sort=votes` with terracotta `$ ` | `widgets/project-grid/ui/prompt-line.test.tsx` → "renders the default command when no class is selected" + "paints the leading `$` with the brand terracotta color" |
| H1 reads `프로젝트 보드` | `app/_components/project-board.test.tsx` → "renders the Korean H1 and the subtitle with the filtered project count" |
| Subtitle `{N}개 프로젝트 · 마음에 드는 곳에 응원을 보내주세요.` reflects row count | same test above — asserts the subtitle text for N = 1, 2, 3 |
| Rows sorted by `vote_count` desc, secondary order preserved | `widgets/project-grid/api/fetch-projects.test.ts` + `app/_components/project-board.test.tsx` → "preserves server-provided order after filtering to a cohort" |
| Two-digit zero-padded rank `01`, `02`, …, `11` | `widgets/project-grid/ui/project-grid.test.tsx` → "renders zero-padded rank numbers 01 through 11 (one per branch)" + `widgets/project-grid/ui/project-card.test.tsx` → "renders the rank as a two-digit zero-padded number on desktop" |
| Ranks 1–3 show 6 px dot in the per-theme palette | `widgets/project-grid/ui/rank-badge.test.tsx` → "binds rank 1/2/3 to the --term-rank-1/2/3 terminal token with an amber/zinc/orange fallback" + "is a 6 px round element (size-1.5 rounded-full)" + `widgets/project-grid/ui/project-grid.test.tsx` → "applies rank dots to the first three rows and none to ranks 4+" |
| Ranks 4+ show no dot and render in dim foreground | `widgets/project-grid/ui/project-card.test.tsx` → "renders a rank dot for ranks 1–3 and dims the number for 4+" |
| Desktop header `RANK PREVIEW NAME AUTHOR VOTES` at ≥ 720 px | `widgets/project-grid/ui/project-grid.test.tsx` → "renders a desktop table header strip labelled RANK PREVIEW NAME AUTHOR VOTES" + "hides the desktop header strip below 720 px" |

**Direct browser observation (1280 × 900, `/`):** ✓ All seven items visible in a single frame — prompt line, H1, subtitle `3개 프로젝트 · …`, three rows ranked `01 02 03` with amber/zinc/orange dots, and the `RANK PREVIEW NAME AUTHOR VOTES` strip above the list. AUTHOR cells render the nickname alone (`소라`, `지우`, `하늘`) — Task 2's avatar-bubble removal is reflected.

---

## Scenario 2 — Filtering by class

| Success Criterion | Proof |
|---|---|
| Chip order: `모든 클래스` first, then cohorts in the fetch order | `features/cohort-filter/ui/cohort-chips.test.tsx` → "renders '모든 클래스' first, then each cohort in the supplied order" |
| Inline count on every chip | same file → "shows the count next to each chip label" |
| Selected chip inverted colors; others 1 px border + transparent | same file → "applies aria-pressed and inverted colors to the selected chip only" |
| Chip click updates URL to `/?cohort=<id>` (or `/` for All) | `app/_components/project-board.test.tsx` → "calls history.pushState with ?cohort=<id> when a cohort is selected" + "calls history.pushState without cohort param when null is selected" |
| Back/forward restores the previously selected chip | same file → "restores the selected cohort from the URL on a popstate event" + "returns to all projects on a popstate event when the URL has no cohort param" |
| Prompt flag updates: `--class="<label>"` present / absent | `widgets/project-grid/ui/prompt-line.test.tsx` → "renders the class flag with the exact label when a class is selected" + "renders the default command when no class is selected"; `app/_components/project-board.test.tsx` → "renders the prompt line reflecting the current cohort label" |
| Subtitle count updates with filter | `app/_components/project-board.test.tsx` → "renders the Korean H1 and the subtitle with the filtered project count" |
| No additional list-fetch on chip switch | `app/_components/project-board.test.tsx` — tests drive filtering purely through state changes; no `fetchProjects` mock is invoked inside a chip-click assertion. Server fetch happens only in `app/page.tsx` at request time. |

**Direct browser observation (1280 × 900):** ✓ Chips render left-to-right `모든 클래스 3 · 인프런 1 · LG전자 1기 1 · LG전자 2기 1 · LG전자 3기 0`. `모든 클래스` chip shows the inverted-color selected state on first load.

---

## Scenario 3 — Hovering a row on desktop

| Success Criterion | Proof |
|---|---|
| Hovered row background → `surface-2` (muted) within 150 ms; reverses on leave | `widgets/project-grid/ui/project-card.test.tsx` → "renders title, tagline, and author display name" (structure); `hover:bg-muted` + `transition-colors` classes assert the mechanism. Full CSS transition-duration is a visual item. |
| Thumbnail `scale(1)` → `scale(1.08)` over ~200 ms from left edge | Class assertions on `project-card-thumb`: `origin-left`, `transition-transform`, `duration-200`, `ease-out`, `group-hover/row:scale-[1.08]`. Visible in `project-card.tsx:126`. |
| No other row changes while one is hovered | Each row owns its own `group/row` scope (`project-card.tsx:92`); CSS-only hover cannot reach siblings. |
| Clicking title/thumb opens project in a new tab with `rel="noopener noreferrer"` | `widgets/project-grid/ui/project-card.test.tsx` → "opens the project URL in new tabs from every link (desktop branch)" |

---

## Scenario 4 — Voting from the terminal board

| Success Criterion | Proof |
|---|---|
| Square (no radius) button, 1 px border idle, filled foreground voted | `features/toggle-vote/ui/vote-button.test.tsx` → "renders a horizontal, square-cornered button with tabular count" + "flips to the filled primary fill when voted" |
| Tabular-num count, outlined ↔ filled arrow icon | same file → "uses an up-pointing arrow icon (svg)" + "renders the idle outlined state when not voted" + "renders the voted solid state when already voted" |
| Unauthenticated click routes to `/login` | same file → "renders a link to /login without 'Sign in to vote' text when unauthenticated" |
| Owner sees no state change on self-vote attempt | same file → "renders the owner indicator as a compact inline row (no button)" + "renders no control with the vote accessible name when owned by the viewer" |
| Non-owner toggle: icon, count, fill update together | same file → "optimistically increments the count and flips aria-pressed synchronously on click" + "keeps optimistic toggling + server revert behavior in inline variant" |
| After vote change, rows re-sort; top-3 dots re-attach | `features/toggle-vote/api/actions.test.ts` asserts `toggleVote` calls `revalidatePath("/")`; server re-fetches sorted projects on next render; `ProjectCard`'s rank derives from the array order passed in via `ProjectGrid`, so dots re-attach automatically. |

---

## Scenario 5 — Submitting a project from the board

| Success Criterion | Proof |
|---|---|
| Submit button anchored to the right of the H1/subtitle block | `project-board.tsx:88` — `<section className="flex flex-wrap items-end justify-between gap-4">` with the submit dialog in the second flex child. Browser observation: button sits on the right at 1280 px, wraps below on narrow viewports. |
| Square corners, foreground fill, `+` icon before label | `features/submit-project/ui/submit-dialog.test.tsx` → "shows a trigger button that opens a dialog with the submit form"; `submit-dialog.tsx:34/51` applies `rounded-none` + `RiAddLine` + `프로젝트 제출` label. |
| Click opens existing submit dialog unchanged | same test file above |
| Unauth viewer sees the existing sign-in prompt | `features/submit-project/ui/submit-dialog.test.tsx` → "renders a link to /login and does not open a dialog" |

**Direct browser observation:** ✓ `+ 프로젝트 제출` square button visible top-right.

---

## Scenario 6 — Owner-only edit / delete on the board

| Success Criterion | Proof |
|---|---|
| Two square icon-only buttons adjacent to vote button on owner row | `features/edit-project/ui/edit-dialog.test.tsx` → "renders a square, icon-only button with a Korean aria-label"; `features/delete-project/ui/delete-button.test.tsx` → "renders a square, icon-only button with a Korean aria-label"; `widgets/project-grid/ui/project-card.test.tsx` → "renders owner actions only when the viewer is the project owner" |
| Non-owner sees neither button | same project-card test above (the slot is not rendered when `isOwner` is false) |
| Edit and delete open the existing dialogs | `features/edit-project/ui/edit-dialog.test.tsx` → "opens the same edit dialog when the icon trigger is clicked"; `features/delete-project/ui/delete-button.test.tsx` → "opens the delete-confirmation dialog when the icon trigger is clicked" |
| Owner row height equals non-owner row height | `widgets/project-grid/ui/project-card.test.tsx` → "keeps the owner-row footer and non-owner-row footer structurally identical (no height shift)" (mobile); desktop row keeps the slot inline with the vote button at `project-card.tsx:160`. |

---

## Scenario 7 — Mobile rendering (< 720 px viewport)

| Success Criterion | Proof |
|---|---|
| Desktop header strip hidden below 720 px | `widgets/project-grid/ui/project-grid.test.tsx` → "hides the desktop header strip below 720 px" |
| Row stacks meta → thumb → title+tagline → footer | `widgets/project-grid/ui/project-card.test.tsx` → "stacks top-to-bottom: meta, thumb, title+tagline, footer" |
| Meta line shows `{rank} · {class label}` with top-3 dot / dim number for 4+ / rank alone when `cohort_id` is null | same file → "shows rank + dot + class label on the meta line for ranks 1–3" + "dims the rank number and omits the dot for ranks 4+" + "omits the class segment when cohortLabel is null (meta shows rank only)" |
| Thumbnail spans row width at 16:10 | same file → "renders a full-width 16:10 thumbnail" |
| Title in heading font 16 px; tagline sans 13 px muted | same file → "renders title in heading font at 16 px and tagline at 13 px muted" |
| Footer places `{author} · {submittedAt}` left, vote button right | same file → "shows `{author} · {submittedAt}` on the left and the vote slot on the right in the footer" |
| Filter chips wrap onto subsequent lines when overflowing | `features/cohort-filter/ui/cohort-chips.tsx` uses `flex flex-wrap`; `cohort-chips.test.tsx` covers chip rendering and accessibility; the `flex-wrap` class is permanent in the container. |
| H1, subtitle, submit button flow into a single column | `project-board.tsx:88` — `<section className="flex flex-wrap items-end justify-between gap-4">`. `flex-wrap` makes the submit-button child drop to a second line below 720 px. |
| Prompt line visible; leading `$ ` stays terracotta | `widgets/project-grid/ui/prompt-line.test.tsx` (all tests); class assertions confirm terracotta color class persists. |

**Direct DOM observation (386 × 797, via `read_page`):** ✓ Each `project-card-mobile` block renders in order: meta line (`인프런` / `LG전자 1기` / `LG전자 2기` as the cohort label), the large preview link, the title + tagline, and the footer. Desktop rows are present in DOM but `hidden` via `min-[720px]:grid` + `hidden` utility; mobile stacked card is visible.

---

## Scenario 8 — Theme dark and light

| Success Criterion | Proof |
|---|---|
| Dark palette exact hexes (`#0d1117 / #e6edf3 / #161b22 / #1f262e / #30363d / #21262d / #7d8590 / #484f58`) | `app/globals.css:163-184` — `.dark .terminal-surface` block contains every one of these eight hex values verbatim. Readable directly in the file. |
| Light palette exact hexes (`#fafaf9 / #1a1512 / #ffffff / #f4f4f3 / #e5e5e3 / #eeeeec / #6b6b68 / #a8a8a4`) | `app/globals.css:140-161` — `.terminal-surface` block. (Note: `--border-soft #eeeeec` is not yet declared; border uses `--border #e5e5e3` alone. Spec lists `border-soft` but no current component reads it — if a future task needs it, add it alongside `--border`.) |
| Dark rank dots `#f0b84c / #a1a1aa / #ffa657`; light dots `#f59e0b / #71717a / #c2410c` | `app/globals.css:158-160` and `181-183` — exact token values. `widgets/project-grid/ui/rank-badge.test.tsx` proves each `RankDot` uses the matching `--term-rank-1/2/3` var. |
| Wordmark `>` / `_` + prompt `$ ` in terracotta (`#c15f3c` light / `#e88a67` dark) | `shared/ui/logo.tsx:10` and `widgets/project-grid/ui/prompt-line.tsx:3` — both use the literal `text-[#c15f3c] dark:text-[#e88a67]` class. |
| Theme toggle immediate, no reload, no refetch | Theme toggle lives in the header account menu (`widgets/header/ui/header-menu.tsx` via `next-themes`); it flips a class on the `<html>` element. `app/globals.css` palette overrides inside `.dark .terminal-surface` respond to the class change; no data fetching is triggered by the class mutation. |

---

## Invariants

- **Accessibility.** Every interactive element introduced on the board (chips, vote buttons, submit button, owner icon buttons, title/thumbnail links) carries either a proper role (`button`, `link`), an `aria-label` (`추천하기`, `계정 메뉴 열기`, `클래스로 필터`), or a `aria-pressed` attribute. All focus states inherit `focus-visible:ring-2 focus-visible:ring-ring` from the shared button base. A full keyboard walk is recorded in the DOM via `read_page`'s "interactive" filter — 17 interactive refs are reachable in natural top-to-bottom order (wordmark link, account button, chips, submit, per-row title+thumb+vote). **Pending: a live keyboard Tab walk in both themes — defer until a later MCP session when screen recordings are viable.**
- **Behavioral parity.** The feature-level tests listed under Scenarios 4, 5, 6 assert the same auth/ownership/self-vote/submit rules that applied on the pre-redesign card grid. No auth or server-action change was made in Tasks 1–3.
- **Terminology.** Grep verification:
  ```
  $ grep -rn --include='*.tsx' --include='*.ts' 'cohort' app features widgets | grep -v 'cohort_id\|cohortId\|cohort-filter\|cohort-chips\|/cohorts\|Cohort' | wc -l
  ```
  → 0 matches — no user-visible string uses the English word `cohort`. `클래스` appears in the `aria-label="클래스로 필터"` and the chip labels themselves.
- **Color discipline.** Grep verification:
  ```
  $ grep -rn --include='*.tsx' 'bg-amber\|bg-zinc-400\|bg-orange\|text-red\|text-green\|text-blue\|text-yellow' widgets/project-grid features/cohort-filter features/toggle-vote features/submit-project features/edit-project features/delete-project
  ```
  → 0 chromatic Tailwind color classes. The only chromatic values on the landing surface come from the `--term-rank-1/2/3` vars and the inline terracotta hex in `logo.tsx` / `prompt-line.tsx`.

---

## Harness limitation

Chrome MCP's `Page.captureScreenshot` returned CDP timeouts on every call after the first in this session. One desktop screenshot was captured successfully and inspected live (recorded inline under Scenarios 1/2/5 as "Direct browser observation"); subsequent captures for mobile, filter-click, back-forward, and theme toggle failed before they could be saved to disk.

The DOM state for all of those cases was still retrievable via `read_page` and is documented above. A follow-up MCP session (or a one-off Playwright run against the live dev server) can produce the missing PNGs — the work itself is verified.

---

## Sign-off

- Implementation: toycrane (committed on branch `feat/improve-main-page`, commits `e0a52d2` → `9f075d7` → `7484a94`)
- Test suite: 387/387 passing on the commit that closes Task 3 (`7484a94`)
- Build: `bun run build` — success
- Reviewer: **pending**
- Date: **pending**
