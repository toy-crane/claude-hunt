# Improve OG Image — Spec

## Overview

The site's link preview (Open Graph image) currently shows a large wordmark and an English tagline on a blank page. It tells a first-time viewer nothing about what is actually on claude-hunt.com. This feature replaces that preview with the "인기 프로젝트 티저" design (final 2B from the handoff bundle): a Korean-language composition that pairs the wordmark with the site's current top-ranked projects — by name in the left column and as a tilted screenshot grid on the right — so anyone who sees a shared link immediately understands what the site is and what is on it right now.

Design reference: `artifacts/improve-og-image/references/project/og-image-final.html` (`OgGridB`).

## Scope

### Included

- The root/site-wide Open Graph image served when claude-hunt.com is shared (e.g. `https://www.claude-hunt.com/`).
- Korean-only copy, matching the rest of the site.
- Preview reflects the same project ordering a visitor sees on the homepage (most-upvoted first, ties broken by newest).
- Data is snapshotted at build and refreshed on a cache revalidation window so the preview stays in sync with the live homepage without a DB hit on every scrape.

### Excluded

- Per-project or per-page OG images (e.g. one image per project detail page). Reason: the handoff bundle only includes a site-wide design; per-page variants would be a separate design pass.
- Non-Korean OG variants. Reason: the site itself is Korean-only today, and the confirmed design (chat round 4) is in Korean.
- Twitter card or other non-OG preview formats. Reason: current `opengraph-image.tsx` is the only preview Next.js emits; introducing new formats is out of scope for this improvement.
- Any change to the homepage, project list, or schema. Reason: this feature consumes the existing ranking; it does not change it.

## Scenarios

### 1. Someone shares a claude-hunt.com link — full preview renders

- **Given** — The homepage currently has 6 or more projects.
- **When** — A scraper (Slack, KakaoTalk, X, Discord, etc.) requests the Open Graph image for the site root.
- **Then** — A 1200×630 PNG is returned that contains, simultaneously visible: the `>claude-hunt_` wordmark, the tagline `함께 배우는 사람들의 프로젝트.`, the subtitle `마음에 드는 프로젝트에 응원을 보내주세요.`, the section label `지금 인기 프로젝트`, the names of the current top 3 projects (separated by `·`), the text `claude-hunt.com`, and a tilted −7° grid of 6 project screenshots on the right half.

Success Criteria:
- [ ] Response `content-type` is `image/png` and dimensions are exactly 1200×630.
- [ ] Rendered pixels include each of these literal strings: `claude-hunt`, `함께 배우는 사람들의 프로젝트.`, `마음에 드는 프로젝트에 응원을 보내주세요.`, `지금 인기 프로젝트`, `claude-hunt.com`.
- [ ] The `>` and `_` characters adjacent to the wordmark are rendered in terracotta (`#c15f3c`).
- [ ] The right half of the canvas contains 6 distinct screenshot thumbnails laid out in a 2-column grid, visually rotated counter-clockwise (≈ −7°).
- [ ] The right half has a left-to-right fade so thumbnails further right fade into the background (`#fafafa`).
- [ ] Response `alt` attribute includes the literal string `claude-hunt`.

### 2. Top 3 names match homepage ranking

- **Given** — The homepage list is ordered by upvote count (desc), tiebroken by `created_at` (desc).
- **When** — The OG image is requested.
- **Then** — The three names in the `지금 인기 프로젝트` row are exactly the 1st, 2nd, and 3rd project titles on the homepage, in that order, each prefixed with a colored dot: 1st in gold (`#f59e0b`), 2nd in silver (`#a1a1aa`), 3rd in bronze (`#c2410c`).

Success Criteria:
- [ ] If the homepage's 1st/2nd/3rd projects are `A`, `B`, `C`, the OG text row reads `● A · ● B · ● C` in that order.
- [ ] The three dots to the left of the names render in `#f59e0b`, `#a1a1aa`, `#c2410c` respectively — no other color may be used for these three glyphs.
- [ ] If the homepage top 3 changes (a project overtakes another), the OG preview reflects the new ordering after the next revalidation tick (see Invariants).

### 3. Top 3 in the screenshot grid are badged

- **Given** — The homepage has 3 or more projects.
- **When** — The OG image is requested.
- **Then** — In the right-side tilted grid, the first three cards (1st, 2nd, 3rd) each show a small rectangular badge in their top-left reading `1st`, `2nd`, `3rd` respectively; cards in positions 4–6 have no badge.

Success Criteria:
- [ ] The grid card corresponding to rank 1 shows a badge with the literal text `1st` and text color `#f59e0b`.
- [ ] Rank 2's badge reads `2nd` with text color `#a1a1aa`.
- [ ] Rank 3's badge reads `3rd` with text color `#c2410c`.
- [ ] Cards in positions 4, 5, 6 contain no badge element in their thumbnail area.
- [ ] Each of the 6 cards shows its project's screenshot as the thumbnail (not a placeholder) when a screenshot is available.

### 4. Project card body content

- **Given** — A project has a title, a description, an author display name, and an upvote count.
- **When** — It appears as one of the 6 cards in the OG image grid.
- **Then** — The card body shows the project's title, a 2-line-clamped description, the author's display name followed by `· 작성`, and a small pill reading `▲ <vote count>`.

Success Criteria:
- [ ] Each card body contains the literal project title string.
- [ ] Each card body contains the author's display name followed by the suffix `· 작성`.
- [ ] Each card body contains a vote pill whose text matches `▲ <N>` where `<N>` equals the project's current vote count (as an integer).
- [ ] Descriptions longer than two lines are visually truncated (not clipped mid-word across more than two visible lines).

### 5. Fewer than 6 projects exist

- **Given** — The site has exactly `N` projects where `N < 6` (a realistic boundary for early cohort weeks or a fresh deploy).
- **When** — The OG image is requested.
- **Then** — The grid renders only the `N` available project cards (no placeholder or ghost cards), and the `지금 인기 프로젝트` row lists only the `min(N, 3)` available top names.

Success Criteria:
- [ ] With `N = 2`, exactly 2 cards appear in the grid and the top-names row lists exactly 2 names.
- [ ] With `N = 0`, the grid area contains no project cards; the left column still renders wordmark, tagline, subtitle, and `claude-hunt.com`. The `지금 인기 프로젝트` row is either omitted or rendered with no names — but it must not show placeholder text like "TBD" or a broken separator.

## Invariants

- **Dimensions / format:** Every response is a `1200 × 630` `image/png` — no other size or format, regardless of state.
- **Ordering consistency:** The 3 names in the `지금 인기 프로젝트` row and the 3 badged cards in the grid (`1st`, `2nd`, `3rd`) always reference the same three projects in the same order. They cannot disagree.
- **Freshness:** After the homepage's top-6 set changes, the OG preview reflects the change within one cache revalidation window. Outside of that window, the preview must not hit the database on scrape (so Slack/X scrapers do not cause load).
- **Korean-only visible copy:** No English strings appear in the rendered image other than the wordmark `claude-hunt`, the rank badge text (`1st` / `2nd` / `3rd`), the URL `claude-hunt.com`, and the `▲` vote-count pills.
- **Color palette:** Only the following colors appear in the rendered image: white/near-white backgrounds (`#ffffff`, `#fafafa`, `#f4f4f5`), ink `#252525`, muted `#8c8c8c`, terracotta `#c15f3c` (wordmark glyphs only), rank gold `#f59e0b`, silver `#a1a1aa`, bronze `#c2410c`, and whatever colors exist inside the project screenshots themselves. No additional accent, gradient stop, or brand color is introduced.

## Dependencies

- The homepage's existing top-projects ordering (same source the current homepage grid consumes).
- The existing project-screenshot public URLs (same source the homepage cards use).
- `next/og` `ImageResponse` (already used by the current `app/opengraph-image.tsx`).

## Undecided Items

- **Cache revalidation interval.** Defaulted to 1 hour. If a different interval is desired (15 min for faster reflection of new top-3 changes, 24 hours for cheaper regeneration), call it out before `/draft-plan`.
