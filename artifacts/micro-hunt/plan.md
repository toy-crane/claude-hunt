# Micro Hunt Implementation Plan

## Architecture Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Form location | Separate pages (`/submit`, `/edit/[id]`) | Clearer URL structure, keeps landing page focused on browsing |
| Vote count | COUNT via JOIN at query time | Course-scale data (~50-200 projects); avoids trigger complexity |
| Mutations | Server actions | Consistent with existing auth patterns (`app/auth/actions.ts`) |
| Screenshot storage | Supabase Storage bucket | Already in stack; handles upload policies, public URLs |
| Cohort filter | URL search param | Shareable filtered views, server-side filtering |

## Data Model

### Cohort
- id (uuid, PK)
- name (text, required)
- created_at (timestamptz)

### Project
- id (uuid, PK)
- user_id (uuid, FK → profiles)
- cohort_id (uuid, FK → cohorts)
- title (text, required)
- tagline (text, required)
- screenshot_url (text, required)
- project_url (text, required)
- created_at (timestamptz)
- updated_at (timestamptz)

### Vote
- id (uuid, PK)
- user_id (uuid, FK → profiles)
- project_id (uuid, FK → projects)
- created_at (timestamptz)
- UNIQUE (user_id, project_id)

### Profile (modify existing)
- cohort_id (uuid, nullable FK → cohorts)

## Required Skills

| Skill | Applicable Task | Purpose |
|-------|-----------------|---------|
| supabase | Tasks 2, 3 | Schema files, migration generation, RLS policies, Storage config |
| supabase-postgres-best-practices | Task 2 | Index strategy, RLS performance |
| shadcn | Tasks 4, 5, 6, 7, 8, 9, 10 | Component registry lookup and installation |
| frontend-ui-engineering | Tasks 5, 6, 7, 8, 9, 10 | Card grid layout, forms, responsive design |
| test-driven-development | All | TDD workflow for spec and implementation tests |
| next-best-practices | Tasks 5, 7, 8, 10 | Server/client boundaries, server actions, revalidation |
| security-and-hardening | Tasks 2, 3, 7 | RLS enforcement, file upload validation |

## Affected Files

| File Path | Change Type | Related Task |
|-----------|-------------|--------------|
| `__tests__/micro-hunt.spec.test.tsx` | New | Task 1 |
| `__tests__/helpers.tsx` | Modify | Task 1 |
| `supabase/schemas/cohorts.sql` | New | Task 2 |
| `supabase/schemas/projects.sql` | New | Task 2 |
| `supabase/schemas/votes.sql` | New | Task 2 |
| `supabase/schemas/profiles.sql` | Modify | Task 2 |
| `supabase/tests/micro_hunt_test.sql` | New | Task 2 |
| `types/database.types.ts` | Modify | Task 2 |
| `supabase/schemas/storage.sql` | New | Task 3 |
| `components/project-card.tsx` | New | Task 5 |
| `components/project-grid.tsx` | New | Task 5 |
| `app/page.tsx` | Modify | Task 5 |
| `components/cohort-filter.tsx` | New | Task 6 |
| `app/actions/projects.ts` | New | Task 7 |
| `components/project-form.tsx` | New | Task 7 |
| `app/submit/page.tsx` | New | Task 7 |
| `app/edit/[id]/page.tsx` | New | Task 8 |
| `app/actions/votes.ts` | New | Task 10 |
| `components/upvote-button.tsx` | New | Task 10 |
| `components/delete-project-dialog.tsx` | New | Task 9 |

## Tasks

### Task 1: Spec test scaffolding for micro-hunt

- **Scenarios**: MH-001 through MH-016
- **Size**: S (1-2 files)
- **Dependencies**: None
- **References**:
  - test-driven-development — spec test scaffolding
  - `__tests__/home.spec.test.tsx` (existing test pattern)
  - `__tests__/helpers.tsx` (mock helper pattern)
- **Implementation targets**:
  - `__tests__/micro-hunt.spec.test.tsx`
  - `__tests__/helpers.tsx`
- **Acceptance criteria**:
  - [ ] All MH-001 through MH-016 scenarios have corresponding test cases
  - [ ] Tests reference spec.yaml example inputs and expected outputs
  - [ ] Mock helper extended to support project/vote/cohort queries
  - [ ] `bun run test:unit` runs without errors (tests may be failing/skipped)

---

### Task 2: Database schema, RLS, and pgTAP tests

- **Scenarios**: All (database foundation for MH-001 through MH-016)
- **Size**: M (5+ files)
- **Dependencies**: None
- **References**:
  - supabase — schema files, RLS policies, migration generation
  - supabase-postgres-best-practices — indexes
  - security-and-hardening — RLS enforcement
  - `supabase/schemas/profiles.sql` (existing schema pattern)
  - `supabase/tests/profiles_test.sql` (existing pgTAP pattern)
- **Implementation targets**:
  - `supabase/schemas/cohorts.sql`
  - `supabase/schemas/projects.sql`
  - `supabase/schemas/votes.sql`
  - `supabase/schemas/profiles.sql`
  - `supabase/tests/micro_hunt_test.sql`
  - `types/database.types.ts`
- **Acceptance criteria**:
  - [ ] `cohorts` table with public read, no public write
  - [ ] `projects` table with public read, authenticated insert/update/delete own
  - [ ] `votes` table with public read, authenticated insert/delete own, unique (user_id, project_id)
  - [ ] `profiles.cohort_id` nullable FK to cohorts
  - [ ] `projects.updated_at` auto-updates on row modification
  - [ ] pgTAP tests verify: public can read projects, authenticated can only modify own projects, one vote per user per project, self-vote prevention
  - [ ] `bun run test:db` passes
  - [ ] `bun run gen:types` regenerates types successfully

---

### Task 3: Screenshot storage bucket

- **Scenarios**: MH-004, MH-006, MH-006a
- **Size**: S (1-2 files)
- **Dependencies**: Task 2 (projects table must exist for FK context)
- **References**:
  - supabase — Storage bucket configuration
  - security-and-hardening — upload validation policies
- **Implementation targets**:
  - `supabase/schemas/storage.sql` or migration
- **Acceptance criteria**:
  - [ ] Storage bucket accepts JPEG, PNG, WebP up to 5 MB
  - [ ] Authenticated users can upload to the bucket
  - [ ] Public read access for screenshot URLs

---

### Checkpoint: After Tasks 1-3
- [ ] All DB tests pass: `bun run test:db`
- [ ] Unit tests run: `bun run test:unit`
- [ ] Database types regenerated: `bun run gen:types`
- [ ] Database foundation ready for UI implementation

---

### Task 4: Install required shadcn components

- **Scenarios**: MH-001 through MH-016 (UI prerequisites)
- **Size**: S (1 file per component)
- **Dependencies**: None
- **References**:
  - shadcn — component registry, installation
- **Implementation targets**:
  - `components/ui/` (new component files)
- **Acceptance criteria**:
  - [ ] Components needed for grid, filter, forms, badges, and dialogs are installed from registry
  - [ ] `bun run build` succeeds

---

### Task 5: Browse project grid on landing page

- **Scenarios**: MH-001, MH-003, MH-015, MH-016
- **Size**: M (3-5 files)
- **Dependencies**: Task 2 (schema + types), Task 4 (UI components)
- **References**:
  - frontend-ui-engineering — responsive card grid layout
  - next-best-practices — server component data fetching
  - shadcn — card, badge component usage
- **Implementation targets**:
  - `app/page.tsx`
  - `components/project-card.tsx`
  - `components/project-grid.tsx`
- **Acceptance criteria**:
  - [ ] MH-001: `{ projectCount: 5 }` → `{ cardCount: 5, sortOrder: "vote_count_desc", cardFields: ["screenshot", "title", "tagline", "displayName", "voteCount"] }`
  - [ ] MH-003: `{ projectCount: 5 }` → `{ badgeCount: 3, badges: ["1st", "2nd", "3rd"] }`
  - [ ] MH-003: `{ projectCount: 2 }` → `{ badgeCount: 2, badges: ["1st", "2nd"] }`
  - [ ] MH-015: `{ firstVisit: true, projectCount: 5 }` → `{ cardCount: 5, activeFilter: null }`
  - [ ] MH-016: `{ projectCount: 0 }` → `{ emptyMessage: "No projects yet" }`
  - [ ] Spec tests for MH-001, MH-003, MH-015, MH-016 pass
  - [ ] `bun run build` succeeds

---

### Task 6: Cohort filter dropdown

- **Scenarios**: MH-002
- **Size**: S (1-2 files)
- **Dependencies**: Task 5 (grid to filter)
- **References**:
  - shadcn — select component
  - next-best-practices — URL search params for filtering
- **Implementation targets**:
  - `components/cohort-filter.tsx`
  - `app/page.tsx`
- **Acceptance criteria**:
  - [ ] MH-002: `{ filter: "Cohort A" }` → `{ cardCount: 2 }`
  - [ ] MH-002: `{ filter: "" }` → `{ cardCount: 5 }`
  - [ ] MH-016: `{ projectCount: 0, filter: "Cohort A" }` → `{ emptyMessage: "No projects yet" }`
  - [ ] Spec tests for MH-002 pass
  - [ ] `bun run build` succeeds

---

### Checkpoint: After Tasks 4-6
- [ ] All tests pass: `bun run test`
- [ ] Build succeeds: `bun run build`
- [ ] Landing page displays project grid with filtering and badges end-to-end

---

### Task 7: Submit project page

- **Scenarios**: MH-004, MH-005, MH-006, MH-006a, MH-007
- **Size**: M (3-5 files)
- **Dependencies**: Task 2 (schema), Task 3 (storage), Task 4 (UI components)
- **References**:
  - frontend-ui-engineering — form layout, validation UX
  - next-best-practices — server actions for mutations
  - security-and-hardening — file upload validation
  - shadcn — input, button, label, field components
- **Implementation targets**:
  - `app/submit/page.tsx`
  - `components/project-form.tsx`
  - `app/actions/projects.ts`
- **Acceptance criteria**:
  - [ ] MH-004: `{ title: "My App", tagline: "A cool tool", url: "https://myapp.com", screenshot: "valid.png" }` → `{ cardTitle: "My App", cardTagline: "A cool tool", cardVisible: true }`
  - [ ] MH-005: `{ title: "", tagline: "A cool tool", url: "https://myapp.com" }` → `{ validationError: true }`
  - [ ] MH-006: `{ screenshotSize: "6MB", screenshotType: "image/png" }` → `{ errorMessage: true }`
  - [ ] MH-006a: `{ screenshotType: "image/gif" }` → `{ errorMessage: true }`
  - [ ] MH-007: `{ cohortId: null }` → `{ message: "Contact your instructor to get assigned to a cohort", submitDisabled: true }`
  - [ ] Spec tests for MH-004, MH-005, MH-006, MH-006a, MH-007 pass
  - [ ] `bun run build` succeeds

---

### Task 8: Edit own project page

- **Scenarios**: MH-008, MH-009
- **Size**: M (3-5 files)
- **Dependencies**: Task 5 (card component), Task 7 (reuse project form)
- **References**:
  - next-best-practices — dynamic routes, server actions
  - shadcn — dropdown-menu for card actions
- **Implementation targets**:
  - `app/edit/[id]/page.tsx`
  - `components/project-card.tsx`
  - `components/project-form.tsx`
  - `app/actions/projects.ts`
- **Acceptance criteria**:
  - [ ] MH-008: `{ cardOwner: "current_user" }` → `{ editOption: true, deleteOption: true }`
  - [ ] MH-008: `{ cardOwner: "other_user" }` → `{ editOption: false, deleteOption: false }`
  - [ ] MH-009: `{ newTagline: "An awesome tool" }` → `{ cardTagline: "An awesome tool" }`
  - [ ] Spec tests for MH-008 (edit), MH-009 pass
  - [ ] `bun run build` succeeds

---

### Task 9: Delete own project

- **Scenarios**: MH-010, MH-010a
- **Size**: S (1-2 files)
- **Dependencies**: Task 8 (card owner actions visible)
- **References**:
  - shadcn — alert-dialog for confirmation
- **Implementation targets**:
  - `components/delete-project-dialog.tsx`
  - `components/project-card.tsx`
  - `app/actions/projects.ts`
- **Acceptance criteria**:
  - [ ] MH-010: `{ action: "delete", confirm: true }` → `{ cardRemoved: true }`
  - [ ] MH-010a: `{ action: "delete", confirm: false }` → `{ cardRemoved: false }`
  - [ ] Spec tests for MH-010, MH-010a pass
  - [ ] `bun run build` succeeds

---

### Task 10: Upvote toggle

- **Scenarios**: MH-011, MH-012, MH-013, MH-014
- **Size**: M (3-5 files)
- **Dependencies**: Task 5 (card component), Task 2 (votes schema)
- **References**:
  - next-best-practices — server actions, revalidation
  - frontend-ui-engineering — toggle button states
- **Implementation targets**:
  - `components/upvote-button.tsx`
  - `components/project-card.tsx`
  - `app/actions/votes.ts`
- **Acceptance criteria**:
  - [ ] MH-011: `{ currentVotes: 3, action: "upvote" }` → `{ voteCount: 4, upvoted: true }`
  - [ ] MH-012: `{ currentVotes: 4, action: "un-upvote" }` → `{ voteCount: 3, upvoted: false }`
  - [ ] MH-013: `{ cardOwner: "current_user" }` → `{ upvoteButton: false }`
  - [ ] MH-014: `{ authenticated: false }` → `{ voteCountVisible: true, upvoteButton: false, signInPrompt: "Sign in to vote" }`
  - [ ] Spec tests for MH-011, MH-012, MH-013, MH-014 pass
  - [ ] `bun run build` succeeds

---

### Checkpoint: After Tasks 7-10
- [ ] All tests pass: `bun run test`
- [ ] Build succeeds: `bun run build`
- [ ] Full micro-hunt feature works end-to-end: browse, filter, submit, edit, delete, upvote

---

## Undecided Items

None — all decisions resolved during planning.
