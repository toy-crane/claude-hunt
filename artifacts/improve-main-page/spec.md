## Overview

Replace the landing page body (`/`) with a dense monospace "터미널 보드" — a ranked row list with a prompt line, class-filter chips, and hover-expanding thumbnails — while keeping the existing site header, footer, and every interaction rule already shipped (voting, class filtering, project submission, owner edit/delete).

Authoritative design source: `artifacts/improve-main-page/references/terminal-board.html` and the components it pulls in (`TerminalBoard.jsx`, `colors_and_type.css`).

## Scope

### Included
- A ranked, monospace row list on `/`, sorted by vote count descending.
- A single prompt line above the H1 that reflects the active class filter.
- Horizontal class-filter chips (with counts) replacing today's class dropdown on this page.
- Two-digit zero-padded rank numbers in every row.
- Colored 6 px rank dots on the top 3 rows only; ranks 04+ render with no dot.
- Small row thumbnail that scales ~1.08× on hover; the row's background lifts on hover.
- Square-cornered monospace vote button reusing existing vote semantics.
- Always-visible, owner-only edit / delete icon buttons on the owner's row.
- Dark-first terminal palette that follows the site's existing theme toggle; a matching light variant.
- Mobile layout (viewport < 720 px) that stacks each row into a card with a vote button on the right.

### Excluded
- **Header and footer visuals.** Scope is the page body; both widgets already match the aesthetic.
- **Tag chips / tag filter.** The app has no tag concept.
- **A per-page theme toggle.** The global toggle in the header's account menu already exists.
- **New empty / loading / error visuals.** Reuse today's copy and layout.
- **Keyboard navigation (`j/k`, `↑↓`, `/`), a `--help` modal, and a project-detail "man page" view.** Called out as follow-ups; out of scope this round.
- **ANSI rainbow coloring, bash traffic-light chrome, realtime clock, ASCII vote bars, vim-style statusline, extra blinking cursors.** Removed in the design's v3 "minimal" pass.

## Scenarios

### 1. Browsing the board as a visitor
- **Given** — an unauthenticated viewer opens `/` without a `cohort` query param.
- **When** — the page renders.
- **Then** — the body shows a monospace row list sorted by vote count descending, the prompt line shows the default flags, and the subtitle reports the visible project count.

Success Criteria:
- [ ] The prompt line above the H1 is exactly `$ claude-hunt ls --sort=votes`. The leading `$ ` renders in the brand terracotta color; the rest renders in the dim terminal foreground.
- [ ] The H1 reads `프로젝트 보드`.
- [ ] A subtitle directly below the H1 reads `{N}개 프로젝트 · 마음에 드는 곳에 응원을 보내주세요.`, where `{N}` is the number of rows currently rendered.
- [ ] Row order top-to-bottom matches projects sorted by `votes` descending; ties preserve the server-provided secondary order (unchanged from today).
- [ ] Each row's rank cell shows a two-digit zero-padded number (`01`, `02`, …, `10`, `11`).
- [ ] Rows at ranks 1, 2, 3 show a 6 px round dot to the left of the rank number — color by rank, pulled from the active theme's rank palette (dark: `#f0b84c / #a1a1aa / #ffa657`; light: `#f59e0b / #71717a / #c2410c`).
- [ ] Rows at ranks 4+ show no dot and render the rank number in the dim foreground color.
- [ ] At viewport widths ≥ 720 px, a table header strip is visible above the first row with the labels `RANK`, `PREVIEW`, `NAME`, `AUTHOR`, `VOTES` (uppercase, monospace, muted, letter-spaced).

### 2. Filtering by class
- **Given** — the board is showing all classes.
- **When** — the viewer clicks a class chip (e.g. `LG전자 1기`).
- **Then** — the list narrows to that class in place, the URL updates to reflect the choice, and the prompt line rewrites its flag.

Success Criteria:
- [ ] The filter chips render left-to-right: `모든 클래스` first, then each class in the order returned by the existing classes fetch.
- [ ] Each chip shows an inline count of matching projects next to its label (e.g. `모든 클래스 9`, `LG전자 1기 5`, `인프런 4`).
- [ ] The selected chip uses inverted colors — terminal-fg background, terminal-bg text, no border — while unselected chips show a 1 px terminal-border stroke on a transparent fill.
- [ ] Clicking a class chip updates the URL to `/?cohort=<class_id>` without a full page reload; clicking `모든 클래스` removes the query param so the URL becomes `/`.
- [ ] Browser back/forward restores the previously selected chip and the corresponding filtered list.
- [ ] With a class selected, the prompt line reads `$ claude-hunt ls --class="<exact class label>" --sort=votes` — e.g. `$ claude-hunt ls --class="LG전자 1기" --sort=votes`. With no class selected, the `--class=...` segment is absent.
- [ ] The subtitle's `{N}개 프로젝트` count updates to match the filtered row count.
- [ ] Switching chips issues no additional project-list network request; filtering happens over the initial payload (matching today's client behavior).

### 3. Hovering a row on desktop
- **Given** — the viewer is on a viewport ≥ 720 px and not currently hovering any row.
- **When** — the viewer hovers any row.
- **Then** — that row lifts its background and scales its thumbnail smoothly, while every other row stays unchanged.

Success Criteria:
- [ ] The hovered row's background transitions from transparent to the active theme's `surface-2` color within 150 ms; on mouse-leave it reverses within 150 ms.
- [ ] The hovered row's thumbnail transforms from `scale(1)` to `scale(1.08)` over ~200 ms, anchored at its left edge, and does not overflow into neighboring columns.
- [ ] No other row visually changes while one is hovered.
- [ ] Clicking the project title or the thumbnail opens the project's URL in a new tab with `rel="noopener noreferrer"` (behavior unchanged from today).

### 4. Voting from the terminal board
- **Given** — a row is visible on the board.
- **When** — the viewer clicks the row's vote button.
- **Then** — the same auth and ownership rules that apply on today's card grid apply on the row list, and a successful vote re-ranks the board.

Success Criteria:
- [ ] The vote button is square-cornered (no border radius), has a 1 px terminal-border stroke when not voted, and a filled terminal-foreground background with inverted terminal-background text when voted.
- [ ] The vote count uses tabular-num monospace figures; the icon switches from an outlined up-arrow (not voted) to a filled up-arrow (voted).
- [ ] An unauthenticated viewer clicking vote is routed through the existing sign-in flow; no vote is recorded.
- [ ] An authenticated viewer clicking the vote button on their own project sees no state change (self-vote remains blocked, as today).
- [ ] An authenticated non-owner toggling their vote sees the icon state, the displayed count, and the button fill update together.
- [ ] After a vote change, rows re-sort by new vote counts, the zero-padded rank numbers re-number top-to-bottom, and the top-3 rank dots attach to whichever rows now occupy ranks 1, 2, 3.

### 5. Submitting a project from the board
- **Given** — any viewer is on the board.
- **When** — they click the `프로젝트 제출` button.
- **Then** — the existing submit dialog opens unchanged.

Success Criteria:
- [ ] The `프로젝트 제출` button sits to the right of the H1/subtitle block (mirroring today's position); on narrow viewports it wraps to a new line but stays reachable.
- [ ] The button is square-cornered, fills with the terminal foreground color, renders its label in the terminal background color, and shows a `+` icon before the label.
- [ ] Clicking the button opens the existing submit dialog with the same inputs it receives today (signed-in viewer's class, authenticated flag).
- [ ] Unauthenticated viewers see the existing sign-in prompt from within the submit flow; this design does not change that behavior.

### 6. Owner-only edit / delete on the board
- **Given** — an authenticated viewer is the author of a rendered row.
- **When** — the row renders.
- **Then** — small edit and delete icon buttons appear inline on that row, visible without hover.

Success Criteria:
- [ ] The owner's row shows two square-cornered icon-only buttons (edit pencil, delete trash) adjacent to its vote button; both remain visible any time the row is rendered.
- [ ] A non-owner viewing the same row sees neither button.
- [ ] Clicking edit opens the existing edit dialog; clicking delete opens the existing delete-confirmation flow (both unchanged).
- [ ] The owner row's total height equals a non-owner row's height in the same viewport (no layout shift when switching filters or signing in/out).

### 7. Mobile rendering (< 720 px viewport)
- **Given** — the viewer loads or resizes the page to a viewport narrower than 720 px.
- **When** — the board renders.
- **Then** — each row becomes a stacked card with a large thumbnail and a vote button on the right, and the desktop table header disappears.

Success Criteria:
- [ ] The `RANK PREVIEW NAME AUTHOR VOTES` header strip is not rendered below 720 px.
- [ ] Each row shows, top-to-bottom: a meta line (`{rank} · {class label}` with top-3 dot), a full-width thumbnail with a 16:10 aspect ratio, a two-line block with the title (heading font, 16 px) and tagline (sans, 13 px, dim), and a bottom row with `{author} · {submittedAt}` on the left and a vote button on the right.
- [ ] Filter chips scroll horizontally when they overflow the viewport; the selected chip retains its inverted-color treatment.
- [ ] The H1, subtitle, and `프로젝트 제출` button flow into a single column with consistent vertical spacing; the button stays reachable without horizontal scrolling.
- [ ] The prompt line is visible but may wrap onto two lines when the `--class=...` flag is long; the leading `$ ` remains terracotta.

### 8. Theme — dark and light variants
- **Given** — the site's theme toggle in the header's account menu is used.
- **When** — the viewer switches between dark and light.
- **Then** — the entire terminal board repaints using the matching terminal palette without a page reload and without re-fetching project data.

Success Criteria:
- [ ] Dark mode palette: background `#0d1117`, foreground `#e6edf3`, surface `#161b22`, surface-2 `#1f262e`, border `#30363d`, border-soft `#21262d`, dim `#7d8590`, muted `#484f58`.
- [ ] Light mode palette: background `#fafaf9`, foreground `#1a1512`, surface `#ffffff`, surface-2 `#f4f4f3`, border `#e5e5e3`, border-soft `#eeeeec`, dim `#6b6b68`, muted `#a8a8a4`.
- [ ] Dark rank-dot colors: `#f0b84c`, `#a1a1aa`, `#ffa657`. Light rank-dot colors: `#f59e0b`, `#71717a`, `#c2410c`.
- [ ] The wordmark `>` / `_` and the prompt `$ ` render in the brand terracotta — light-mode `#c15f3c`, dark-mode `#e88a67` (or its `--accent-terracotta` equivalent in the active theme).
- [ ] Theme toggling is immediate: no layout shift, no re-fetch, no flash of the previous palette.

## Invariants

- **Accessibility.** Every new interactive element (class chip, vote button, submit button, owner icon buttons, title/thumbnail links) is reachable in natural tab order and operable with Enter/Space. Focus outlines are visible against both the dark and light terminal palettes.
- **Server-data parity.** The board consumes the same server payload the card grid consumes today; no new list-fetch endpoint is introduced.
- **Behavioral parity.** Every auth, ownership, self-vote, and submit rule active on today's card grid remains active on the new row list. The visual redesign never changes who can do what.
- **Terminology.** User-visible copy uses `클래스`. The English token `class` appears only as a decorative CLI flag name on the prompt line (`--class="..."`); `cohort` never appears in user-visible copy.
- **Color discipline.** The only chromatic colors on the page are the three rank dots and the brand terracotta `>` / `_` / `$ `. Everything else is foreground / dim / muted / border grayscale, matching the site's existing color rule.

## Dependencies

- Existing site header and footer widgets (unchanged).
- Existing project-submit dialog, vote button, edit dialog, and delete-confirmation flow (reused as-is).
- Existing site theme toggle in the header's account menu (unchanged).
- Existing class (cohort) fetch that returns `{ id, label }` in a stable order.

## Undecided Items

_(none — the design handoff resolves owner actions as always-visible inline icons and the prompt flag format as `--class="<class label>"`.)_
