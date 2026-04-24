## Overview

Redesign the landing page body as a dense, monospace "터미널 보드" — a ranked row list with a prompt line, class-filter chips, and hover-expanding thumbnails — while keeping the existing site header, footer, and every interaction rule already shipped (voting, class filtering, project submission, owner edit / delete).

## Scope

### Included
- Replace the card grid on `/` with a ranked, monospace row list sorted by vote count descending.
- A single prompt line above the H1 that reflects the active class filter.
- Horizontal class-filter chips (with counts) replacing today's class dropdown on this page.
- Tiny colored rank dots for the top 3 rows only; ranks 04+ render without a dot.
- Small row thumbnail that scales ~1.08× on hover; row background lifts on hover.
- Square-cornered, monospace vote button reusing existing vote semantics.
- Inline, always-visible owner-only edit / delete icon buttons on the owner's row.
- Dark-first terminal palette (GitHub-dark-like) that follows the site's existing theme toggle; a matching light variant.
- Mobile layout (< 720 px) that stacks each row with a vertical vote button on the right.

### Excluded
- Header and Footer visual changes — the scope of this feature is the page body only; both widgets already ship a matching aesthetic.
- Tag chips / tag filter — the app has no tag concept.
- Per-page theme toggle — the site's header account menu already exposes theme.
- New empty-state, loading-state, or error-state visuals — reuse current copy and layout.
- Keyboard navigation (`j/k`, `↑↓`, `/`), `--help` modal, and project-detail "man page" view — listed as follow-ups in the design chat but out of scope this round.
- ANSI rainbow coloring, bash traffic-light chrome, realtime clock, ASCII vote bars, vim-style statusline, extra blinking cursors beyond the wordmark — explicitly removed during the v3 "minimal" pass in the design chat.

## Scenarios

### 1. Browsing the board as a visitor
- **Given** — an unauthenticated viewer opens `/` with no `cohort` query param.
- **When** — the page renders.
- **Then** — the body shows a monospace row list sorted by vote count descending, the prompt line reads `$ claude-hunt ls --sort=votes`, and the subtitle reports the visible project count.

Success Criteria:
- [ ] H1 reads `프로젝트 보드` and sits above a subtitle of the form `{N}개 프로젝트 · 마음에 드는 곳에 응원을 보내주세요.`, where `{N}` equals the number of rows currently rendered.
- [ ] Row order top-to-bottom matches projects sorted by `vote_count` descending; ties preserve the server-provided secondary order (unchanged from today).
- [ ] The rank cell renders a two-digit zero-padded number: `01`, `02`, `03`, `04`, … `10`, `11`.
- [ ] Rows in ranks 1–3 show a 6 px solid dot to the left of the rank number: rank 1 amber `#f59e0b`, rank 2 zinc `#a1a1aa`, rank 3 orange `#c2410c`.
- [ ] Rows in ranks 4+ show no dot and render the rank number in the dimmed foreground color.
- [ ] The prompt line text is exactly `$ claude-hunt ls --sort=votes`, with the leading `$ ` painted in the brand terracotta color.
- [ ] A desktop table header row labeled `RANK  PREVIEW  NAME  AUTHOR  VOTES` is visible at viewport widths ≥ 720 px.

### 2. Filtering by class
- **Given** — the board is showing all classes.
- **When** — the viewer clicks a class chip (e.g., `LG전자 1기`).
- **Then** — the list narrows to that class in place, the URL updates, and the prompt line rewrites its flag to reflect the choice.

Success Criteria:
- [ ] Filter chips render left-to-right: `모든 클래스` first, then each class in the order returned by the existing classes fetch.
- [ ] Each chip shows an inline count of matching projects next to its label (e.g., `모든 클래스 17`, `LG전자 1기 6`).
- [ ] The selected chip has inverted colors (terminal-fg background, terminal-bg text); unselected chips show a 1 px terminal-border stroke and transparent fill.
- [ ] Clicking a class chip updates the URL to `/?cohort=<class_id>` without a full page reload; clicking `모든 클래스` removes the query param so the URL becomes `/`.
- [ ] Browser back/forward restores the previously selected chip and list filter.
- [ ] With a class selected, the prompt line reads `$ claude-hunt ls --class="<exact class label>" --sort=votes` — e.g., `$ claude-hunt ls --class="LG전자 1기" --sort=votes`. With no class selected, the `--class=...` segment is absent.
- [ ] The subtitle's `{N}개 프로젝트` count updates to match the filtered row count.
- [ ] Switching chips issues no additional project-list network request (filtering happens over the initial payload, matching today's client behavior).

### 3. Hovering a row on desktop
- **Given** — the viewer's pointer is outside the row list on a ≥ 720 px viewport.
- **When** — the viewer hovers any row.
- **Then** — that row's background lifts one shade and its thumbnail scales smoothly, while every other row stays unchanged.

Success Criteria:
- [ ] Hovered row's background changes from transparent to the terminal surface-2 color within 150 ms.
- [ ] Hovered row's thumbnail transforms `scale(1)` → `scale(1.08)` over ~200 ms from the left edge, and does not overflow into neighboring columns.
- [ ] On mouse-leave, both effects reverse within the same duration.
- [ ] Clicking the project title or the thumbnail opens the project's URL in a new tab with `rel="noopener noreferrer"` (unchanged behavior).
- [ ] No other row visually changes while one is hovered.

### 4. Voting from the terminal board
- **Given** — a row is visible on the board.
- **When** — the viewer clicks its vote button.
- **Then** — the same authentication and ownership rules that apply on today's card grid apply unchanged on the new row list, and a successful vote updates rank positions accordingly.

Success Criteria:
- [ ] An unauthenticated viewer clicking vote is routed through the existing sign-in flow; no vote is recorded.
- [ ] An authenticated viewer clicking the vote button on their own project sees no state change (self-vote remains blocked, as today).
- [ ] An authenticated non-owner toggles their vote: the button shows a filled up-arrow and the incremented count when voted, an outline up-arrow and the base count when not voted.
- [ ] The vote button has square corners (no border-radius), a 1 px border when not voted, and a filled foreground background with inverted text when voted; the numeric count uses a tabular-num monospace figure.
- [ ] After a vote change, rows re-sort by the new vote counts; the top-3 rank dots attach to whatever rows now occupy ranks 1, 2, 3.

### 5. Submitting a project from the board
- **Given** — any viewer is on the board.
- **When** — they click `프로젝트 제출`.
- **Then** — the existing submit dialog opens with unchanged behavior.

Success Criteria:
- [ ] The `프로젝트 제출` button is anchored to the right of the H1/subtitle block, mirroring today's position.
- [ ] The button is square-cornered, uses the terminal foreground as its fill and the terminal background as its text color, and shows a `+` icon followed by the label.
- [ ] Clicking the button opens the current submit dialog with the same inputs it receives today (the signed-in viewer's class, authenticated flag).
- [ ] Unauthenticated viewers see the existing sign-in prompt from within the submit flow — this design does not change that behavior.

### 6. Owner-only edit / delete on the board
- **Given** — an authenticated viewer is the author of a row being rendered.
- **When** — the row renders.
- **Then** — small edit and delete icon buttons appear inline on that row, visible without hover.

Success Criteria:
- [ ] The owner's row shows two square-cornered icon-only buttons (edit pencil, delete trash) adjacent to its vote button; both are always visible whenever the row is rendered.
- [ ] A non-owner looking at the same row sees neither button.
- [ ] Clicking edit opens the existing edit dialog; clicking delete opens the existing delete-confirmation flow (both behaviors unchanged).
- [ ] The inline owner buttons keep the row's total height equal to non-owner rows (no layout shift when switching filters).

### 7. Mobile rendering (< 720 px viewport)
- **Given** — the viewer loads or resizes the page to a viewport narrower than 720 px.
- **When** — the board renders.
- **Then** — each row becomes a compact stacked card with a vertical vote button, and the desktop table header disappears.

Success Criteria:
- [ ] The `RANK PREVIEW NAME AUTHOR VOTES` header strip is not rendered below 720 px.
- [ ] Each row shows, left-to-right: rank (with dot for top 3), a 34 px-tall thumbnail, a two-line block with title and `{author} · {submittedAt}`, and a vertical vote button (up-arrow over count).
- [ ] Filter chips scroll horizontally when the set overflows the viewport; the selected chip retains its inverted-color treatment.
- [ ] H1, subtitle, and the `프로젝트 제출` button flow into a single column with consistent spacing; the button remains reachable without horizontal scrolling.
- [ ] Prompt line is visible but may wrap onto two lines when the flag string is long; the leading `$ ` stays terracotta.

### 8. Theme — dark and light variants
- **Given** — the site's theme toggle (in the header's account menu) is used.
- **When** — the viewer switches between dark and light.
- **Then** — the entire terminal board repaints using the matching terminal palette without a page reload.

Success Criteria:
- [ ] Dark mode palette: background `#0d1117`, foreground `#e6edf3`, surface `#161b22`, surface-2 `#1f262e`, border `#30363d`, dim `#7d8590`, muted `#484f58`.
- [ ] Light mode palette: background `#fafaf9`, foreground `#1a1512`, surface `#ffffff`, surface-2 `#f4f4f3`, border `#e5e5e3`, dim `#6b6b68`, muted `#a8a8a4`.
- [ ] Rank dots switch color sets between modes (dark: `#f0b84c / #a1a1aa / #ffa657`; light: `#f59e0b / #71717a / #c2410c`).
- [ ] The brand terracotta on the prompt `$` and the wordmark `_` / `>` stay visually correct in both modes (existing site wordmark colors; no change there).
- [ ] Theme changes apply without re-fetching project data.

## Invariants

- **Accessibility** — every new interactive element (class chip, vote button, submit button, owner icon buttons, title/thumbnail links) is reachable in natural tab order and operable with Enter/Space. Focus outlines are visible against both the dark and light terminal palettes.
- **Parity with server data** — the board consumes the same server payload the card grid consumes today; no new list-fetch endpoint is introduced.
- **Behavioral parity** — every auth, ownership, self-vote, and submit rule active on today's card grid remains active on the new row list. Changing the visual layer must not change who can do what.
- **Terminology** — user-visible copy uses `클래스`. The English token `class` appears only as a decorative CLI flag name on the prompt line (`--class=...`); `cohort` never appears in user-visible copy.
- **Color discipline** — the only chromatic colors on the page are the three rank dots and the brand terracotta `>` / `_` / `$ `. Everything else is foreground / dim / muted / border grayscale (per the site's existing color rule).

## Dependencies

- Existing site header and footer widgets (unchanged).
- Existing project-submit dialog, vote button, edit dialog, and delete-confirmation flow (reused as-is).
- Existing site theme toggle in the header's account menu (unchanged).
- Existing class (cohort) fetch that returns `{ id, label }` in a stable order.

## Undecided Items

_(none — both open questions from discussion were resolved: owner actions inline-always-visible; prompt flag renders as `--class="<class label>"`.)_
