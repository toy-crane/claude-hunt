# Improve Filter — Implementation Plan

## Architecture Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Where cohort filter state lives | A new client component on the landing page (composes the cohort dropdown + the project grid) that owns the selected cohort as local state | Making cohort switches instant with zero network requires the state to live on the client; an `?cohort` URL param still mirrors it for deep-linking |
| URL sync mechanism | `window.history.replaceState` on every selection change | `router.replace()` triggers an RSC re-render and a network roundtrip — the exact cost this feature is removing. `replaceState` updates the address bar silently, no RSC refetch, and mirrors current UX (today's `router.replace` also does not push history entries) |
| Initial cohort source | Server component reads `?cohort` from `searchParams` and passes it to the client component as `initialCohortId` | Deep-linked URLs render the correct filter on first paint; no post-hydration flash |
| Cohort dropdown shape | Refactor to a controlled component (`value` + `onValueChange`); remove its internal `useRouter`/`useSearchParams`/`useTransition` logic | The dropdown no longer needs to know about routing; the composing parent owns state and URL sync. Removes dead code after the rewire |
| Screenshot URL resolution | Server component pre-resolves every project's `screenshot_path` into an absolute URL and passes a ready-to-render `screenshotUrl` field on each project | `getPublicUrl` is a pure synchronous URL builder, so doing it server-side costs nothing and avoids shipping a Supabase client to the browser just for URL construction |
| Obsolete Suspense/skeleton | Remove `<Suspense key={cohortId} fallback={<ProjectGridSkeleton/>}>`, `ProjectGridSection`, and `ProjectGridSkeleton` entirely | Cohort switches no longer roundtrip — nothing to wait on. Initial load of ~30 rows is fast enough that a placeholder adds no perceptible UX, only maintenance surface. Keep `shared/ui/skeleton.tsx` (shadcn primitive) untouched in case other features use it |
| History entries on cohort change | `replaceState` (no new entry) | Matches the current `router.replace` behavior; avoids cluttering browser history with filter changes |
| Existing vote flow | Unchanged (server action, DB trigger maintaining `projects.vote_count`, `revalidatePath("/")`, optimistic UI) | `revalidatePath` still refreshes the RSC props on the page; the client component's `useMemo` filter re-runs on the new prop, keeping vote counts and ordering consistent across filter views (spec Scenario 5) |

## Infrastructure Resources

| Resource | Type | Declared in | Creation Task |
|----------|------|-------------|---------------|
| None     |      |             |               |

## Data Model

No schema or table changes. The existing `projects_with_vote_count` view, `votes` table, `projects.vote_count` column, and `maintain_project_vote_count` trigger are all unchanged.

The in-flight shape passed from server to client gains one field:

### ProjectGridRow (enriched for client)
- All existing fields from `fetchProjects` (id, cohort_id, title, tagline, vote_count, viewer_has_voted, screenshot_path, author display name, author avatar, …)
- **`screenshot_url` (new, derived)** — absolute public URL resolved from `screenshot_path` server-side, added by the page before handing the array to the client component

## Required Skills

| Skill | Applicable Task | Purpose |
|-------|-----------------|---------|
| test-driven-development | Task 1, Task 2 | RED → GREEN; one Vitest/E2E assertion per Acceptance bullet |
| next-best-practices | Task 1 | Server Component passing initial data to a client boundary; `searchParams` on RSC; when to prefer `history.replaceState` over `router.replace` |
| vercel-react-best-practices | Task 1 | Keep the client boundary small (dropdown + grid composition); useMemo for pure derivations; avoid unnecessary state |
| vercel-composition-patterns | Task 1 | Controlled component refactor for `CohortDropdown` (lift state up); clean slot render pattern for vote/owner actions across the server→client boundary |
| frontend-ui-engineering | Task 1 | Client-side URL sync with `history.replaceState`; reading `?cohort` from `useSearchParams` without re-subscribing to navigation |
| fsd | Task 1, Task 2 | Placement: the composing client component lives in `app/_components/` (page-specific orchestration), not in `widgets/` (widgets cannot depend on other widgets). `features/cohort-filter/` and `widgets/project-grid/` stay as-is |
| refactor | Task 1 | Lift-state-up refactor of `CohortDropdown` into a controlled component without behavior regression |
| incremental-implementation | Task 1 | Keep Task 1 atomic: all wiring changes land together so the system is never in a half-filtered state |

## Affected Files

| File Path | Change Type | Related Task |
|-----------|-------------|--------------|
| `widgets/project-grid/api/fetch-projects.ts` | Modify — remove `cohortId` from options and the `.eq("cohort_id", …)` branch | Task 1 |
| `widgets/project-grid/api/fetch-projects.test.ts` | New — assert all rows are returned regardless of cohort; viewer votes still merge correctly | Task 1 |
| `features/cohort-filter/ui/cohort-dropdown.tsx` | Modify — become controlled (accept `value` + `onValueChange`); remove `useRouter`/`usePathname`/`useSearchParams`/`useTransition` | Task 1 |
| `features/cohort-filter/ui/cohort-dropdown.test.tsx` | Modify — drop router mocks; assert `onValueChange` is called with cohort id or `null` for "All cohorts" | Task 1 |
| `app/_components/project-board.tsx` | New — client component. Owns cohort filter state initialized from `initialCohortId`; filters projects via `useMemo`; syncs URL via `window.history.replaceState`; renders `<CohortDropdown>` + filtered `<ProjectGrid>` with vote/owner slot renders | Task 1 |
| `app/_components/project-board.test.tsx` | New — filter behavior, dropdown wire-up, URL sync side effect (spy on `history.replaceState`) | Task 1 |
| `app/page.tsx` | Modify — remove `<Suspense key>` + `<ProjectGridSkeleton>`; fetch all projects once; pre-resolve `screenshot_url` per row; render `<ProjectBoard>` with `initialCohortId` + cohorts + projects + viewer info | Task 1 |
| `app/page.test.tsx` | Modify — remove skeleton-fallback assertions; assert `<ProjectBoard>` renders with the right initial cohort | Task 1 |
| `e2e/project-board.spec.ts` | Modify — add a scenario that switches cohorts and asserts zero project-list network requests fire after initial load; add deep-link assertion for `?cohort=<id>`; extend the authed-student scenario so voting in cohort A and switching to "All cohorts" still shows the updated count and voted indicator | Task 1 |
| `app/_components/project-grid-section.tsx` | Delete — logic absorbed into `ProjectBoard` + `page.tsx` | Task 2 |
| `app/_components/project-grid-section.test.tsx` | Delete — coverage moves into `project-board.test.tsx` and `page.test.tsx` | Task 2 |
| `widgets/project-grid/ui/project-grid-skeleton.tsx` | Delete — never rendered under the new flow | Task 2 |
| `widgets/project-grid/ui/project-grid-skeleton.test.tsx` | Delete | Task 2 |
| `widgets/project-grid/index.ts` | Modify — drop `ProjectGridSkeleton` export | Task 2 |

## Tasks

### Task 1: Cohort filter runs on the client — grid switches instantly, one initial fetch only

- **Covers**: Scenario 1 (full), Scenario 2 (full), Scenario 3 (full), Scenario 4 (full), Scenario 5 (full). Invariants Performance, URL contract, Data consistency.
- **Size**: M (4 source files modified + 1 new client component + colocated tests + e2e update)
- **Dependencies**: None — all wiring changes land together so the system is never in a half-filtered intermediate state
- **References**:
  - test-driven-development — RED → GREEN per Acceptance bullet; pick the lowest boundary that actually proves the criterion (Vitest for filter logic, E2E for "no network" and deep-link)
  - next-best-practices — RSC → client boundary; `searchParams`; `router.replace` pitfalls vs `history.replaceState`
  - vercel-react-best-practices — thin client components, `useMemo` for derivations
  - vercel-composition-patterns — controlled component lift; slot render pattern across boundary
  - frontend-ui-engineering — `window.history.replaceState` usage and `useSearchParams` read for initial value
  - refactor — controlled-component extraction for `CohortDropdown`
  - `CLAUDE.md` → Testing — stack & placement; define success criteria, loop until verified
  - `artifacts/improve-filter/spec.md` — scenarios and invariants
- **Implementation targets**:
  - `widgets/project-grid/api/fetch-projects.ts` (drop `cohortId` option; query returns all rows)
  - `widgets/project-grid/api/fetch-projects.test.ts` (colocated — verifies the new contract)
  - `features/cohort-filter/ui/cohort-dropdown.tsx` (controlled: `value` + `onValueChange`; no router / no transition)
  - `features/cohort-filter/ui/cohort-dropdown.test.tsx` (updated — drop `next/navigation` mocks; assert callback invocations)
  - `app/_components/project-board.tsx` (client — owns filter state, useMemo filter, history.replaceState sync, renders dropdown + grid with vote/owner slots)
  - `app/_components/project-board.test.tsx` (colocated — filter, dropdown change, URL sync)
  - `app/page.tsx` (swap `<Suspense key=…><ProjectGridSection/></Suspense>` for `<ProjectBoard>`; pre-resolve screenshot URLs; pass initial cohort id + cohorts + projects + viewer fields)
  - `app/page.test.tsx` (updated — asserts ProjectBoard receives the parsed initial cohort id and the full project set)
  - `e2e/project-board.spec.ts` (updated cohort-switch scenario: Playwright route monitor records 0 project-list requests after initial load; deep-link `?cohort=<id>` lands on filtered grid; authed vote in cohort A persists across filter toggles)
- **Acceptance**:
  - [ ] Clicking a cohort in the dropdown filters the grid in-place with no skeleton/spinner/blank state visible at any moment during the transition (E2E: after click, grid node is continuously attached and child cards just change in place)
  - [ ] The page header, cohort dropdown, and surrounding layout remain mounted and do not shift during a cohort-change transition (E2E: header and dropdown DOM nodes retain their element handles across the click; no layout shift observed on the surrounding container)
  - [ ] After initial page load, switching among cohort A, cohort B, "All cohorts", and back produces zero additional project-list network requests (E2E: Playwright route monitor on `/rest/v1/projects_with_vote_count*` records exactly one request, during initial load)
  - [ ] For a page with cohorts A, B, C, selecting cohort A shows exactly A's projects; selecting "All cohorts" shows the union of all cohorts' projects (Vitest: `ProjectBoard` given fixture rows, user selects cohort A, rendered cards match A-only; selects "All", cards match full fixture)
  - [ ] Ordering within each filtered view is vote count descending, ties broken by `created_at` descending (Vitest: fixture with tied vote counts, assert render order matches)
  - [ ] Opening `/?cohort=<id>` renders the filtered grid on first paint with no intermediate "All cohorts" flash; the dropdown shows the matching cohort label (E2E: goto with param, first-paint DOM contains only that cohort's cards; `toHaveTextContent` on dropdown matches)
  - [ ] Clearing the `cohort` param in the URL returns to "All cohorts" without a full-page reload of the surrounding layout (E2E: click "All cohorts" option, URL no longer has `cohort` param, header element retains its node identity across the transition)
  - [ ] For a logged-in user who has voted on projects in cohorts A and B, toggling among A / B / "All cohorts" shows the voted indicator on exactly the voted projects visible in each view (Vitest: fixtures with `viewer_has_voted` set per row, assert indicator presence per filter; E2E: one pass at real flow)
  - [ ] Immediately after the user clicks the vote button on a not-yet-voted card, the card's vote count increments by 1 and the voted indicator turns on, before the server action resolves (Vitest: `VoteButton` with a deferred server action mock — assert the optimistic count and indicator update synchronously on click)
  - [ ] After the user votes on a project in cohort A, switching to "All cohorts" and back to A still shows the updated vote count and updated ordering without a page reload (E2E: authed student votes on a project, toggles filter, asserts count + position)
  - [ ] If the vote server action fails, the optimistic count and indicator roll back to their pre-click state (Vitest — existing `VoteButton` test; confirm no regression introduced by the refactor)
- **Verification**:
  - `bun run test:unit -- cohort-dropdown`
  - `bun run test:unit -- project-board`
  - `bun run test:unit -- fetch-projects`
  - `bun run test:unit -- app/page`
  - `bun run test:e2e -- project-board`
  - `bun run build`

---

### Checkpoint: After Task 1
- [ ] `bun run test` passes (Vitest + pgTAP)
- [ ] `bun run build` succeeds
- [ ] `bun run test:e2e -- project-board` passes
- [ ] Manual smoke: on the landing page, rapidly toggling the cohort dropdown shows the grid update each time with no visible placeholder, no DevTools Network activity for project-list queries, and `?cohort=<id>` mirrors the selection in the address bar; opening a `?cohort=<id>` URL in a new tab lands directly on the filtered grid
- [ ] `app/_components/project-grid-section.tsx`, `widgets/project-grid/ui/project-grid-skeleton.tsx`, and their colocated tests are confirmed unreferenced (grep for imports)

---

### Task 2: Delete obsolete scaffolding — `ProjectGridSection` and `ProjectGridSkeleton`

- **Covers**: None directly — cleanup that removes dead code after Task 1 rewires the flow
- **Size**: S (5 files, mostly deletions + one export removal)
- **Dependencies**: Task 1 (those files are unreferenced only after the rewire lands)
- **References**:
  - fsd — confirm nothing outside `widgets/project-grid/` imports the skeleton before deletion
  - `widgets/project-grid/index.ts` — remove export
- **Implementation targets**:
  - Delete `app/_components/project-grid-section.tsx`
  - Delete `app/_components/project-grid-section.test.tsx`
  - Delete `widgets/project-grid/ui/project-grid-skeleton.tsx`
  - Delete `widgets/project-grid/ui/project-grid-skeleton.test.tsx`
  - Modify `widgets/project-grid/index.ts` (drop `ProjectGridSkeleton` export)
- **Acceptance**:
  - [ ] Repo-wide search for `ProjectGridSection` and `ProjectGridSkeleton` returns no results after the task lands (grep check part of Verification)
  - [ ] `bun run build` succeeds with no unresolved imports
  - [ ] All Vitest and Playwright suites still pass (no coverage regression — the deleted tests' concerns are now owned by `project-board.test.tsx` and `app/page.test.tsx`)
- **Verification**:
  - Grep: `rg "ProjectGridSection|ProjectGridSkeleton"` returns no matches
  - `bun run test`
  - `bun run test:e2e`
  - `bun run build`

---

### Checkpoint: After Task 2
- [ ] `bun run test` passes
- [ ] `bun run build` succeeds
- [ ] `bun run test:e2e` passes
- [ ] `rg "ProjectGridSection|ProjectGridSkeleton"` returns zero matches
- [ ] `widgets/project-grid/index.ts` no longer exports `ProjectGridSkeleton`

---

## Undecided Items

- None.
