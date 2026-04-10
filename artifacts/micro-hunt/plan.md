# Micro Hunt Implementation Plan

## Architecture Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Form UX | Dialog overlay on landing page | User stays on grid; aligns with "under 30 seconds" submission goal |
| Data querying | Standard Supabase client + JS aggregation | Simple, sufficient for <100 projects, no custom view/RPC needed |
| Cohort filter | URL searchParams | Shareable filter state, server-side filtering |
| Screenshot upload | Server action with FormData | Secure; server handles upload to Supabase Storage |
| Profiles RLS | Widen to allow public read | PostgREST joins need SELECT on profiles for author display names |
| Auth UI | Preserve in header area of new landing page | Existing HOME-001/HOME-002 tests must continue passing |

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

## Affected Files

| File Path | Change Type | Related Task |
|-----------|-------------|--------------|
| `supabase/schemas/cohorts.sql` | New | Task 1 |
| `supabase/schemas/projects.sql` | New | Task 1 |
| `supabase/schemas/votes.sql` | New | Task 1 |
| `supabase/schemas/profiles.sql` | Modify | Task 1 |
| `supabase/config.toml` | Modify | Task 1 |
| `supabase/tests/micro_hunt_test.sql` | New | Task 1 |
| `supabase/tests/profiles_test.sql` | Modify | Task 1 |
| `types/database.types.ts` | Modify (regenerated) | Task 1 |
| `__tests__/helpers.tsx` | Modify | Task 2 |
| `__tests__/micro-hunt/browse.spec.test.tsx` | New | Task 2 |
| `app/page.tsx` | Modify | Task 3, 4, 5 |
| `components/project-card.tsx` | New | Task 3, 6, 7 |
| `components/project-grid.tsx` | New | Task 3 |
| `next.config.mjs` | Modify | Task 3, 5 |
| `components/cohort-filter.tsx` | New | Task 4 |
| `__tests__/micro-hunt/filter.spec.test.tsx` | New | Task 4 |
| `components/project-form-dialog.tsx` | New | Task 5 |
| `app/actions.ts` | New | Task 5, 6, 7 |
| `__tests__/micro-hunt/submit.spec.test.tsx` | New | Task 5 |
| `components/project-card-actions.tsx` | New | Task 6 |
| `__tests__/micro-hunt/manage.spec.test.tsx` | New | Task 6 |
| `components/upvote-button.tsx` | New | Task 7 |
| `__tests__/micro-hunt/vote.spec.test.tsx` | New | Task 7 |

## Tasks

### Task 1: Database schema — cohorts, projects, votes + storage bucket + pgTAP tests

- **Scenarios**: Foundation for all MH-* (data layer: MH-004, MH-007, MH-008, MH-010, MH-011, MH-012, MH-013 depend on RLS)
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
  - `types/database.types.ts` (regenerate)
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

- **Scenarios**: MH-001, MH-003, MH-015, MH-016
- **Size**: S (2 files)
- **Dependencies**: Task 1 (type definitions for mock data shapes)
- **References**:
  - `__tests__/home.spec.test.tsx` (existing test pattern: mock server client, render async page)
  - `__tests__/helpers.tsx` (mock Supabase client to extend)
- **Implementation targets**:
  - `__tests__/helpers.tsx` (extend `createMockSupabaseClient` with `.from()` chain support for projects/votes/cohorts queries)
  - `__tests__/micro-hunt/browse.spec.test.tsx`
- **Notes**:
  - The mock client currently only has `auth` methods; grid tests require `.from().select().eq().order()` chain support
  - Tests will fail until Task 3 implements the components — this is expected TDD behavior
- **Acceptance criteria** (quote spec.yaml examples verbatim):
  - [ ] MH-001: `{ projectCount: 5 }` -> `{ cardCount: 5, sortOrder: "vote_count_desc", cardFields: ["screenshot", "title", "tagline", "displayName", "voteCount"] }`
  - [ ] MH-003: `{ projectCount: 5 }` -> `{ badgeCount: 3, badges: ["1st", "2nd", "3rd"] }`
  - [ ] MH-003: `{ projectCount: 2 }` -> `{ badgeCount: 2, badges: ["1st", "2nd"] }`
  - [ ] MH-015: `{ firstVisit: true, projectCount: 5 }` -> `{ cardCount: 5, activeFilter: null }`
  - [ ] MH-016: `{ projectCount: 0 }` -> `{ emptyMessage: "No projects yet" }`
  - [ ] MH-016: `{ projectCount: 0, filter: "Cohort A" }` -> `{ emptyMessage: "No projects yet" }`
- **Verification**:
  - Tests exist and compile: `bun run test -- --grep "MH-001|MH-003|MH-015|MH-016"` (expected: fail, components not yet implemented)

---

### Task 3: Browse project grid — landing page with cards and rank badges

- **Scenarios**: MH-001, MH-003, MH-015, MH-016
- **Size**: M (4 files)
- **Dependencies**: Task 1 (schema + types), Task 2 (tests to make pass)
- **References**:
  - next-best-practices — RSC boundaries, async searchParams, data-patterns, image optimization
  - shadcn — Card composition, Badge, layout/spacing rules
  - vercel-composition-patterns — component architecture
  - `app/page.tsx` (current home page to refactor)
  - `components/ui/card.tsx`, `components/ui/button.tsx`
- **Implementation targets**:
  - `app/page.tsx` (refactor: preserve auth UI in header, add project grid below)
  - `components/project-card.tsx` (Card with screenshot, title, tagline, author name, vote count)
  - `components/project-grid.tsx` (responsive grid wrapper, empty state)
  - `next.config.mjs` (add `images.remotePatterns` for Supabase Storage)
- **Notes**:
  - Install shadcn `badge` component: `bunx --bun shadcn@latest add badge`
  - Server component fetches: `supabase.from('projects').select('*, profiles(display_name), cohorts(name)')`
  - Fetch votes separately: `supabase.from('votes').select('project_id')`, count per project in JS
  - Sort projects by vote count descending in JS
  - Top 3 get rank Badge (1st, 2nd, 3rd)
  - Use `next/image` for screenshots; configure remote pattern for Supabase Storage domain
  - Preserve "Sign in" / "Signed in as" / "Sign out" in a header area so HOME-001/HOME-002 tests pass
  - Empty state: "No projects yet" message when no projects
- **Acceptance criteria** (quote spec.yaml examples verbatim):
  - [ ] MH-001: `{ projectCount: 5 }` -> `{ cardCount: 5, sortOrder: "vote_count_desc", cardFields: ["screenshot", "title", "tagline", "displayName", "voteCount"] }`
  - [ ] MH-003: `{ projectCount: 5 }` -> `{ badgeCount: 3, badges: ["1st", "2nd", "3rd"] }`
  - [ ] MH-003: `{ projectCount: 2 }` -> `{ badgeCount: 2, badges: ["1st", "2nd"] }`
  - [ ] MH-015: `{ firstVisit: true, projectCount: 5 }` -> `{ cardCount: 5, activeFilter: null }`
  - [ ] MH-016: `{ projectCount: 0 }` -> `{ emptyMessage: "No projects yet" }`
  - [ ] MH-016: `{ projectCount: 0, filter: "Cohort A" }` -> `{ emptyMessage: "No projects yet" }`
- **Verification**:
  - `bun run test -- --grep "MH-001|MH-003|MH-015|MH-016"` — all pass
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

- **Scenarios**: MH-002
- **Size**: S (3 files)
- **Dependencies**: Task 3 (grid to filter)
- **References**:
  - shadcn — Select component
  - next-best-practices — async searchParams (Next.js 15+)
- **Implementation targets**:
  - `components/cohort-filter.tsx` (client component: Select with cohort options)
  - `app/page.tsx` (read `searchParams.cohort`, filter query, pass cohorts to filter)
  - `__tests__/micro-hunt/filter.spec.test.tsx`
- **Notes**:
  - Install shadcn `select` component: `bunx --bun shadcn@latest add select`
  - Client component uses `useRouter` + `useSearchParams` to update URL on selection
  - Server component reads `await searchParams` and applies `.eq('cohort_id', cohortId)` if present
  - Rank badges recalculate within the filtered result set
- **Acceptance criteria** (quote spec.yaml examples verbatim):
  - [ ] MH-002: `{ filter: "Cohort A" }` -> `{ cardCount: 2 }`
  - [ ] MH-002: `{ filter: "" }` -> `{ cardCount: 5 }`
- **Verification**:
  - `bun run test -- --grep "MH-002"`
  - `bun run build`

---

### Task 5: Project submission form with screenshot upload

- **Scenarios**: MH-004, MH-005, MH-006, MH-006a, MH-007
- **Size**: M (4 files)
- **Dependencies**: Task 1 (storage bucket + schema), Task 3 (grid where submitted card appears)
- **References**:
  - shadcn — Dialog, FieldGroup + Field, form validation (data-invalid + aria-invalid)
  - next-best-practices — Server Actions
  - supabase — Storage upload
- **Implementation targets**:
  - `components/project-form-dialog.tsx` (Dialog with FieldGroup + Field form layout)
  - `app/actions.ts` (`submitProject` server action: validate, upload screenshot, insert row)
  - `app/page.tsx` (add "Submit Project" button for authenticated users with cohort)
  - `__tests__/micro-hunt/submit.spec.test.tsx`
- **Notes**:
  - Install shadcn `dialog` component: `bunx --bun shadcn@latest add dialog`
  - Update `next.config.mjs`: add `serverActions: { bodySizeLimit: '6mb' }` for screenshot uploads
  - Client-side validation with Zod: required title/tagline/URL, file size <= 5MB, file type in [JPEG, PNG, WebP]
  - Use `data-invalid` + `aria-invalid` on Field for validation errors (per shadcn rules)
  - Server action: receives FormData, validates, uploads to `screenshots` bucket, inserts project row, calls `revalidatePath('/')`
  - No-cohort state (MH-007): show message + disable submit when user profile has no cohort_id
  - Screenshot storage path: `{user_id}/{uuid}.{ext}` for per-user organization
- **Acceptance criteria** (quote spec.yaml examples verbatim):
  - [ ] MH-004: `{ title: "My App", tagline: "A cool tool", url: "https://myapp.com", screenshot: "valid.png" }` -> `{ cardTitle: "My App", cardTagline: "A cool tool", cardVisible: true }`
  - [ ] MH-005: `{ title: "", tagline: "A cool tool", url: "https://myapp.com" }` -> `{ validationError: true }`
  - [ ] MH-006: `{ screenshotSize: "6MB", screenshotType: "image/png" }` -> `{ errorMessage: true }`
  - [ ] MH-006a: `{ screenshotType: "image/gif" }` -> `{ errorMessage: true }`
  - [ ] MH-007: `{ cohortId: null }` -> `{ message: "Contact your instructor to get assigned to a cohort", submitDisabled: true }`
- **Verification**:
  - `bun run test -- --grep "MH-004|MH-005|MH-006|MH-006a|MH-007"`
  - `bun run build`

---

### Checkpoint: After Tasks 4-5
- [ ] All tests pass: `bun run test`
- [ ] Build succeeds: `bun run build`
- [ ] Cohort filter works — selecting a cohort shows only that cohort's projects
- [ ] Project submission creates a new card in the grid with uploaded screenshot

---

### Task 6: Edit and delete own project

- **Scenarios**: MH-008, MH-009, MH-010, MH-010a
- **Size**: M (4 files)
- **Dependencies**: Task 5 (reuse project-form-dialog for edit mode)
- **References**:
  - shadcn — DropdownMenu, AlertDialog
  - `components/project-form-dialog.tsx` (reuse in edit mode with pre-filled values)
- **Implementation targets**:
  - `components/project-card-actions.tsx` (DropdownMenu with Edit/Delete items, only rendered for owner)
  - `components/project-card.tsx` (add actions slot for owner)
  - `app/actions.ts` (add `updateProject`, `deleteProject` server actions)
  - `__tests__/micro-hunt/manage.spec.test.tsx`
- **Notes**:
  - Install shadcn `dropdown-menu` and `alert-dialog`: `bunx --bun shadcn@latest add dropdown-menu alert-dialog`
  - DropdownMenu visible only when `project.user_id === currentUser.id`
  - Edit: opens project-form-dialog in edit mode (pre-filled, reuses same component with `mode` prop)
  - Delete: opens AlertDialog with Confirm/Cancel; confirm calls `deleteProject` server action
  - `deleteProject` deletes project row + removes screenshot from Storage bucket
  - `updateProject` validates, optionally re-uploads screenshot, updates row
- **Acceptance criteria** (quote spec.yaml examples verbatim):
  - [ ] MH-008: `{ cardOwner: "current_user" }` -> `{ editOption: true, deleteOption: true }`
  - [ ] MH-008: `{ cardOwner: "other_user" }` -> `{ editOption: false, deleteOption: false }`
  - [ ] MH-009: `{ newTagline: "An awesome tool" }` -> `{ cardTagline: "An awesome tool" }`
  - [ ] MH-010: `{ action: "delete", confirm: true }` -> `{ cardRemoved: true }`
  - [ ] MH-010a: `{ action: "delete", confirm: false }` -> `{ cardRemoved: false }`
- **Verification**:
  - `bun run test -- --grep "MH-008|MH-009|MH-010|MH-010a"`
  - `bun run build`

---

### Task 7: Upvote toggle button

- **Scenarios**: MH-011, MH-012, MH-013, MH-014
- **Size**: M (4 files)
- **Dependencies**: Task 3 (card component to integrate button into)
- **References**:
  - shadcn — Button variants, data-icon attribute
  - next-best-practices — Server Actions for mutations
- **Implementation targets**:
  - `components/upvote-button.tsx` (client component with optimistic UI)
  - `app/actions.ts` (add `toggleVote` server action: insert if not exists, delete if exists)
  - `components/project-card.tsx` (integrate upvote button with three states)
  - `__tests__/micro-hunt/vote.spec.test.tsx`
- **Notes**:
  - Three visual states: upvoted (filled/active), not upvoted (outline/default), hidden (own project)
  - Unauthenticated users see "Sign in to vote" text prompt instead of the button
  - Use `useOptimistic` or `useTransition` for responsive vote toggle without waiting for server
  - Server action toggles: check if vote exists -> delete if yes, insert if no -> `revalidatePath('/')`
  - Pass `hasVoted`, `voteCount`, `isOwner`, `isAuthenticated` as props from server component
- **Acceptance criteria** (quote spec.yaml examples verbatim):
  - [ ] MH-011: `{ currentVotes: 3, action: "upvote" }` -> `{ voteCount: 4, upvoted: true }`
  - [ ] MH-012: `{ currentVotes: 4, action: "un-upvote" }` -> `{ voteCount: 3, upvoted: false }`
  - [ ] MH-013: `{ cardOwner: "current_user" }` -> `{ upvoteButton: false }`
  - [ ] MH-014: `{ authenticated: false }` -> `{ voteCountVisible: true, upvoteButton: false, signInPrompt: "Sign in to vote" }`
- **Verification**:
  - `bun run test -- --grep "MH-011|MH-012|MH-013|MH-014"`
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
