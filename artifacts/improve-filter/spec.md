## Overview

The cohort filter on the landing page currently triggers a server roundtrip on every selection, producing visible stutter. This feature makes cohort switching feel instant: the grid updates to the new selection within a single paint frame, with no network request and no loading placeholder.

## Scope

### Included

- Switching cohorts updates the project grid instantly, without any loading indicator and without any network activity
- Initial page load delivers every cohort's projects at once, so all subsequent filter changes are served from already-loaded data
- Deep-linked cohort URLs continue to render the filtered grid on first paint
- Removal of the transient skeleton / Suspense placeholder that previously appeared on each cohort switch — it is no longer necessary

### Excluded

- **Vote flow changes** — the vote button, server action, database trigger that maintains vote counts, and cache revalidation on vote all stay as-is. When a vote happens, the grid's underlying data still refreshes the same way as today
- **Dropdown visual redesign** — the cohort dropdown keeps its current labels, shape, and pending-state affordance
- **Pagination or infinite scroll** — the current dataset (small, bounded cohort showcase) does not warrant paging, and paging would reintroduce the server-roundtrip cost this feature removes
- **New filter types (tags, status, sort order)** — out of scope; this feature is a perceived-performance refactor, not new functionality
- **Caching libraries (React Query, SWR)** — intentionally avoided. The "fetch once, filter in memory" approach does not need a client cache layer
- **Changes to author PII boundaries and the definer-mode view** — the security model is untouched

## Scenarios

### 1. Switching cohorts is instant

- **Given** — The landing page is showing projects for "All cohorts"
- **When** — The user opens the cohort dropdown and selects a specific cohort
- **Then** — The grid immediately displays only that cohort's projects, with no skeleton, no spinner, and no blank state between the click and the new grid

Success Criteria:
- [ ] From click to the updated grid being visually complete: under one paint frame (no perceptible delay, no loading UI visible at any moment during the transition)
- [ ] No network request fires during the cohort change (observable in browser DevTools Network tab: zero new requests attributable to the selection)
- [ ] The page header, dropdown, and surrounding layout remain mounted and do not shift during the transition

### 2. Every cohort is available after a single initial load

- **Given** — A fresh page load on the landing page with cohorts A, B, and C each containing projects
- **When** — The user toggles between A, B, C, "All cohorts", and back to A
- **Then** — Each selection shows the correct subset (or full set) of projects, and no additional data request is issued after the initial page load

Success Criteria:
- [ ] Selecting cohort A shows exactly A's projects; selecting B shows exactly B's; "All cohorts" shows the union of all cohorts' projects
- [ ] Across the full sequence of four filter changes after the initial load, the network tab records zero additional data requests for project listings
- [ ] Ordering within each view is by vote count descending, ties broken by newest first (unchanged from today)

### 3. A deep-linked cohort URL lands on the filtered grid

- **Given** — A user opens a URL with `?cohort=<id>` for an existing cohort
- **When** — The page finishes its initial load
- **Then** — The grid shows only that cohort's projects on first paint; the user never sees the "All cohorts" set first

Success Criteria:
- [ ] Opening `?cohort=<id>` in a new tab renders the filtered grid directly, with no intermediate flash of unfiltered content
- [ ] Removing the `cohort` query parameter from the URL returns to the "All cohorts" view without reloading surrounding layout
- [ ] The selected value in the dropdown matches the URL on first paint (no mismatch between URL and UI)

### 4. A logged-in viewer sees their own vote state correctly on every cohort

- **Given** — A logged-in user who has voted on 3 projects distributed across cohorts A and B
- **When** — The user toggles the filter among A, B, and "All cohorts"
- **Then** — On each view, the voted indicator appears on exactly the projects the user has voted on that are visible in the current filter

Success Criteria:
- [ ] In cohort A, only the projects in A that the user voted on show the voted indicator
- [ ] In cohort B, only the projects in B that the user voted on show the voted indicator
- [ ] In "All cohorts", all 3 voted projects show the voted indicator

### 5. Voting keeps counts and order consistent across all cohort views

- **Given** — A logged-in user viewing cohort A
- **When** — The user votes on a project in cohort A
- **Then** — The card's vote count increments immediately (optimistic), and after the data revalidates, the authoritative vote count and the ordering match reality across every cohort view the user switches to without a page reload

Success Criteria:
- [ ] Immediately after the click, the card's vote count increments by 1 and the voted indicator turns on
- [ ] Without a page reload, switching to "All cohorts" and back to A shows the updated vote count and updated ordering for that project
- [ ] If the server action fails, the optimistic change rolls back to the pre-click state

## Invariants

- **Performance**: Changing the cohort selection never issues a network request for project data, and never shows a loading placeholder; the transition completes within one paint frame
- **Data consistency**: Vote counts, ordering (vote count desc, created_at desc), and per-viewer vote indicators always match the authoritative state from the most recent server render
- **URL contract**: `?cohort=<id>` remains the source of truth for the current filter — shareable, deep-linkable, and reflected in the dropdown on every path (initial load, back/forward navigation, direct URL edit)

## Dependencies

- Existing cohort dropdown component and its `?cohort=<id>` URL contract
- Existing data source for projects (including denormalized vote counts and viewer vote state)
- Existing vote server action and its cache revalidation behavior on the landing page

## Undecided Items

- None.
