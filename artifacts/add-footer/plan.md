# Add Footer Implementation Plan

## Context

The home page has a header but no footer. We're adding a static footer scoped to `/` only — copyright on the left, GitHub / Feedback / Creator links on the right. Spec is at `artifacts/add-footer/spec.md`; wireframe at `artifacts/add-footer/wireframe.html`.

The footer is a server component (no interactivity beyond external `<a>` links) and follows the same FSD pattern as `widgets/header`.

## Architecture Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| FSD slice | `widgets/footer/` | Mirrors `widgets/header/`; composes `shared/ui` primitives, no domain logic |
| Component type | Server component | Static markup only; no state, no event handlers |
| Mount point | `app/page.tsx` (home only) | No layout group exists; mounting in root layout would leak footer onto `/login`, `/onboarding`, `/settings` (excluded by spec) |
| GitHub icon source | Reuse existing `shared/ui/icons/github.tsx` (`GitHubIcon`) | Already in repo; `lucide-react` no longer ships brand icons |
| Other icons | `lucide-react` (`MessageSquare`, `ExternalLink`) | Project's existing import pattern |
| Year source | Hard-coded `2026` literal | Simpler than computing at render time; per-user preference (will be updated by hand when needed) |
| Top divider | `<Separator />` from `@shared/ui/separator` | Shadcn rule — use Separator, not raw `border-t` |

## Infrastructure Resources

None.

## Data Model

None — static content only.

## Required Skills

| Skill | Applicable Task | Purpose |
|-------|-----------------|---------|
| `test-driven-development` | Tasks 1, 2 | RED → GREEN per Success Criterion; one acceptance bullet ↔ one test assertion |
| `shadcn` | Task 1 | Icon rules (`data-icon`, no manual sizing inside Buttons), no raw color classes, use `Separator` for borders |
| `nextjs` | Task 2 | Server-component composition, page.tsx integration |

## Affected Files

| File Path | Change Type | Related Task |
|-----------|-------------|--------------|
| `widgets/footer/ui/footer.tsx` | New | 1 |
| `widgets/footer/ui/footer.test.tsx` | New | 1 |
| `widgets/footer/index.ts` | New | 1 |
| `app/page.tsx` | Modify | 2 |
| `app/__tests__/page.test.tsx` | New | 2 |

## Tasks

### Task 1: Build the Footer widget

- **Covers**: Scenarios 2, 3, 4 (full); Scenario 1 (partial — rendering content only; presence on `/` and absence on other routes is verified in Task 2). Invariant (full).
- **Size**: S (3 files)
- **Dependencies**: None
- **References**:
  - Skill: `shadcn` — keywords: icon `data-icon`, `Separator`, no raw color classes
  - Skill: `test-driven-development` — keywords: criterion ↔ test assertion
  - Existing icon: `shared/ui/icons/github.tsx` (`GitHubIcon`)
  - Pattern reference: `widgets/header/ui/header.tsx`, `widgets/header/ui/header.test.tsx`, `widgets/header/index.ts`
- **Implementation targets**:
  - `widgets/footer/ui/footer.test.tsx` (write first — RED)
  - `widgets/footer/ui/footer.tsx` — server component returning a `<footer>` landmark with `<Separator />` on top, then a flex row that stacks vertically on mobile and switches to row layout on `sm:` breakpoint (copyright on the left, three links on the right). Reuses `GitHubIcon` from `@shared/ui/icons/github`; uses `lucide-react` `MessageSquare` and `ExternalLink`.
  - `widgets/footer/index.ts` — `export { Footer } from "./ui/footer"`
- **Acceptance**:
  - [ ] Renders a `<footer>` landmark containing the literal text `© 2026 claude-hunt`
  - [ ] Renders a "GitHub" link → `href="https://github.com/toy-crane/claude-hunt"`, with the existing `GitHubIcon` rendered alongside the label
  - [ ] Renders a "Feedback" link → `href="https://github.com/toy-crane/claude-hunt/issues/new"`
  - [ ] Renders a creator link with text "by toycrane" → `href="https://toycrane.xyz"`
  - [ ] Every external link has `target="_blank"` and `rel="noopener noreferrer"` (covers cross-origin-safety invariant; clicking such a link opens a new tab and leaves the originating tab untouched, satisfying Scenario 2's "original tab remains on `/`" criterion as well as Scenarios 3 and 4's "opens in a new tab" criteria)
  - [ ] Footer top edge is rendered with the shadcn `Separator` (not a raw `border-t` class)
- **Verification**:
  - `bun run test:unit -- widgets/footer`

---

### Task 2: Mount Footer on the home page

- **Covers**: Scenario 1 (full — completes the "rendered on `/`", "rendered identically for signed-in and signed-out visitors", "not rendered on other routes", and "scrolls with content" criteria left from Task 1)
- **Size**: S (1 file modified, 1 new test)
- **Dependencies**: Task 1 (component must exist before mounting)
- **References**:
  - Pattern reference: `app/page.tsx` line 24 (`<Header />` import + render position)
  - Test placement: App Router pages use `app/**/__tests__/` per CLAUDE.md → Testing
- **Implementation targets**:
  - `app/__tests__/page.test.tsx` (write first — RED) — render `Page()` (mock `fetchViewer`, `fetchCohorts`, `fetchProjects` like `widgets/header/ui/header.test.tsx` does for `fetchViewer`); assert the footer landmark is present in the page output for both `viewer = null` and `viewer = { ... }` cases
  - `app/page.tsx` — import `Footer` from `@widgets/footer`; render `<Footer />` after the closing `</main>` tag, inside the existing fragment
- **Acceptance**:
  - [ ] Page render with `viewer = null` includes a `<footer>` landmark (signed-out)
  - [ ] Page render with a signed-in viewer includes a `<footer>` landmark (signed-in identical)
  - [ ] `app/login/page.tsx`, `app/onboarding/page.tsx`, `app/settings/page.tsx` do NOT import `@widgets/footer` (verifiable by `grep -r "@widgets/footer" app/`)
  - [ ] Manual: `bun run dev` → footer appears at the bottom of `/` and scrolls with the page (does not pin to viewport bottom); footer is absent on `/login`, `/onboarding`, `/settings`
- **Verification**:
  - `bun run test:unit -- app/__tests__/page`
  - `bun run build`
  - Manual browser check on `/`, `/login`, `/onboarding`, `/settings`

---

### ✅ Final Checkpoint — after Tasks 1–2

- [ ] All tests pass: `bun run test`
- [ ] Build succeeds: `bun run build`
- [ ] On `/`, the footer appears at the bottom with `© 2026 claude-hunt` + GitHub / Feedback / Creator links — each opens its target URL in a new tab
- [ ] On `/login`, `/onboarding`, `/settings`, the footer is absent

## Undecided Items

None.
