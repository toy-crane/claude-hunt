## Overview
Running `supabase db reset` populates a fresh local database with three demo user profiles, each owning one project with a visible screenshot image, so the home page shows a browsable, realistic cohort grid without manual data entry.

## Scope

### Included
- Three demo user profiles, each with a unique display name and a known email
- Three project rows — one per user — each with a Lorem-style title, tagline, and URL
- Three screenshot image files auto-uploaded to the `project-screenshots` storage bucket, referenced by each project so cards render a real image on the home page
- The three users are distributed across three different cohorts so cohort-filtered views show data for more than one cohort

### Excluded
- Demo-account sign-in (password or magic link) — reason: out of scope for this feature; login flows for demo accounts can be added later if needed
- Remote / production seeding — reason: `supabase db push` does not propagate storage seeding; this spec targets `supabase db reset` for local development only
- Upvote / vote seeding — reason: vote interactions are orthogonal to the "browsable home page" goal; projects start at 0 votes
- Avatar images on profiles — reason: the task is "project with image", not user avatars; avatars remain unset
- Additional seed content (comments, saved projects, etc.) — reason: those features are not yet in scope for this cohort's showcase

## Scenarios

### 1. Fresh reset populates a browsable home page
- **Given** a local Supabase stack with no demo data
- **When** the developer runs `supabase db reset`
- **Then** opening the home page shows three project cards, each with a rendered screenshot image, a title, a tagline, and the author's display name

Success Criteria:
- [ ] Home page renders exactly three project cards after reset
- [ ] Each card displays a non-broken image served from the `project-screenshots` bucket
- [ ] Each card shows a non-empty title (≤ 80 chars), tagline (≤ 140 chars), and an author display name
- [ ] The three cards reference three distinct authors

### 2. Cohort filtering shows multi-cohort data
- **Given** the seeded database
- **When** the developer views any cohort-filtered view of the home page
- **Then** filtering by any of the three seeded cohorts shows exactly one project; filtering by a non-seeded cohort shows none

Success Criteria:
- [ ] The three seeded projects are distributed across three different cohorts (one project per cohort)
- [ ] A cohort-filtered view for each seeded cohort returns exactly one card
- [ ] A cohort-filtered view for a cohort with no seeded project returns zero cards

### 3. Re-running reset produces the same state
- **Given** a local database already seeded with the three demo users and projects
- **When** the developer runs `supabase db reset` again
- **Then** the reset completes without error and the home page shows the same three project cards with the same content and images

Success Criteria:
- [ ] `supabase db reset` exits successfully on a second run
- [ ] After the second run, the home page still shows exactly three cards — no duplicates, no missing rows
- [ ] The same three screenshot images render on the same three cards
- [ ] The three profile rows keep the same IDs and display names across resets

## Invariants
- **Data integrity**: every seeded project references an existing seeded user and an existing cohort; every referenced screenshot key resolves to a file present in the `project-screenshots` bucket.
- **Local scope**: seed behavior described here applies to `supabase start` / `supabase db reset` only; remote environments are out of scope and must not be mutated by this feature.

## Dependencies
- Existing `profiles`, `projects`, `cohorts`, and `votes` tables
- Existing `project-screenshots` storage bucket declared in `config.toml`
- Existing auth → profile creation trigger (`handle_new_user`) that fires on `auth.users` insert
- Supabase CLI version that supports `objects_path` for bucket seeding

## Undecided Items
- (none)
