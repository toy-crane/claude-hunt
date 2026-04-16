## Overview
Replace the understated outline vote button on project-board cards with a prominent vertical "upvote pill" in a reserved warm coral color, so the primary action on each card is visually unmissable and the card shows the vote count in only one place.

## Scope

### Included
- A new vertical upvote pill (arrow on top, numeric count below) appears at the top-right of every project card's content area on the project board.
- Distinct visual states for: **idle** (not voted), **voted**, **saving** (in-flight server call), and **owner** (read-only count, no button).
- A reserved accent color used exclusively for the upvote pill — no other element on the page uses it.
- The existing duplicate vote-count indicator that currently appears next to the project title is removed. The pill is the only place a count is displayed on the card.

### Excluded
- Detail/modal views of a project. Out of scope because the ask is limited to the project-board card.
- Animations beyond the existing press/disabled state. The user framed this as a "nothing special" visual tweak.
- Copy or i18n changes. The accessible label stays in the current language; no wording changes were requested.
- Server, database, or rate-limit changes. This is a visual change only — the toggle-vote behavior stays identical.

## Scenarios

### 1. Signed-in viewer sees an unvoted card
- **Given** a signed-in viewer who has not voted on a project showing a count of 128
- **When** the project board loads
- **Then** the card displays a vertical pill at the top-right with an up-arrow and the number "128"; the pill is outlined in warm coral and its interior is the card background color

Success Criteria:
- [ ] The pill is a single tappable control with accessible name "추천하기" and `aria-pressed="false"`
- [ ] The visible count inside the pill is "128"
- [ ] No duplicate count indicator is rendered elsewhere on the card

### 2. Signed-in viewer upvotes a card
- **Given** a signed-in viewer looking at an unvoted card with count "128"
- **When** the viewer clicks the pill
- **Then** the pill immediately switches to the voted state: solid coral background, white arrow and count, `aria-pressed="true"`, and the count becomes "129"

Success Criteria:
- [ ] The count visible inside the pill changes from "128" to "129" within the same paint as the click (optimistic update)
- [ ] The pill's pressed state (`aria-pressed="true"`) is reflected before the server round-trip completes
- [ ] When the server confirms success, the pill remains in the voted state with count "129"

### 3. Server rejects the vote
- **Given** a signed-in viewer who clicked the pill on a card with count "128"
- **When** the server responds with a failure
- **Then** the pill reverts to the idle state with count "128" and `aria-pressed="false"`

Success Criteria:
- [ ] The count returns to "128" after the failing response
- [ ] The pill is interactive again (`disabled` removed) so the viewer can retry

### 4. Anonymous viewer is routed to sign-in
- **Given** an anonymous (not signed-in) viewer on the project board
- **When** the viewer activates the pill on a card with count "42"
- **Then** the browser navigates to `/login`; the count displayed on the card before activation was "42"

Success Criteria:
- [ ] The pill is rendered with count "42" and is activatable (not disabled)
- [ ] Activating the pill results in navigation to `/login`
- [ ] No optimistic count change occurs on the anonymous viewer's screen

### 5. Owner sees a read-only count, not a pill
- **Given** a signed-in viewer who owns the project they are looking at, with 7 votes
- **When** the project board renders that card
- **Then** no upvote pill is shown; a muted read-only count "7" with an up-arrow glyph appears in the same top-right slot where the pill would otherwise be

Success Criteria:
- [ ] No control with accessible name "추천하기" is present on the owner's own card
- [ ] The visible count "7" is present exactly once on the card
- [ ] The read-only count is rendered in a muted (non-coral) style so it is visually distinct from the pill

## Invariants

- **Single source of count.** Each project card displays its vote count in exactly one location — the pill (for non-owners) or the read-only indicator (for owners). No card ever shows the count twice.
- **Reserved accent.** The warm-coral accent is used only for the upvote pill's idle border/text and voted fill. No other element (link, badge, heading, icon, rank medal, etc.) on the project board uses this color.
- **Owner cannot vote.** No access path — UI, keyboard, or any other interaction — lets a project's owner cast or appear to cast a vote on their own project.

## Dependencies
- Existing toggle-vote server action and authentication gating. No changes required; this feature consumes them as-is.

## Undecided Items
_None — all questions were resolved during wireframe review._
