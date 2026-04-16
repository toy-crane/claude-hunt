# Improve Vote Button Implementation Plan

> **Post-execution note** (commit `e7073c5`): the `--vote` coral token was introduced during execution, then rolled back to monochrome per an aesthetic revision. Current implementation uses the theme's existing `--primary` / `--foreground` / `--background` tokens. See `decisions.md` for the full audit trail.

## Architecture Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| ~~Color exposure (rolled back)~~ | ~~Add `--vote` / `--vote-foreground` tokens~~ | Dropped — see Decisions log. Current: uses `--primary` / `--foreground` directly, no new token. |
| Accent treatment | Idle: outlined on card background (`bg-background` + `text-foreground` + `border-border`). Voted: solid `bg-primary` with `text-primary-foreground`. | Monochrome state switch avoids an extra custom token and keeps the palette austere. |
| Owner read-only slot owner | Keep the read-only count inside `VoteButton`, not in a separate component | `VoteButton` already branches on `ownedByViewer`; returning a muted indicator (instead of `null`) keeps the project-card slot contract "render one thing in the top-right" with a single caller. |
| Scope of the pill slot | Place the pill at the top-right of the card's content area (not overlapping the screenshot) | Matches the approved wireframe; doesn't disturb the screenshot's click target (which opens the project URL). |
| Keep existing slot API | `renderVoteButton` prop on `ProjectGrid`/`ProjectCard` is unchanged | Only the slot's position inside `ProjectCard` and the rendered markup change — no callers need updating. |

## Infrastructure Resources

| Resource | Type | Declared in | Creation Task |
|----------|------|-------------|---------------|
| None     |      |             |               |

## Data Model

Unchanged. No schema or table modifications; the feature is a pure UI refactor over the existing `toggle-vote` server action and vote count.

## Required Skills

| Skill | Applicable Task | Purpose |
|-------|-----------------|---------|
| test-driven-development | Tasks 2, 3, 4, 5 | Write each failing test first (RED), then adjust markup/logic to green. Existing test files already exist and need assertion updates. |
| frontend-ui-engineering | Tasks 2, 3, 4, 5 | Production-quality component work for the pill and card layout. |
| shadcn | Tasks 1, 2, 3 | Adding the `--vote` semantic token in `globals.css` and adjusting the shadcn `Button` usage (variant swap, className for layout, `data-icon` for icon, no manual sizing on icons). |
| vercel-react-best-practices | Tasks 2, 3 | `"use client"` boundary, `useTransition`, optimistic state — confirm idiomatic usage. |
| web-design-guidelines | Task 1 | Verify coral color contrast at both idle (text-on-card) and voted (card-on-coral) boundaries. |

## Affected Files

| File Path | Change Type | Related Task |
|-----------|-------------|--------------|
| `app/globals.css` | Modify | Task 1 |
| `features/toggle-vote/ui/vote-button.tsx` | Modify | Tasks 2, 3, 4 |
| `features/toggle-vote/ui/vote-button.test.tsx` | Modify | Tasks 2, 3, 4 |
| `widgets/project-grid/ui/project-card.tsx` | Modify | Task 5 |
| `widgets/project-grid/ui/project-card.test.tsx` | Modify | Task 5 |

## Tasks

### Task 1: Add the `--vote` coral theme token

- **Covers**: Spec invariant "Reserved accent" (prerequisite; not scenario coverage)
- **Size**: S (1 file)
- **Dependencies**: None
- **References**:
  - `shadcn` skill — semantic tokens, `@theme inline`, CSS variables
  - `web-design-guidelines` skill — contrast check
  - `app/globals.css` (existing token layout)
- **Implementation targets**:
  - `app/globals.css` — add `--vote` and `--vote-foreground` under `:root` and `.dark`; register under `@theme inline` so utilities `bg-vote`, `text-vote`, `border-vote` resolve.
- **Acceptance**:
  - [x] Applying `bg-vote` to an element produces the approved coral (`oklch(0.7 0.14 42)` light / `oklch(0.76 0.14 42)` dark) as its background.
  - [x] `text-vote` applies the same coral as its foreground color.
  - [x] No other element in the codebase references `--vote` outside the vote button (reserved accent).
- **Verification**:
  - `bun run build` — confirms the CSS compiles and Tailwind picks up the new utilities.
  - Grep check (reviewer): `rg -n "bg-vote|text-vote|border-vote"` returns references only inside `features/toggle-vote/ui/*`. This boundary is intentional — `widgets/project-grid/ui/project-card.tsx` (Task 5) only relocates the slot and does not apply coral utilities itself; if Task 5 starts referencing coral classes, the grep will flag it as an invariant violation to review.
  - Human review — designer visually inspects the new token by rendering a `bg-vote` sample swatch; saves a screenshot to `artifacts/improve-vote-button/evidence/task-1.png`.

---

### Task 2: VoteButton renders the vertical coral pill for signed-in non-owner viewers

- **Covers**: Scenarios 1, 2, 3 (full)
- **Size**: S (2 files)
- **Dependencies**: Task 1 (needs the `--vote` token to style the pill)
- **References**:
  - `test-driven-development` skill — RED→GREEN for each scenario bullet
  - `vercel-react-best-practices` skill — `useTransition`, optimistic state
  - `shadcn` skill — `Button` variant selection, `data-icon` for the chevron, `cn()` for conditional voted class, no manual icon sizing
  - `features/toggle-vote/api/actions.ts` (existing `toggleVote` server action — unchanged)
- **Implementation targets**:
  - `features/toggle-vote/ui/vote-button.tsx` — replace the horizontal outline button with a vertical pill: chevron-up icon on top, count below, `border-vote text-vote` idle, `bg-vote text-vote-foreground` voted, reduced opacity + `disabled` while pending. Keep props, `aria-label="추천하기"`, `aria-pressed`, `useTransition` flow.
  - `features/toggle-vote/ui/vote-button.test.tsx` — update existing assertions: remove the `border-primary/text-primary` check; add checks for the new coral utility classes and the pill's two-child structure (icon + count). Keep the `toggleVoteMock` and optimistic-count test; add a rollback test for Scenario 3.
- **Acceptance**:
  - [x] Given `alreadyVoted=false`, `voteCount=128`, `isAuthenticated=true`, `ownedByViewer=false` → a single button with accessible name "추천하기", `aria-pressed="false"`, and visible text containing only "128" renders. The pill's idle coral styling is verified as a class-presence proxy (`border-vote` + `text-vote`) — swap for a computed-style check if the utility scheme changes.
  - [x] Clicking that button synchronously shows "129" inside the button and sets `aria-pressed="true"` before any server round-trip resolves.
  - [x] While the server call is in flight, the button carries the `disabled` attribute and a reduced-opacity class/state (class-presence proxy for the visible dim effect) and therefore cannot be clicked again.
  - [x] When `toggleVote` resolves with `{ ok: true }`, the button remains with `aria-pressed="true"` and the visible count stays "129" (happy-path confirm).
  - [x] When `toggleVote` resolves with `{ ok: false }`, the rendered count returns to "128", `aria-pressed` returns to `"false"`, and the button becomes interactive again (no `disabled` attribute).
- **Verification**:
  - `bun run test:unit -- features/toggle-vote/ui/vote-button.test.tsx` — all five acceptance outcomes asserted via Testing Library queries on the DOM, with the in-flight and confirm states driven by controllable deferred promises on the `toggleVoteMock`.
  - `bun run build` — type check + bundle succeeds.

---

### Task 3: VoteButton renders the pill for anonymous viewers as a `/login` link

- **Covers**: Scenario 4 (full)
- **Size**: S (2 files)
- **Dependencies**: Task 2 (shared pill markup; the anonymous branch reuses the same visual primitives)
- **References**:
  - `test-driven-development` skill — new test asserting link role and href
  - `features/toggle-vote/ui/vote-button.tsx` (unauth branch from Task 2)
- **Implementation targets**:
  - `features/toggle-vote/ui/vote-button.tsx` — update the `!isAuthenticated` branch to render the same vertical pill shape, but as a `Link` to `/login`, no optimistic state, no `onClick` handler.
  - `features/toggle-vote/ui/vote-button.test.tsx` — update the existing unauthenticated test: the element is a link with `href="/login"`, accessible name is still "추천하기", content shows only the count, no change in count on click.
- **Acceptance**:
  - [x] Given `isAuthenticated=false` and `voteCount=42` → an element with link role, accessible name "추천하기", `href="/login"`, and visible text containing only "42" renders.
  - [x] Clicking the link does not change the visible count (no optimistic path on the anonymous branch).
  - [x] The link has no `disabled` attribute and is keyboard-activatable (focus visible, Enter activates).
- **Verification**:
  - `bun run test:unit -- features/toggle-vote/ui/vote-button.test.tsx` — asserts role/href/text and that rendered count does not change across a simulated click.
  - `bun run build`.

---

### Task 4: VoteButton renders a muted read-only count for the project owner

- **Covers**: Scenario 5 (full)
- **Size**: S (2 files)
- **Dependencies**: Task 2 (establishes the pill slot dimensions the read-only indicator visually aligns with)
- **References**:
  - `test-driven-development` skill
  - `features/toggle-vote/ui/vote-button.tsx` (owner branch)
- **Implementation targets**:
  - `features/toggle-vote/ui/vote-button.tsx` — change the `ownedByViewer` branch from `return null` to a muted read-only indicator (chevron-up glyph + count) using `text-muted-foreground`; no `role="button"`, no accessible vote label, same vertical footprint so it sits in the pill slot without layout shift.
  - `features/toggle-vote/ui/vote-button.test.tsx` — replace the existing "hides the button when owned" test with assertions that match the new contract: no element with accessible name "추천하기" is rendered, but the count is still shown once.
- **Acceptance**:
  - [x] Given `ownedByViewer=true`, `voteCount=7` → no element queryable by accessible name "추천하기" exists; the count "7" appears exactly once in the output.
  - [x] The owner indicator does not use any of the coral utility classes (`bg-vote`, `text-vote`, `border-vote`); it uses `text-muted-foreground`.
  - [x] The owner indicator is not focusable and carries no `aria-pressed` attribute.
- **Verification**:
  - `bun run test:unit -- features/toggle-vote/ui/vote-button.test.tsx` — asserts accessible-name absence, single count presence, and class-name checks.
  - `bun run build`.

---

### Task 5: ProjectCard relocates the vote slot and removes the duplicate title-row count

- **Covers**: Spec invariant "Single source of count"; the layout premise shared across Scenarios 1–5
- **Size**: S (2 files)
- **Dependencies**: Tasks 2, 3, 4 (slot content renders correctly in all three viewer contexts before the layout moves)
- **References**:
  - `test-driven-development` skill
  - `frontend-ui-engineering` skill — production-quality layout, no regressions in tagline wrap / author line
  - `widgets/project-grid/ui/project-card.tsx` (existing layout)
  - `artifacts/improve-vote-button/wireframe.html` — approved layout (Idle, Voted, and Side-by-side tabs)
- **Implementation targets**:
  - `widgets/project-grid/ui/project-card.tsx` — restructure the content `<div>` into a two-column flex: left column has title → tagline → author → owner actions (unchanged vertical order); right column is a `shrink-0 self-start` slot that calls `renderVoteButton(project)`. Delete the standalone title-row count span (the current `data-testid="vote-count"` indicator). Keep `renderOwnerActions` rendering below the card content for owners.
  - `widgets/project-grid/ui/project-card.test.tsx` — remove the assertion that looks for `getByTestId("vote-count")`; instead, assert that exactly one visible "5" appears on a card whose vote count is 5 (covers the single-source invariant). Keep existing title/tagline/author/image/rank-badge tests.
- **Acceptance**:
  - [x] A card with `vote_count=5` and a provided `renderVoteButton` shows the number "5" exactly once on the card.
  - [x] The `renderVoteButton` slot is rendered at the top-right of the card's content area (to the right of the title/tagline/author block), not in a bottom action row.
  - [x] When a `renderOwnerActions` is provided for the viewer-as-owner case, edit/delete still render below the card's text content (unchanged placement).
- **Verification**:
  - `bun run test:unit -- widgets/project-grid/ui/project-card.test.tsx` — single-count assertion and layout assertions via Testing Library queries.
  - `bun run build`.
  - Browser MCP (`mcp__claude-in-chrome__*`) — navigate to `/` on the running dev server (started with the `run-dev-server` skill), screenshot the project board for three contexts: signed-out viewer, signed-in non-owner, signed-in owner. Save each screenshot to `artifacts/improve-vote-button/evidence/task-5-<context>.png`. Reviewer compares against `wireframe.html` Idle/Voted tabs for layout parity.

---

### Checkpoint: After Task 5

- [x] All tests pass: `bun run test`
- [x] Build succeeds: `bun run build`
- [x] End-to-end visual check on the running dev server: project board shows the new vertical coral pill for signed-in non-owners, a `/login` link-pill for anonymous viewers, and a muted read-only count for owners — with exactly one count per card. Evidence saved under `artifacts/improve-vote-button/evidence/`.

---

## Undecided Items

_None — color, layout, and owner-slot behavior were all resolved during the spec and wireframe phases._
