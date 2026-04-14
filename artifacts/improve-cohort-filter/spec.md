## Overview

The cohort filter on the landing page feels sluggish — clicking a cohort freezes the page for several hundred milliseconds with no visual feedback until the new grid renders. This feature makes the filter feel instant by showing immediate loading feedback and cutting the underlying query cost, without changing the filter's URL-driven behavior or the existing security model around author profile visibility.

## Scope

### Included

- Immediate visual feedback on the filter dropdown and the project grid when a cohort is selected
- Perceived-latency improvement: skeleton/placeholder UI appears within one frame of the click
- Underlying query cost reduction so the grid finishes loading faster on large datasets
- Viewer-vote lookup performance improvement for logged-in users
- Cohorts list fetched once per request (no duplicate queries within the same render)

### Excluded

- **New filter types** (tags, status, sort order) — out of scope; this feature is performance-only
- **Dropdown visual redesign** — current UI keeps its shape and labels
- **Changes to the security model of `projects_with_vote_count`** (the definer-mode view stays as-is) — the view's author-PII protection is Supabase's recommended pattern and independent of the perf problem
- **Column-Level Security on profiles** — rejected after review; Supabase docs explicitly discourage it and it breaks `select *` usage site-wide
- **Client-side caching libraries (React Query / SWR)** — rejected to avoid adding a new dependency and a second state layer; the perceived-speed win from Suspense alone is sufficient
- **Anonymous user vote state** — anonymous visitors still see vote counts but no per-card vote indicator (unchanged from today)

## Scenarios

### 1. Switching cohorts shows loading feedback immediately

- **Given** — The landing page is showing projects for "All cohorts"
- **When** — The user opens the cohort dropdown and selects a specific cohort
- **Then** — Within one animation frame, the project grid is replaced with a skeleton placeholder and the dropdown shows a pending state; the skeleton persists until the new grid is ready

Success Criteria:
- [ ] Click → skeleton visible in the project grid area in under 100ms (no "frozen page" gap)
- [ ] Click → the dropdown trigger shows a pending indicator (spinner or disabled look) until the new data arrives
- [ ] The page header, filter dropdown, and surrounding layout do not unmount or shift during the transition

### 2. The new cohort's projects arrive quickly

- **Given** — A cohort is selected that contains ~50 projects with thousands of total votes across all cohorts
- **When** — The grid finishes loading
- **Then** — Projects appear sorted by vote count (descending, ties broken by newest first), each card showing title, tagline, author name, author avatar, and vote count

Success Criteria:
- [ ] From click to first project card visible: p50 under 500ms on a warm connection; p95 under 1s
- [ ] Vote-count ordering matches the previous implementation exactly (no regression)
- [ ] Author display name and avatar render for every project card (anonymous and authenticated visitors alike)

### 3. A logged-in viewer sees their vote state without extra delay

- **Given** — A logged-in user who has voted on 3 projects in the selected cohort
- **When** — The cohort is selected and the grid loads
- **Then** — The 3 voted projects show the "voted" visual state on their cards

Success Criteria:
- [ ] For a user with votes on projects A, B, C in the filtered cohort, exactly those 3 cards show the "voted" indicator
- [ ] Adding the vote-state lookup does not increase the grid's p50 load time compared to the anonymous path

### 4. Selecting "All cohorts" does not regress

- **Given** — A specific cohort is currently selected
- **When** — The user opens the dropdown and selects "All cohorts"
- **Then** — The grid returns to showing every project, sorted by vote count, with the same loading feedback as any other cohort switch

Success Criteria:
- [ ] Project count in "All cohorts" view matches the sum of per-cohort counts
- [ ] p50 load time for "All cohorts" is within 20% of a single-cohort view (no disproportionate slowdown on the unfiltered path)

### 5. The filter URL remains shareable and deep-linkable

- **Given** — A user has the landing page open with a specific cohort filter applied
- **When** — The user copies the URL and opens it in a new tab
- **Then** — The new tab loads directly into the filtered grid, matching the same projects and ordering

Success Criteria:
- [ ] Loading a deep-linked cohort URL renders the filtered grid without an intermediate "All cohorts" flash
- [ ] Removing the cohort query parameter from the URL returns to the "All cohorts" view

## Invariants

- **Security / privacy**: The author PII boundary is never weakened. Anonymous visitors continue to see only display-safe author fields (name, avatar) and never the author's email or any other sensitive profile column, on any access path.
- **Performance**: Clicking a cohort never leaves the user with a frozen UI — some loading indication is always visible within 100ms until data arrives.
- **Data consistency**: Vote counts and vote-count ordering displayed in the grid always match the authoritative vote state at request time (no stale counts from a cached layer that has not been invalidated).

## Dependencies

- Existing `projects` / `votes` / `cohorts` / `profiles` tables and the `projects_with_vote_count` view
- Existing cohort filter dropdown component and its URL-parameter contract
- Authenticated-user session retrieval on the landing page (unchanged)

## Undecided Items

- None — the user confirmed the direction (perceived-speed + query-cost reduction, security model untouched, no new client-side caching library).
