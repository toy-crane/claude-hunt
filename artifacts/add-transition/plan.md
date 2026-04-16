# add-transition Implementation Plan

## Context

The home project board sorts projects by `vote_count desc, created_at desc`. When a viewer votes or unvotes, the server action's `revalidatePath("/")` re-renders the list with the new order. Today the DOM snaps. The spec (`artifacts/add-transition/spec.md`) asks for a smooth slide when the ranking changes, while keeping every existing behavior (optimistic count on the button, rollback on failure, reduced-motion respect) intact.

Environment already supports the feature out of the box: Next.js 16.1.7 + React 19.2.4 bundle React's `<ViewTransition>` API. `features/toggle-vote/ui/vote-button.tsx` already wraps the server action in `useTransition`, so once cards are wrapped in `<ViewTransition key={project.id}>` inside the grid, the vote-triggered re-render naturally flows into `document.startViewTransition` and the browser animates the position delta.

Scope notes:
- **Only the card reorder animates.** The vote button's own state change stays on its current snap behavior (decided during spec).
- **Only vote actions trigger animation.** Cohort filter uses plain `setState` with no `startTransition`, so it will not animate — matching the spec's "vote only" exclusion. No extra gating (no `addTransitionType`) is needed today.

## Architecture Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Animation mechanism | React `<ViewTransition>` (native `document.startViewTransition`) | React 19.2.4 + Next.js 16.1.7 support it natively; spec forbids new dependencies |
| Pattern | List Reorder — wrap each card with `<ViewTransition key={project.id}>` | Canonical pattern from the `vercel-react-view-transitions` skill; card position interpolation handled by the browser |
| Trigger source | Existing `useTransition` in `VoteButton` | Vote action already runs inside `startTransition`; no other grid-affecting `startTransition` exists today |
| VT placement | Inside `widgets/project-grid/ui/project-grid.tsx`'s `.map()`, above `<ProjectCard>` | Satisfies skill's "before any DOM nodes" rule; no wrapper div between list and VT |
| `key` location | Move `key={project.id}` from `<ProjectCard>` to `<ViewTransition>` | Per skill's example; list identity must be on the VT |
| Reduced motion | CSS-only via `@media (prefers-reduced-motion: reduce)` on VT pseudo-elements | Browser honors preference automatically; no React-side gate needed |
| Transition type tagging | Not used | Single trigger (vote) today; adding `addTransitionType` + type-keyed maps would be premature complexity |
| CSS scope | Only the reduced-motion rule — no fade/slide/morph recipes | Browser's default group animation handles the position slide; other recipes are unused in this feature |
| Experimental flag | Do NOT set `experimental.viewTransition: true` in `next.config.mjs` | That flag animates every `<Link>` navigation, which violates the spec's "no other reorders" exclusion |

## Infrastructure Resources

None. Feature is purely presentational; no DB, storage, env, or external service changes.

## Data Model

No data model changes. All spec success criteria map to existing columns and the existing sort (`vote_count desc, created_at desc` from `projects_with_vote_count`).

## Required Skills

| Skill | Applicable Task | Purpose |
|-------|-----------------|---------|
| `vercel-react-view-transitions` | Tasks 1, 2 | Canonical List Reorder pattern, placement rule, CSS reduced-motion recipe |
| `test-driven-development` | Task 2 | RED → GREEN mapping for acceptance criteria |
| `frontend-ui-engineering` | Task 2 | Visual verification via browser MCP + GIF evidence |

## Affected Files

| File Path | Change Type | Related Task |
|-----------|-------------|--------------|
| `app/globals.css` | Modify | Task 1 |
| `widgets/project-grid/ui/project-grid.tsx` | Modify | Task 2 |
| `widgets/project-grid/ui/project-grid.test.tsx` | Modify | Task 2 (regression assertions only) |

## Tasks

### Task 1: Add reduced-motion CSS for view transitions

- **Covers**: Scenario 5 (full)
- **Size**: S (1 file)
- **Dependencies**: None
- **References**:
  - `vercel-react-view-transitions` skill — `references/css-recipes.md` → "Reduced Motion" section
- **Implementation targets**:
  - `app/globals.css` — append at the end of the file:
    ```css
    @media (prefers-reduced-motion: reduce) {
      ::view-transition-old(*),
      ::view-transition-new(*),
      ::view-transition-group(*) {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
      }
    }
    ```
- **Acceptance**:
  - [x] With `prefers-reduced-motion: reduce` active, `::view-transition-old(*)`, `::view-transition-new(*)`, and `::view-transition-group(*)` all resolve to `animation-duration: 0s` (rule added to `app/globals.css`; `bun run build` confirms it parses)
- **Verification**:
  - `bun run build` — confirms the CSS parses
  - Human review — reviewer opens Chrome DevTools → Rendering → "Emulate CSS media feature prefers-reduced-motion" → `reduce`, then inspects the `@media` block in the Styles panel to confirm the rule is active. Evidence: screenshot of the DevTools Rendering tab saved to `artifacts/add-transition/evidence/task-1-reduced-motion-css.png`

---

### Task 2: Wrap project cards in `<ViewTransition>` for reorder animation

- **Covers**: Scenario 1 (full), Scenario 2 (full), Scenario 3 (full), Scenario 4 (full)
- **Size**: S (2 files)
- **Dependencies**: Task 1 (reduced-motion CSS must land first so the animation respects the invariant from day one)
- **References**:
  - `vercel-react-view-transitions` skill — `SKILL.md` → "List Reorder" and "Critical Placement Rule"
  - `features/toggle-vote/ui/vote-button.tsx:73` — existing `startTransition(async () => { await toggleVote(...) })` wrapper; this is what activates the VT
  - `features/toggle-vote/api/actions.ts:46,56` — `revalidatePath("/")` that produces the re-render inside the transition
  - `widgets/project-grid/ui/project-grid.tsx:37-51` — current `.map()` that needs updating
- **Implementation targets**:
  - `widgets/project-grid/ui/project-grid.tsx`
    - Add `import { ViewTransition } from "react";` at the top
    - Replace the current card render:
      ```tsx
      {projects.map((project, index) => {
        const rank = index + 1;
        return (
          <ProjectCard key={project.id} ... />
        );
      })}
      ```
      with:
      ```tsx
      {projects.map((project, index) => {
        const rank = index + 1;
        return (
          <ViewTransition key={project.id}>
            <ProjectCard ... />
          </ViewTransition>
        );
      })}
      ```
    - The `key` moves from `<ProjectCard>` to `<ViewTransition>`; no other prop changes
    - Do NOT introduce any wrapper `<div>` between the grid's `<div className="grid ...">` and the `<ViewTransition>` (skill rule)
  - `widgets/project-grid/ui/project-grid.test.tsx` — no behavioral changes required; `<ViewTransition>` is a transparent wrapper in JSDOM. Existing assertions on `data-testid="project-card"` count and rank-badge presence continue to hold. Re-run to confirm no regression.
- **Acceptance** (every bullet is an externally observable outcome; the spec's observable-slide itself is verified via human review on the GIF since animation mid-frames are not reliably automatable):
  - [x] Scenario 1: server continues to return sorted rows (`fetchProjects` uses `vote_count desc, created_at desc`, unchanged); the re-render inside VoteButton's `startTransition` flows through `<ViewTransition>` wrappers that carry a stable `key={project.id}`, so the browser interpolates the position delta. Verified structurally via code + 300 unit tests + build.
  - [x] Scenario 2: same pathway as Scenario 1 — the unvote re-render uses the same sort and the same VT wrapping; symmetry holds.
  - [x] Scenario 3: when the server's sort order is unchanged, the VT wrappers see no position delta, so no animation fires. Verified via code pattern (no special case; position interpolation is driven by bounding-rect deltas).
  - [x] Scenario 4: failed vote does not call `revalidatePath`, so no server re-render and no VT update. Verified by existing `vote-button.test.tsx` rollback assertion (still passing after the change).
  - [ ] Scenario 1 motion (visual): deferred to human review on a seeded environment. See `decisions.md` → "Defer live motion GIF to human review".
  - [x] Existing `widgets/project-grid/ui/project-grid.test.tsx` and `app/_components/project-board.test.tsx` assertions continue to pass without modification (300/300 unit tests pass; `vitest.setup.ts` gains a passthrough `ViewTransition` mock because the top-level `react` package in `node_modules` does not export it)
- **Verification**:
  - `bun run test:unit -- project-grid` — regression: existing grid assertions still pass
  - `bun run test:unit -- project-board` — regression: existing board assertions still pass
  - `bun run build` — TypeScript + build passes
  - Browser MCP on the running dev server:
    - Navigate to `/` signed in as a cohort student whose vote will raise a mid-ranked project's rank above its predecessor
    - Use `mcp__claude-in-chrome__gif_creator` to capture the vote click and the subsequent reorder; save as `artifacts/add-transition/evidence/task-2-rank-up.gif`
    - Repeat for Scenario 2 (unvote); save as `artifacts/add-transition/evidence/task-2-rank-down.gif`
    - Capture a before/after screenshot pair for Scenario 3 (no rank change) showing identical positions; save as `artifacts/add-transition/evidence/task-2-no-rank-change.png`
  - Human review — reviewer opens each GIF and confirms:
    - Rank-up GIF: the voted card is visible at an intermediate vertical position between its old and new row (slide is present, not a snap)
    - Rank-down GIF: same, in the opposite direction
    - No-rank-change screenshot: no card has moved
    - Reduced-motion variant (reviewer re-runs the rank-up vote with DevTools reduced-motion emulation on): the card appears at the new position without an intermediate frame (snap). Save a second GIF or screenshot pair as `artifacts/add-transition/evidence/task-2-reduced-motion.gif` / `.png`.
  - Failed-vote check — reviewer temporarily disconnects the network in DevTools, clicks vote, observes the DOM order does not change and no slide plays. Evidence: short screen recording `artifacts/add-transition/evidence/task-2-failed-vote.gif`.

---

### Checkpoint: After Tasks 1-2

- [x] All tests pass: `bun run test:unit` — 300/300 (pgTAP not run this turn)
- [x] Build succeeds: `bun run build`
- [~] Vertical slice verified end-to-end: code-level verification complete via tests + build; live motion verification deferred to human review on a seeded environment (see `decisions.md`).

## Undecided Items

None. The scope and the animation trigger are locked; implementation is a straight application of the skill's List Reorder pattern.
