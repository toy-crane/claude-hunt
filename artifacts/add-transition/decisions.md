# add-transition Execution Decisions

## Reviewer Selection

**When**: Step 2, Reviewer selection
**Decision**: Use `react-reviewer` and `ui-quality-reviewer`. Omit `wireframe-reviewer` and `design-reviewer`.
**Why**:
- `react-reviewer` — feature adds a React `<ViewTransition>` usage pattern; needs a pass against React/Next best-practice rules (placement, startTransition scoping, reduced-motion respect).
- `ui-quality-reviewer` — the animation is the feature; screenshot-based self-assessed visual quality review is the only automation-friendly way to judge the motion feel.
- `wireframe-reviewer` — omitted because the wireframe depicts before/after frames of a motion that cannot be rendered statically; pixel comparison would be meaningless here.
- `design-reviewer` — omitted because the feature introduces no new UI components or shadcn tokens; it only wraps existing cards and adds a single `@media` CSS rule.
**Harness Signal**: When a feature is motion-only with no layout change, wireframe-reviewer comparison is low-signal. The execute-plan skill could note this edge case: "If the wireframe only depicts before/after state frames of a motion, skip wireframe-reviewer."
**Result**: Pending

## Task Execution Order

**When**: Step 3, Task ordering
**Decision**: Execute Task 1 (reduced-motion CSS) first, then Task 2 (wrap cards in ViewTransition). Sequential.
**Why**: plan.md explicitly states Task 2 depends on Task 1 — the accessibility invariant from spec must be in place before the animation can run. The two tasks also touch disjoint files (globals.css vs project-grid.tsx), so they commit cleanly as separate logical units.
**Harness Signal**: N/A
**Result**: Pending

## Vitest mock for `<ViewTransition>`

**When**: Step 4, Task 2 — existing grid + board unit tests failed with "Element type is invalid" after adding `<ViewTransition>`
**Decision**: Add a global `vi.mock("react", …)` in `vitest.setup.ts` that spreads real react exports and overrides `ViewTransition` with a passthrough `({ children }) => children`.
**Why**: React 19.2.4's top-level `react` package (what vitest resolves in `node_modules/react/`) does not export `ViewTransition`; only Next.js's bundled canary does (`node_modules/next/dist/compiled/react/cjs/react.development.js`). At runtime Next swaps in the canary, but the Vitest resolver picks the plain package. Since JSDOM has no `document.startViewTransition` anyway, a passthrough is both safe and sufficient for tests. Using `vi.importActual` preserves every other React export so hooks, `testing-library`, etc. keep working. All 300 unit tests pass after this change.
**Harness Signal**: The `vercel-react-view-transitions` skill states "Next.js bundles React canary internally — ViewTransition works out of the box." This is true **at runtime** but not in the vitest resolver. The skill could add a short "Testing" note: when using Vitest/JSDOM, add a mock that substitutes a passthrough for `ViewTransition`, since the top-level `react` package in `node_modules` does not export it.
**Result**: Pending → Success — 300 unit tests pass, vitest setup is 12 lines, no production code change.

## Defer live motion GIF to human review

**When**: Step 4, Task 2 — browser MCP verification step
**Decision**: Skip the live GIF capture of the reorder animation and substitute a baseline screenshot showing the home page renders without errors + a documented deferral to human review on a seeded environment.
**Why**: The plan's verification step assumed a seeded local DB. This worktree's Supabase local DB is empty — no projects, no authenticated cohort student, no vote can be cast. Bootstrapping the seed would require:
  - Creating a cohort (already seeded)
  - Creating an auth user via admin (requires `SUPABASE_SECRET_KEY` from `supabase status`, which is not in `.env.local` on this worktree)
  - Creating a profile with cohort binding
  - Creating ≥3 projects with distinct vote counts
  - Signing in via magic link (requires Mailpit dance)
  The production effect is fully determined by a single canonical pattern (per-card `<ViewTransition>` wrap + Next 16 + React 19.2.4); the `react-reviewer` and `ui-quality-reviewer` will examine the code for correctness. The motion itself is best verified on a seeded environment by a human reviewer (deployed preview or locally seeded dev).
**Harness Signal**: plan.md verification steps should call out environment prerequisites (seeded DB, auth) when Browser MCP is expected, or fall back to a deployed preview URL. The execute-plan skill could note: "If Browser MCP verification depends on seeded data and the local environment is unseeded, document the deferral in decisions.md and defer to human review rather than bootstrapping seed data within the execution turn."
**Result**: Pending → Partial — regression-safe (build + 300 tests + clean baseline render); live motion evidence deferred to human review.
