## Overview
Add a smooth reorder animation to the project board so that when a viewer votes or unvotes a project and the project's rank changes, the affected cards slide to their new positions instead of snapping instantly.

## Scope

### Included
- Smooth card reorder on the project board after a viewer's own vote/unvote succeeds and the ranking changes
- Respect for the viewer's `prefers-reduced-motion` setting (no animation when reduced motion is requested)

### Excluded
- Animating the vote button's own state change (icon, color, count) — current snap behavior is unchanged; user explicitly chose "card reorder only"
- Animating cohort-filter switches, page navigations, or any reorder not caused by the viewer's vote — scope deferred to keep this change focused
- Animating reorders caused by other users' votes — the board does not update in real time today, and that remains out of scope
- Any change to the server action, the sort order, vote storage, or vote counts — purely a visual change

## Scenarios

### 1. Vote raises a card's rank
**Given** a viewer is on the project board, and project P is currently below project Q in the ranked list
**When** the viewer votes on P such that P's new vote count places it above Q
**Then** P and Q exchange positions with a visible sliding animation; the final ordering matches the authoritative server-rendered order

Success Criteria:
- [ ] P starts below Q and ends above Q after the vote
- [ ] During the transition, both cards are visible simultaneously at intermediate positions (the reorder is animated, not instant)
- [ ] After the animation completes, the DOM order of cards matches the server-rendered ranked order (vote_count desc, created_at desc)

### 2. Unvote lowers a card's rank
**Given** a viewer has previously voted on project P, and P is currently ranked above project Q
**When** the viewer unvotes P such that P's new vote count places it below Q
**Then** P and Q exchange positions with a visible sliding animation

Success Criteria:
- [ ] P starts above Q and ends below Q after the unvote
- [ ] The reorder is animated, not instant

### 3. Vote that does not change rank
**Given** a viewer is on the project board and project P's rank will not change as a result of voting (e.g., its neighbors have vote counts far away)
**When** the viewer votes on P
**Then** no card changes position and no reorder animation plays

Success Criteria:
- [ ] No card visibly moves from its original row/column slot
- [ ] The grid remains visually stable (only the vote button's own count and state update, as today)

### 4. Failed vote does not animate
**Given** a viewer is on the project board and the server rejects the vote (e.g., network failure or server error)
**When** the viewer clicks the vote button
**Then** no card reorder animation plays and the ranked list is unchanged

Success Criteria:
- [ ] After the failure, the DOM order of cards is identical to the order before the click
- [ ] No sliding motion is observed on any card during or after the failed request

### 5. Reduced-motion preference disables the animation
**Given** the viewer has `prefers-reduced-motion: reduce` set at the OS or browser level
**When** the viewer votes on a project in a way that changes the ranking
**Then** the cards move to their new positions without a sliding animation

Success Criteria:
- [ ] With reduced motion enabled, cards in their new positions render without a visible slide transition
- [ ] Final ordering still matches the authoritative server-rendered order

## Invariants
- **Accessibility**: The feature must honor the viewer's `prefers-reduced-motion` setting at all times. When reduced motion is requested, the reorder happens with no transition.
- **Behavior preservation**: All existing vote behaviors are unchanged — optimistic count update on the button, rollback on server failure, redirect to sign-in for anonymous viewers, read-only indicator for owners, disabled-while-pending state, and the final vote counts after revalidation.
- **Final state parity**: Regardless of whether the animation plays, the final ordering and visible counts always match the authoritative server state after the vote is committed.

## Dependencies
- Existing vote toggle feature (`features/toggle-vote`) with its optimistic UI and server action
- Existing project grid on the home page, already sorted server-side by vote count descending, then created_at descending

## Undecided Items
- None
