# Recommendations and Ranking

## Decisions

- Call the project-level support signal `추천`. Each authenticated user may recommend another user's project at most once and may toggle that recommendation; self-recommendation is rejected.
- Recommendation counts are public. There is no per-class quota, deadline, or instructor override.
- The project board initially ranks projects by recommendation count, then keeps that first-seen row order stable for the rest of the browser session. Updated counts appear immediately, and a refreshed visit applies the new rank.
- The home highlights up to four projects from the current Korean calendar month, ordered by recommendation count and then recency. If the current month is empty, it truthfully labels and shows the most recent month that contains projects.
- Class filtering narrows the same shared project set; it does not create a separate ranking system or route per class.

## Boundaries

- Emoji reactions belong to comments and replies. They do not affect project ranking.
- A recommendation is an expression of support, not a score supplied by an operator.

## Why

A single toggle keeps participation lightweight and makes the ranking legible. Cross-class, always-open recommendations keep older work discoverable without an operating calendar. Freezing row positions during a session avoids moving content under a reader and avoids the iOS instability previously observed during live reorder animations.

## Reconsider when

- Cross-class recommendations produce a measurable fairness problem or coordinated gaming.
- The project volume requires pagination, archived periods, or separate ranking windows.
- A live reorder approach is verified to remain stable on supported iOS browsers and does not interrupt reading.

## Still-rejected alternatives

- Instructor ranking overrides — weakens the meaning of peer recommendations; reconsider only if the board becomes a formally judged program.
- Vote deadlines — adds operating complexity without evidence that always-open participation is harmful.
