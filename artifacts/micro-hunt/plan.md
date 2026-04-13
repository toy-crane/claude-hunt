# Micro Hunt Implementation Plan

## Architecture Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Form UX | Dialog overlay on landing page | User stays on grid; aligns with "under 30 seconds" submission goal |
| Data querying | Standard Supabase client + JS aggregation | Simple, sufficient for <100 projects, no custom view/RPC needed |
| Cohort filter | URL searchParams | Shareable filter state, server-side filtering |
| Screenshot upload | Server action with FormData | Secure; server handles upload to Supabase Storage |
| Profiles RLS | Widen to allow public read | PostgREST joins need SELECT on profiles for author display names |
| Auth UI | Preserve in header area of new landing page | Existing P-HOME-001/P-HOME-002 tests must continue passing |

## Data Model

### Cohort
- id uuid (PK, gen_random_uuid())
- name text (required)
- created_at timestamptz
- updated_at timestamptz

### Project
- id uuid (PK, gen_random_uuid())
- user_id uuid -> profiles(id) ON DELETE CASCADE
- cohort_id uuid -> cohorts(id)
- title text (required)
- tagline text (required)
- screenshot_url text (required)
- project_url text (required)
- created_at timestamptz
- updated_at timestamptz

### Vote
- id uuid (PK, gen_random_uuid())
- user_id uuid -> profiles(id) ON DELETE CASCADE
- project_id uuid -> projects(id) ON DELETE CASCADE
- created_at timestamptz
- UNIQUE(user_id, project_id)

### Profile (modify existing)
- + cohort_id uuid -> cohorts(id) (nullable)

### Storage
- Bucket: `screenshots` (public, 5MB limit, JPEG/PNG/WebP only)

### RLS Summary

| Table | anon | authenticated |
|-------|------|---------------|
| cohorts | SELECT | SELECT |
| projects | SELECT | SELECT, INSERT (own), UPDATE (own), DELETE (own) |
| votes | SELECT | SELECT, INSERT (own), DELETE (own) |
| profiles | SELECT (widened) | SELECT (widened), UPDATE (own, existing) |

## Required Skills

| Skill | Applicable Task | Purpose |
|-------|-----------------|---------|
| supabase | Task 1 | Schema creation, declarative migrations, pgTAP testing |
| supabase-postgres-best-practices | Task 1 | RLS patterns, table conventions |
| next-best-practices | Tasks 3-7 | RSC boundaries, async searchParams, Server Actions, next/image |
| shadcn | Tasks 3-7 | Card, Badge, Dialog, Select, AlertDialog, DropdownMenu, form patterns |
| vercel-composition-patterns | Tasks 3, 5, 6 | Component architecture for cards and reusable form dialog |

## Affected Files (FSD paths)

> Note: This plan predates the FSD refactor. Paths have been updated to
> reflect the new layer structure. One source file per slice is the
> norm — avoid dropping multiple features into a single `actions.ts`.

| File Path | Change Type | Related Task |
|-----------|-------------|--------------|
| `supabase/schemas/cohorts.sql` | New | Task 1 |
| `supabase/schemas/projects.sql` | New | Task 1 |
| `supabase/schemas/votes.sql` | New | Task 1 |
| `supabase/schemas/profiles.sql` | Modify | Task 1 |
| `supabase/config.toml` | Modify | Task 1 |
| `supabase/tests/cohorts_test.sql` / `projects_test.sql` / `votes_test.sql` | New | Task 1 |
| `supabase/tests/profiles_test.sql` | Modify | Task 1 |
| `shared/api/supabase/types.ts` | Modify (regenerated) | Task 1 |
| `entities/project/{model/schema.ts,ui/project-card.tsx,index.ts}` | New | Tasks 2-3, 6, 7 |
| `entities/cohort/{model/schema.ts,index.ts}` | New | Task 4 |
| `entities/vote/{model/schema.ts,index.ts}` | New | Task 7 |
| `shared/lib/test-utils.tsx` | Modify | Task 2 |
| `app/__tests__/home-projects.test.tsx` | New (page integration) | Task 2 |
| `app/page.tsx` | Modify | Task 3, 4, 5 |
| `widgets/project-grid/{ui/project-grid.tsx,index.ts}` | New | Task 3 |
| `next.config.mjs` | Modify (remotePatterns + bodySizeLimit) | Task 3, 5 |
| `features/filter-by-cohort/{ui/cohort-filter.tsx,ui/cohort-filter.test.tsx,index.ts}` | New | Task 4 |
| `features/submit-project/{ui/project-form-dialog.tsx,api/actions.ts,model/schema.ts,ui/project-form-dialog.test.tsx,index.ts}` | New | Task 5 |
| `features/edit-project/{ui/edit-menu-item.tsx,api/actions.ts,ui/edit-menu-item.test.tsx,index.ts}` | New | Task 6 |
| `features/delete-project/{ui/delete-menu-item.tsx,api/actions.ts,ui/delete-menu-item.test.tsx,index.ts}` | New | Task 6 |
| `features/toggle-vote/{ui/upvote-button.tsx,api/actions.ts,ui/upvote-button.test.tsx,index.ts}` | New | Task 7 |

## Tasks

### Task 1: Database schema — cohorts, projects, votes + storage bucket + pgTAP tests

- **Scenarios**: Foundation for all MH-* (data layer: F-SUBMIT-PROJECT-001, F-SUBMIT-PROJECT-005, E-PROJECT-002, F-DELETE-PROJECT-001, F-TOGGLE-VOTE-001, F-TOGGLE-VOTE-002, F-TOGGLE-VOTE-003 depend on RLS)
- **Size**: M (8 files)
- **Dependencies**: None
- **References**:
  - supabase — creating-table, modifying-table, testing, declarative-schemas
  - supabase-postgres-best-practices — RLS, schema design
  - `supabase/schemas/profiles.sql` (existing schema pattern)
  - `supabase/tests/profiles_test.sql` (existing pgTAP pattern)
- **Implementation targets**:
  - `supabase/schemas/cohorts.sql`
  - `supabase/schemas/projects.sql`
  - `supabase/schemas/votes.sql`
  - `supabase/schemas/profiles.sql` (add nullable cohort_id FK, widen RLS to public read)
  - `supabase/config.toml` (add `[storage.buckets.screenshots]`)
  - `supabase/tests/micro_hunt_test.sql` (cohorts, projects, votes: table existence, columns, RLS, constraints)
  - `supabase/tests/profiles_test.sql` (update test 12: anon can now read profiles; add cohort_id column test)
  - `shared/api/supabase/types.ts` (regenerate)
- **Acceptance criteria**:
  - [ ] `cohorts` table exists with id, name, created_at, updated_at; RLS enabled; anon+authenticated SELECT
  - [ ] `projects` table exists with all columns, FK to profiles and cohorts; RLS: public SELECT, auth INSERT/UPDATE/DELETE own
  - [ ] `votes` table exists with UNIQUE(user_id, project_id); RLS: public SELECT, auth INSERT/DELETE own
  - [ ] `profiles.cohort_id` nullable FK to cohorts added
  - [ ] Profiles RLS widened: old "own profile only" SELECT replaced with public-read policy
  - [ ] `screenshots` storage bucket configured: public, 5MiB, JPEG/PNG/WebP
  - [ ] All pgTAP tests pass including updated profiles test
  - [ ] Types regenerated with new tables
- **Verification**:
  - `supabase db reset && supabase test db`
  - `bun run gen:types`

---

### Task 2: Spec tests for browse grid (TDD)

- **Scenarios**: P-HOME-003, E-PROJECT-001, P-HOME-004, P-HOME-005
- **Size**: S (2 files)
- **Dependencies**: Task 1 (type definitions for mock data shapes)
- **References**:
  - `app/__tests__/home.test.tsx` (existing test pattern: mock server client, render async page)
  - `shared/lib/test-utils.tsx` (mock Supabase client to extend)
- **Implementation targets**:
  - `shared/lib/test-utils.tsx` (extend `createMockSupabaseClient` with `.from()` chain support for projects/votes/cohorts queries)
  - `app/__tests__/home-projects.test.tsx`
- **Notes**:
  - The mock client currently only has `auth` methods; grid tests require `.from().select().eq().order()` chain support
  - Tests will fail until Task 3 implements the components — this is expected TDD behavior
- **Acceptance criteria** (quote spec.yaml examples verbatim):
  - [ ] P-HOME-003: `{ projectCount: 5 }` -> `{ cardCount: 5, sortOrder: "vote_count_desc", cardFields: ["screenshot", "title", "tagline", "displayName", "voteCount"] }`
  - [ ] E-PROJECT-001: `{ projectCount: 5 }` -> `{ badgeCount: 3, badges: ["1st", "2nd", "3rd"] }`
  - [ ] E-PROJECT-001: `{ projectCount: 2 }` -> `{ badgeCount: 2, badges: ["1st", "2nd"] }`
  - [ ] P-HOME-004: `{ firstVisit: true, projectCount: 5 }` -> `{ cardCount: 5, activeFilter: null }`
  - [ ] P-HOME-005: `{ projectCount: 0 }` -> `{ emptyMessage: "No projects yet" }`
  - [ ] P-HOME-005: `{ projectCount: 0, filter: "Cohort A" }` -> `{ emptyMessage: "No projects yet" }`
- **Verification**:
  - Tests exist and compile: `bun run test -- --grep "P-HOME-003|E-PROJECT-001|P-HOME-004|P-HOME-005"` (expected: fail, components not yet implemented)

---

### Task 3: Browse project grid — landing page with cards and rank badges

- **Scenarios**: P-HOME-003, E-PROJECT-001, P-HOME-004, P-HOME-005
- **Size**: M (4 files)
- **Dependencies**: Task 1 (schema + types), Task 2 (tests to make pass)
- **References**:
  - next-best-practices — RSC boundaries, async searchParams, data-patterns, image optimization
  - shadcn — Card composition, Badge, layout/spacing rules
  - vercel-composition-patterns — component architecture
  - `app/page.tsx` (current home page to refactor)
  - `shared/ui/card.tsx`, `shared/ui/button.tsx`
- **Implementation targets**:
  - `app/page.tsx` (refactor: preserve auth UI in header, add project grid below)
  - `entities/project/ui/project-card.tsx` (Card with screenshot, title, tagline, author name, vote count)
  - `widgets/project-grid/ui/project-grid.tsx` (responsive grid wrapper, empty state)
  - `next.config.mjs` (add `images.remotePatterns` for Supabase Storage)
- **Notes**:
  - Install shadcn `badge` component: `bunx --bun shadcn@latest add badge`
  - Server component fetches: `supabase.from('projects').select('*, profiles(display_name), cohorts(name)')`
  - Fetch votes separately: `supabase.from('votes').select('project_id')`, count per project in JS
  - Sort projects by vote count descending in JS
  - Top 3 get rank Badge (1st, 2nd, 3rd)
  - Use `next/image` for screenshots; configure remote pattern for Supabase Storage domain
  - Preserve "Sign in" / "Signed in as" / "Sign out" in a header area so P-HOME-001/P-HOME-002 tests pass
  - Empty state: "No projects yet" message when no projects
- **Acceptance criteria** (quote spec.yaml examples verbatim):
  - [ ] P-HOME-003: `{ projectCount: 5 }` -> `{ cardCount: 5, sortOrder: "vote_count_desc", cardFields: ["screenshot", "title", "tagline", "displayName", "voteCount"] }`
  - [ ] E-PROJECT-001: `{ projectCount: 5 }` -> `{ badgeCount: 3, badges: ["1st", "2nd", "3rd"] }`
  - [ ] E-PROJECT-001: `{ projectCount: 2 }` -> `{ badgeCount: 2, badges: ["1st", "2nd"] }`
  - [ ] P-HOME-004: `{ firstVisit: true, projectCount: 5 }` -> `{ cardCount: 5, activeFilter: null }`
  - [ ] P-HOME-005: `{ projectCount: 0 }` -> `{ emptyMessage: "No projects yet" }`
  - [ ] P-HOME-005: `{ projectCount: 0, filter: "Cohort A" }` -> `{ emptyMessage: "No projects yet" }`
- **Verification**:
  - `bun run test -- --grep "P-HOME-003|E-PROJECT-001|P-HOME-004|P-HOME-005"` — all pass
  - `bun run test -- --grep "HOME-"` — existing home tests still pass
  - `bun run build` — no errors

---

### Checkpoint: After Tasks 1-3
- [ ] All tests pass: `bun run test`
- [ ] Build succeeds: `bun run build`
- [ ] DB tests pass: `supabase test db`
- [ ] Landing page displays project cards sorted by vote count with rank badges on top 3

---

### Task 4: Cohort filter dropdown

- **Scenarios**: F-FILTER-BY-COHORT-001
- **Size**: S (3 files)
- **Dependencies**: Task 3 (grid to filter)
- **References**:
  - shadcn — Select component
  - next-best-practices — async searchParams (Next.js 15+)
- **Implementation targets**:
  - `features/filter-by-cohort/ui/cohort-filter.tsx` (client component: Select with cohort options)
  - `app/page.tsx` (read `searchParams.cohort`, filter query, pass cohorts to filter)
  - `features/filter-by-cohort/ui/cohort-filter.test.tsx`
- **Notes**:
  - Install shadcn `select` component: `bunx --bun shadcn@latest add select`
  - Client component uses `useRouter` + `useSearchParams` to update URL on selection
  - Server component reads `await searchParams` and applies `.eq('cohort_id', cohortId)` if present
  - Rank badges recalculate within the filtered result set
- **Acceptance criteria** (quote spec.yaml examples verbatim):
  - [ ] F-FILTER-BY-COHORT-001: `{ filter: "Cohort A" }` -> `{ cardCount: 2 }`
  - [ ] F-FILTER-BY-COHORT-001: `{ filter: "" }` -> `{ cardCount: 5 }`
- **Verification**:
  - `bun run test -- --grep "F-FILTER-BY-COHORT-001"`
  - `bun run build`

---

### Task 5: Project submission form with screenshot upload

- **Scenarios**: F-SUBMIT-PROJECT-001, F-SUBMIT-PROJECT-002, F-SUBMIT-PROJECT-003, F-SUBMIT-PROJECT-004, F-SUBMIT-PROJECT-005
- **Size**: M (4 files)
- **Dependencies**: Task 1 (storage bucket + schema), Task 3 (grid where submitted card appears)
- **References**:
  - shadcn — Dialog, FieldGroup + Field, form validation (data-invalid + aria-invalid)
  - next-best-practices — Server Actions
  - supabase — Storage upload
- **Implementation targets**:
  - `features/submit-project/ui/project-form-dialog.tsx` (Dialog with FieldGroup + Field form layout)
  - `features/<slice>/api/actions.ts` (one per feature: submit-project, edit-project, delete-project, toggle-vote) (`submitProject` server action: validate, upload screenshot, insert row)
  - `app/page.tsx` (add "Submit Project" button for authenticated users with cohort)
  - `features/submit-project/ui/project-form-dialog.test.tsx`
- **Notes**:
  - Install shadcn `dialog` component: `bunx --bun shadcn@latest add dialog`
  - Update `next.config.mjs`: add `serverActions: { bodySizeLimit: '6mb' }` for screenshot uploads
  - Client-side validation with Zod: required title/tagline/URL, file size <= 5MB, file type in [JPEG, PNG, WebP]
  - Use `data-invalid` + `aria-invalid` on Field for validation errors (per shadcn rules)
  - Server action: receives FormData, validates, uploads to `screenshots` bucket, inserts project row, calls `revalidatePath('/')`
  - No-cohort state (F-SUBMIT-PROJECT-005): show message + disable submit when user profile has no cohort_id
  - Screenshot storage path: `{user_id}/{uuid}.{ext}` for per-user organization
- **Acceptance criteria** (quote spec.yaml examples verbatim):
  - [ ] F-SUBMIT-PROJECT-001: `{ title: "My App", tagline: "A cool tool", url: "https://myapp.com", screenshot: "valid.png" }` -> `{ cardTitle: "My App", cardTagline: "A cool tool", cardVisible: true }`
  - [ ] F-SUBMIT-PROJECT-002: `{ title: "", tagline: "A cool tool", url: "https://myapp.com" }` -> `{ validationError: true }`
  - [ ] F-SUBMIT-PROJECT-003: `{ screenshotSize: "6MB", screenshotType: "image/png" }` -> `{ errorMessage: true }`
  - [ ] F-SUBMIT-PROJECT-004: `{ screenshotType: "image/gif" }` -> `{ errorMessage: true }`
  - [ ] F-SUBMIT-PROJECT-005: `{ cohortId: null }` -> `{ message: "Contact your instructor to get assigned to a cohort", submitDisabled: true }`
- **Verification**:
  - `bun run test -- --grep "F-SUBMIT-PROJECT-001|F-SUBMIT-PROJECT-002|F-SUBMIT-PROJECT-003|F-SUBMIT-PROJECT-004|F-SUBMIT-PROJECT-005"`
  - `bun run build`

---

### Checkpoint: After Tasks 4-5
- [ ] All tests pass: `bun run test`
- [ ] Build succeeds: `bun run build`
- [ ] Cohort filter works — selecting a cohort shows only that cohort's projects
- [ ] Project submission creates a new card in the grid with uploaded screenshot

---

### Task 6: Edit and delete own project

- **Scenarios**: E-PROJECT-002, F-EDIT-PROJECT-001, F-DELETE-PROJECT-001, F-DELETE-PROJECT-002
- **Size**: M (4 files)
- **Dependencies**: Task 5 (reuse project-form-dialog for edit mode)
- **References**:
  - shadcn — DropdownMenu, AlertDialog
  - `features/submit-project/ui/project-form-dialog.tsx` (reuse in edit mode with pre-filled values)
- **Implementation targets**:
  - `features/edit-project/ui/edit-menu-item.tsx` + `features/delete-project/ui/delete-menu-item.tsx` (DropdownMenu with Edit/Delete items, only rendered for owner)
  - `entities/project/ui/project-card.tsx` (add actions slot for owner)
  - `features/<slice>/api/actions.ts` (one per feature: submit-project, edit-project, delete-project, toggle-vote) (add `updateProject`, `deleteProject` server actions)
  - `features/{edit-project,delete-project}/ui/*.test.tsx` (split per slice)
- **Notes**:
  - Install shadcn `dropdown-menu` and `alert-dialog`: `bunx --bun shadcn@latest add dropdown-menu alert-dialog`
  - DropdownMenu visible only when `project.user_id === currentUser.id`
  - Edit: opens project-form-dialog in edit mode (pre-filled, reuses same component with `mode` prop)
  - Delete: opens AlertDialog with Confirm/Cancel; confirm calls `deleteProject` server action
  - `deleteProject` deletes project row + removes screenshot from Storage bucket
  - `updateProject` validates, optionally re-uploads screenshot, updates row
- **Acceptance criteria** (quote spec.yaml examples verbatim):
  - [ ] E-PROJECT-002: `{ cardOwner: "current_user" }` -> `{ editOption: true, deleteOption: true }`
  - [ ] E-PROJECT-002: `{ cardOwner: "other_user" }` -> `{ editOption: false, deleteOption: false }`
  - [ ] F-EDIT-PROJECT-001: `{ newTagline: "An awesome tool" }` -> `{ cardTagline: "An awesome tool" }`
  - [ ] F-DELETE-PROJECT-001: `{ action: "delete", confirm: true }` -> `{ cardRemoved: true }`
  - [ ] F-DELETE-PROJECT-002: `{ action: "delete", confirm: false }` -> `{ cardRemoved: false }`
- **Verification**:
  - `bun run test -- --grep "E-PROJECT-002|F-EDIT-PROJECT-001|F-DELETE-PROJECT-001|F-DELETE-PROJECT-002"`
  - `bun run build`

---

### Task 7: Upvote toggle button

- **Scenarios**: F-TOGGLE-VOTE-001, F-TOGGLE-VOTE-002, F-TOGGLE-VOTE-003, F-TOGGLE-VOTE-004
- **Size**: M (4 files)
- **Dependencies**: Task 3 (card component to integrate button into)
- **References**:
  - shadcn — Button variants, data-icon attribute
  - next-best-practices — Server Actions for mutations
- **Implementation targets**:
  - `features/toggle-vote/ui/upvote-button.tsx` (client component with optimistic UI)
  - `features/<slice>/api/actions.ts` (one per feature: submit-project, edit-project, delete-project, toggle-vote) (add `toggleVote` server action: insert if not exists, delete if exists)
  - `entities/project/ui/project-card.tsx` (integrate upvote button with three states)
  - `features/toggle-vote/ui/upvote-button.test.tsx`
- **Notes**:
  - Three visual states: upvoted (filled/active), not upvoted (outline/default), hidden (own project)
  - Unauthenticated users see "Sign in to vote" text prompt instead of the button
  - Use `useOptimistic` or `useTransition` for responsive vote toggle without waiting for server
  - Server action toggles: check if vote exists -> delete if yes, insert if no -> `revalidatePath('/')`
  - Pass `hasVoted`, `voteCount`, `isOwner`, `isAuthenticated` as props from server component
- **Acceptance criteria** (quote spec.yaml examples verbatim):
  - [ ] F-TOGGLE-VOTE-001: `{ currentVotes: 3, action: "upvote" }` -> `{ voteCount: 4, upvoted: true }`
  - [ ] F-TOGGLE-VOTE-002: `{ currentVotes: 4, action: "un-upvote" }` -> `{ voteCount: 3, upvoted: false }`
  - [ ] F-TOGGLE-VOTE-003: `{ cardOwner: "current_user" }` -> `{ upvoteButton: false }`
  - [ ] F-TOGGLE-VOTE-004: `{ authenticated: false }` -> `{ voteCountVisible: true, upvoteButton: false, signInPrompt: "Sign in to vote" }`
- **Verification**:
  - `bun run test -- --grep "F-TOGGLE-VOTE-001|F-TOGGLE-VOTE-002|F-TOGGLE-VOTE-003|F-TOGGLE-VOTE-004"`
  - `bun run build`

---

### Checkpoint: After Tasks 6-7
- [ ] All tests pass: `bun run test`
- [ ] Build succeeds: `bun run build`
- [ ] DB tests pass: `supabase test db`
- [ ] Full micro-hunt feature works end-to-end: browse, filter, submit, edit, delete, upvote

---

## Undecided Items

None
