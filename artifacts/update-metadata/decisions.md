# update-metadata — Execution Decisions

## Reviewer selection: react-reviewer only

**When**: Step 2, Reviewer selection
**Decision**: Run only `react-reviewer` at Step 5. Skip `wireframe-reviewer`, `ui-quality-reviewer`, and `design-reviewer`.
**Why**: This feature touches only the `metadata` object export in `app/layout.tsx`. There are no UI components, no JSX changes, no wireframe, and no design-token surfaces. `react-reviewer` still applies because the file is a Next.js Server Component and the Metadata API is a Next.js convention worth sanity-checking. The other three reviewers have no UI or wireframe to review — running them would produce noise.
**Harness Signal**: execute-plan's Reviewer selection step could explicitly call out the "no-UI / config-only change" class, where only `react-reviewer` applies. Currently the rules read as a menu, not as a flowchart; a config-only example would save repeated judgment.
**Result**: Success — `react-reviewer` passed all five checks on first run; no UI reviewers needed to be invoked.

## Task execution order: plan order 1 → 2 → 3 → 4

**When**: Step 3, Task ordering
**Decision**: Execute in the order written in plan.md: Task 1 (metadataBase) → Task 2 (robots) → Task 3 (canonical) → Task 4 (keywords).
**Why**: Task 3 is the only task with a stated dependency (on Task 1 for metadataBase). All other tasks are independent. Plan order already places Task 3 after Task 1, so no reordering is required. Running Task 2 between them is safe (unrelated field). Running Task 4 last keeps the narrative "additions" grouped in the same file's metadata object without churning the diff.
**Harness Signal**: N/A — plan order already respected the dependency.
**Result**: Success — all four tasks landed one-commit-each in plan order; each task's unit test went RED then GREEN.

## Test typing fix for `metadataBase` union type

**When**: Step 4, Task 1 pre-commit typecheck failure
**Decision**: Narrow `metadata.metadataBase` (typed as `string | URL | null | undefined` in Next.js) via a local variable + `as URL` after the `toBeInstanceOf(URL)` assertion, instead of switching to string-form assertions.
**Why**: The `instanceof URL` check is the semantic guarantee we want (not just a string match). The original test `expect(metadata.metadataBase?.origin).toBe(...)` failed tsc because `.origin` is only on `URL`, not on the `string` branch. A runtime `instanceof` check doesn't narrow TypeScript; an explicit `as URL` after the assertion preserves both runtime safety and type-level passthrough.
**Harness Signal**: Next.js Metadata API fields that accept union types (here `string | URL`) regularly trip the pre-commit typecheck in vitest assertions. A one-liner pattern — "extract to local, assert shape, then cast for property access" — could be mentioned in `next-best-practices/metadata.md` or `test-driven-development`.
**Result**: Success — second commit attempt passed both ultracite and typecheck hooks; no further adjustments needed.

## Canonical inheritance side-effect: child pages canonical to `/`

**When**: Step 4, checkpoint manual verification
**Decision**: Accept that `/login`, `/onboarding`, `/settings`, and `/auth/auth-code-error` all render `<link rel="canonical" href="https://www.claude-hunt.com">` (pointing to site root) as an inherited side-effect of `alternates: { canonical: "/" }` at the root layout, rather than overriding per-page.
**Why**: The spec's Scenario 3 only constrains the home route (`/` and `/?cohort=...`). No Success Criteria mentions per-page canonicals. Adding page-level canonical overrides would require touching every page file, which is explicitly out of scope per the spec's Excluded section ("Per-page title/description overrides … this spec is site-wide only"). The inherited behavior is suboptimal for SEO — ideally `/login` would canonical to `/login` — but that's a follow-up, not a regression of this spec.
**Harness Signal**: spec.md had no Invariant or Scenario covering "per-route canonical must point to that route." When a site-wide default (`alternates.canonical: "/"`) is chosen, every child page inherits it verbatim. Future specs touching canonical URLs should either (a) explicitly state the scope (root-only vs per-route) or (b) require page-level overrides. Consider adding a sentence to `next-best-practices/metadata.md` that root-layout `alternates.canonical` propagates to child routes unless overridden.
**Result**: Partial — home canonical works as specified; child routes canonical to `/` as a side-effect. Follow-up ticket worth creating for per-page canonicals.
