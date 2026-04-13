# Micro-Hunt Implementation Plan

## Architecture Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Vote count computation | SQL view `projects_with_vote_count` (LEFT JOIN votes, GROUP BY) | Always accurate, no trigger maintenance, fits current scale |
| Screenshot upload flow | Client uploads to Storage, server action writes row | Avoids piping large bytes through Next.js runtime |
| Self-vote prevention | BEFORE INSERT trigger on `votes` (raises exception when voter owns the project) | DB is source of truth for the invariant; UI still hides the button for UX |
| Project → cohort linkage | `projects.cohort_id` copied from submitter's profile at submission time | Grid filter stays simple; historical projects remain tied to the cohort they were submitted under |
| Cohort seeding | SQL `INSERT` in a manual migration file | Cohorts are low-frequency and seeded operationally (per idea.md) |
| Landing route | Replace `app/page.tsx` entirely | Spec places the showcase at `/` as the app's default page |
| Public read | Anon `select` on `projects`, `votes`, `cohorts`, and on screenshots bucket | Spec: "Public browsing (no auth required to view)" |

## Infrastructure Resources

| Resource | Type | Declared in | Creation Task |
|----------|------|-------------|---------------|
| `project-screenshots` | Storage bucket (public read, 5 MiB, JPEG/PNG/WebP) | `supabase/config.toml` → `[storage.buckets.project-screenshots]` | Task 4 |
| Storage RLS on `storage.objects` | RLS policies (authenticated insert/update/delete own, public select) | Manual migration (diff tool cannot capture `storage` schema policies) | Task 4 |
| Cohort seed rows | DML `INSERT` (e.g. "Cohort A", "Cohort B") | Manual migration | Task 1 |
| Self-vote prevention trigger | Trigger + trigger function on `public.votes` | Manual migration | Task 8 |

## Data Model

### Cohort (`public.cohorts`)
- `id` uuid PK (default `gen_random_uuid()`)
- `name` text unique not null
- `created_at` timestamptz not null default now()
- RLS: public `select` for `anon` + `authenticated`; no write policies (admin-only via migration)

### Profile (`public.profiles`) — **extended**
- existing columns preserved
- `cohort_id` uuid null references `public.cohorts(id)` on delete set null
- existing RLS preserved; add `select` for `authenticated` on *all* profiles so cards can show author display names. Write policies remain self-only.

### Project (`public.projects`)
- `id` uuid PK (default `gen_random_uuid()`)
- `user_id` uuid not null references `public.profiles(id)` on delete cascade
- `cohort_id` uuid not null references `public.cohorts(id)` on delete restrict
- `title` text not null, length ≤ 80
- `tagline` text not null, length ≤ 140
- `project_url` text not null (basic URL shape check)
- `screenshot_path` text not null (object path inside the `project-screenshots` bucket)
- `created_at` timestamptz not null default now()
- `updated_at` timestamptz not null default now()
- RLS: public `select`; `insert`/`update`/`delete` by owner only (`auth.uid() = user_id`)

### Vote (`public.votes`)
- `id` uuid PK (default `gen_random_uuid()`)
- `user_id` uuid not null references `public.profiles(id)` on delete cascade
- `project_id` uuid not null references `public.projects(id)` on delete cascade
- `created_at` timestamptz not null default now()
- `unique (user_id, project_id)` → enforces "at most one upvote per pair"
- RLS: public `select`; `insert`/`delete` only by authenticated owner (`auth.uid() = user_id`)
- BEFORE INSERT trigger rejects votes where `user_id = projects.user_id`

### View (`public.projects_with_vote_count`)
- Projects LEFT JOIN votes, grouped by project + joined to profiles for `author_display_name`
- Exposes: all project columns, `cohort_name`, `author_display_name`, `vote_count` (bigint)
- `security_invoker = true` so underlying RLS still applies

## Required Skills

| Skill | Applicable Task | Purpose |
|-------|-----------------|---------|
| `test-driven-development` | All tasks | RED → GREEN discipline; tier selection |
| `supabase` | Tasks 1, 2, 3, 4, 8 | Declarative schemas, diff workflow, pgTAP, storage buckets |
| `supabase-postgres-best-practices` | Tasks 1, 2, 3 | Index choices for `user_id`, `project_id`, `cohort_id`; `security_invoker` view |
| `fsd` | Tasks 5–11 | Layer placement (entities / features / widgets / app), slice public API |
| `next-best-practices` | Tasks 5, 6, 9, 10, 11 | RSC vs client boundaries, async APIs, server actions, metadata |
| `frontend-ui-engineering` | Tasks 5, 6, 7, 8, 9, 10, 11 | Production-quality form UX, card grid layout, empty state |
| `shadcn` | Tasks 6, 7, 9, 10 | Install `select`, `dialog`, `textarea`, `form` (project uses shadcn-style components under `shared/ui/`; keep conventions) |
| `security-and-hardening` | Tasks 4, 7, 9 | File type/size validation, defence-in-depth for self-vote and ownership |
| `browser-testing-with-devtools` | Task 12 | E2E verification against real Supabase |

## Affected Files

| File Path | Change Type | Related Task |
|-----------|-------------|--------------|
| `supabase/schemas/cohorts.sql` | New | 1 |
| `supabase/schemas/profiles.sql` | Modify (add `cohort_id`, relax select RLS to `authenticated`) | 1 |
| `supabase/tests/cohorts_test.sql` | New | 1 |
| `supabase/tests/profiles_test.sql` | Modify (extend for `cohort_id`) | 1 |
| `supabase/migrations/<ts>_cohorts.sql` | New (generated via `db diff`) | 1 |
| `supabase/migrations/<ts>_seed_cohorts.sql` | New (manual; DML) | 1 |
| `entities/cohort/model/schema.ts` | New | 1 |
| `entities/cohort/index.ts` | New | 1 |
| `supabase/schemas/projects.sql` | New (includes view `projects_with_vote_count`) | 2 |
| `supabase/tests/projects_test.sql` | New | 2 |
| `supabase/migrations/<ts>_projects.sql` | New (generated) | 2 |
| `entities/project/model/schema.ts` | New | 2 |
| `entities/project/index.ts` | New | 2 |
| `supabase/schemas/votes.sql` | New | 3 |
| `supabase/tests/votes_test.sql` | New | 3 |
| `supabase/migrations/<ts>_votes.sql` | New (generated) | 3 |
| `entities/vote/model/schema.ts` | New | 3 |
| `entities/vote/index.ts` | New | 3 |
| `supabase/config.toml` | Modify (uncomment & set `[storage.buckets.project-screenshots]`) | 4 |
| `supabase/migrations/<ts>_project_screenshots_rls.sql` | New (manual; storage RLS) | 4 |
| `supabase/tests/storage_project_screenshots_test.sql` | New | 4 |
| `widgets/project-grid/ui/rank-badge.tsx` | New | 5 |
| `widgets/project-grid/ui/rank-badge.test.tsx` | New | 5 |
| `widgets/project-grid/ui/project-card.tsx` | New | 5 |
| `widgets/project-grid/ui/project-card.test.tsx` | New | 5 |
| `widgets/project-grid/ui/empty-state.tsx` | New | 5 |
| `widgets/project-grid/ui/project-grid.tsx` | New | 5 |
| `widgets/project-grid/ui/project-grid.test.tsx` | New | 5 |
| `widgets/project-grid/api/fetch-projects.ts` | New | 5 |
| `widgets/project-grid/index.ts` | New | 5 |
| `app/page.tsx` | Modify (replace welcome with grid) | 5 |
| `app/__tests__/page.test.tsx` | New | 5 |
| `features/cohort-filter/ui/cohort-dropdown.tsx` | New | 6 |
| `features/cohort-filter/ui/cohort-dropdown.test.tsx` | New | 6 |
| `features/cohort-filter/index.ts` | New | 6 |
| `shared/ui/select.tsx` | New (shadcn add) | 6 |
| `features/submit-project/api/actions.ts` | New | 7 |
| `features/submit-project/api/actions.test.ts` | New | 7 |
| `features/submit-project/api/schema.ts` | New (Zod validation) | 7 |
| `features/submit-project/ui/submit-form.tsx` | New | 7 |
| `features/submit-project/ui/submit-form.test.tsx` | New | 7 |
| `features/submit-project/lib/upload-screenshot.ts` | New (browser client direct upload) | 7 |
| `features/submit-project/index.ts` | New | 7 |
| `shared/ui/textarea.tsx` | New (shadcn add) | 7 |
| `features/submit-project/ui/submit-form.test.tsx` | Modify (cohort-less guidance) | 8 |
| `features/edit-project/api/actions.ts` | New | 9 |
| `features/edit-project/api/actions.test.ts` | New | 9 |
| `features/edit-project/ui/edit-dialog.tsx` | New | 9 |
| `features/edit-project/ui/edit-dialog.test.tsx` | New | 9 |
| `features/edit-project/index.ts` | New | 9 |
| `shared/ui/dialog.tsx` | New (shadcn add) | 9 |
| `features/delete-project/api/actions.ts` | New | 10 |
| `features/delete-project/api/actions.test.ts` | New | 10 |
| `features/delete-project/ui/delete-button.tsx` | New | 10 |
| `features/delete-project/ui/delete-button.test.tsx` | New | 10 |
| `features/delete-project/index.ts` | New | 10 |
| `features/toggle-vote/api/actions.ts` | New | 11 |
| `features/toggle-vote/api/actions.test.ts` | New | 11 |
| `features/toggle-vote/ui/vote-button.tsx` | New | 11 |
| `features/toggle-vote/ui/vote-button.test.tsx` | New | 11 |
| `features/toggle-vote/index.ts` | New | 11 |
| `e2e/micro-hunt.spec.ts` | New | 12 |

## Tasks

### Task 1: Add `cohorts` table and link profiles to a cohort

- **Covers**: Scenario 4 (partial — schema foundation for "student assigned to a cohort"); Scenario 2 (partial — cohort data source)
- **Size**: M
- **Dependencies**: None
- **References**:
  - `test-driven-development` — pgTAP RED-first
  - `supabase` — declarative schema, `supabase db diff`, manual migration for DML seeds, `supabase-migration.md` rule
  - `supabase/schemas/profiles.sql` (pattern to mirror for RLS)
  - `supabase/tests/profiles_test.sql` (pgTAP scaffold)
- **Implementation targets**:
  - `supabase/tests/cohorts_test.sql`
  - `supabase/schemas/cohorts.sql`
  - `supabase/schemas/profiles.sql` (add `cohort_id` + broaden select RLS to `authenticated` so cards can show author names)
  - `supabase/tests/profiles_test.sql` (extend)
  - Manual migration seeding "Cohort A" and "Cohort B"
  - `entities/cohort/model/schema.ts`, `entities/cohort/index.ts`
- **Acceptance**:
  - [x] `cohorts` table exists with `id`, `name` (unique), `created_at`; RLS enabled; anon & authenticated can `select`
  - [x] `profiles.cohort_id` column exists as nullable FK to `cohorts(id)`, `on delete set null`
  - [x] Any authenticated user can `select` every profile's `display_name` & `cohort_id` (needed for cards)
  - [x] Existing "users can only update their own profile" behaviour is preserved
  - [x] Seed migration inserts at least two cohort rows visible to anon
- **Verification**:
  - `bun run test:db`
  - `supabase db diff --debug` shows no drift

---

### Task 2: Add `projects` table + `projects_with_vote_count` view

- **Covers**: Scenario 1 (partial — schema for render), Invariant 3 (vote count == actual upvotes)
- **Size**: M
- **Dependencies**: Task 1 (cohort FK)
- **References**:
  - `supabase` — declarative schema, `security_invoker` view, `projects_with_vote_count` published via view so `LEFT JOIN votes` is safe even before Task 3
  - `supabase-postgres-best-practices` — indexes on FK columns
  - `entities/profile/model/schema.ts` (type extraction pattern)
- **Implementation targets**:
  - `supabase/tests/projects_test.sql`
  - `supabase/schemas/projects.sql` (table + view; view defined inline in the same schema file)
  - `entities/project/model/schema.ts`, `entities/project/index.ts`
- **Acceptance**:
  - [x] `projects` table exists with all documented columns; FKs to `profiles` (cascade) and `cohorts` (restrict)
  - [x] RLS: public `select`; `insert`/`update`/`delete` only when `auth.uid() = user_id`
  - [x] View `projects_with_vote_count` returns `vote_count = 0` when no votes exist (validates LEFT JOIN + coalesce) — completed in Task 3 (see decisions.md)
  - [x] Authenticated user can `insert` a project as themselves; blocked when `user_id` spoofs another user
  - [x] Indexes exist on `projects(user_id)` and `projects(cohort_id)`
- **Verification**:
  - `bun run test:db`
  - `bun run gen:types` regenerates `shared/api/supabase/types.ts` without error

---

### Task 3: Add `votes` table with unique-per-pair constraint

- **Covers**: Invariant 2 (at most one upvote per `(user, project)`), Scenario 6 (partial — schema)
- **Size**: S
- **Dependencies**: Task 2 (FK to projects)
- **References**:
  - `supabase` — declarative schema; trigger for self-vote is deferred to Task 8 (manual migration)
  - `entities/project/model/schema.ts` (type pattern)
- **Implementation targets**:
  - `supabase/tests/votes_test.sql`
  - `supabase/schemas/votes.sql`
  - `entities/vote/model/schema.ts`, `entities/vote/index.ts`
- **Acceptance**:
  - [x] `votes` table exists with unique `(user_id, project_id)` constraint; duplicate insert fails
  - [x] RLS: public `select`; only `auth.uid() = user_id` can `insert`/`delete`
  - [x] Inserting `vote_count` for a project via `projects_with_vote_count` reflects new row immediately
  - [x] Deleting a `projects` row cascades to its votes
- **Verification**:
  - `bun run test:db`

---

### Checkpoint: After Tasks 1–3
- [x] `bun run test` green (54 pgTAP checks across 4 files; Vitest passes with no unit tests yet)
- [x] `bun run build` succeeds
- [x] Tables + view queryable from `supabase studio`; entity types exported from `@entities/{cohort,project,vote}`

---

### Task 4: Provision `project-screenshots` storage bucket with RLS

- **Covers**: Scenario 3 (partial — storage for screenshot upload); guards screenshot type/size at the bucket level (Success Criteria "Screenshot larger than 5 MB" & format rejection)
- **Size**: S
- **Dependencies**: None (can run in parallel with Tasks 1–3 — the Checkpoint placement reflects logical grouping, not a hard ordering constraint)
- **References**:
  - `.claude/rules/supabase-migration.md` — "Storage buckets → config.toml", "RLS on storage.objects → manual migration"
  - `supabase` skill — `storage-buckets.md`
- **Implementation targets**:
  - `supabase/config.toml` (uncomment & edit: `public = true`, `file_size_limit = "5MiB"`, `allowed_mime_types = ["image/jpeg", "image/png", "image/webp"]`, `objects_path = "./project-screenshots"`)
  - Manual migration for RLS on `storage.objects`
  - `supabase/tests/storage_project_screenshots_test.sql`
- **Acceptance**:
  - [x] Bucket `project-screenshots` exists after `supabase start`; public URL reads succeed without auth
  - [x] Authenticated `insert` succeeds only when `owner = auth.uid()`; other-owner writes rejected
  - [x] File larger than 5 MiB or outside the allowed MIME list is rejected by the bucket (enforced at storage layer via config.toml; pgTAP asserts the bucket has the 5 MiB limit and the JPEG/PNG/WebP allow-list)
  - [x] Delete/update restricted to the object's owner
- **Verification**:
  - `supabase stop && supabase start` (config reload)
  - `bun run test:db`

---

### Task 5: Landing page renders the project grid (read-only, happy path + empty state)

- **Covers**: Scenario 1 (full), Scenario 7 (full)
- **Size**: M
- **Dependencies**: Tasks 1–3 (view), Task 4 (screenshot public URL)
- **References**:
  - `next-best-practices` — RSC data fetching, async page components, metadata
  - `frontend-ui-engineering` — card grid, empty-state polish
  - `fsd` — widget composes entity data; no cross-feature imports
  - `vercel-react-best-practices` — avoid client components where RSC suffices
  - `app/page.tsx` (existing pattern for Supabase RSC client usage)
- **Implementation targets**:
  - `widgets/project-grid/ui/rank-badge.{tsx,test.tsx}` (pure UI, tests cover "only 1st+2nd when 2 projects")
  - `widgets/project-grid/ui/project-card.{tsx,test.tsx}` (renders screenshot + title + tagline + author + vote count; badge when `rank <= 3`)
  - `widgets/project-grid/ui/empty-state.tsx`
  - `widgets/project-grid/ui/project-grid.{tsx,test.tsx}` (maps rows → cards, sort + rank attach, empty-state branch)
  - `widgets/project-grid/api/fetch-projects.ts` (RSC data loader from `projects_with_vote_count`)
  - `widgets/project-grid/index.ts`
  - `app/page.tsx` (replace welcome with `<ProjectGrid />`)
  - `app/__tests__/page.test.tsx` (uses `renderServerComponent` + `createMockSupabaseClient`)
- **Acceptance**:
  - [x] 5 seeded projects → 5 cards render in vote-count-descending order
  - [x] Each card shows screenshot, title, tagline, author `display_name`, vote count
  - [x] Top three cards show "1st", "2nd", "3rd" badges respectively
  - [x] 2 projects → only "1st" and "2nd" badges visible ("3rd" absent)
  - [x] 0 projects → `"No projects yet"` message renders instead of the grid
- **Verification**:
  - `bun run test:unit -- widgets/project-grid app`
  - `bun run build`

---

### Task 6: Cohort filter narrows the grid

- **Covers**: Scenario 2 (full), Scenario 7 (partial — "filter active and no projects match")
- **Size**: M
- **Dependencies**: Task 5
- **References**:
  - `next-best-practices` — URL `searchParams` for shareable filter state
  - `shadcn` — add `select` component (`bunx shadcn@latest add select`)
  - `features/cohort-filter` slice boundary
- **Implementation targets**:
  - `shared/ui/select.tsx` (shadcn add; do not hand-modify)
  - `features/cohort-filter/ui/cohort-dropdown.{tsx,test.tsx}` (client component; reads current `cohort` searchParam, updates via `router.replace`)
  - `features/cohort-filter/index.ts`
  - `widgets/project-grid/api/fetch-projects.ts` (accept optional `cohortId` filter)
  - `app/page.tsx` (read `searchParams.cohort`, pass to `fetch-projects`, mount dropdown above the grid)
- **Acceptance**:
  - [x] First visit (no `?cohort=`) → all cohorts' projects appear
  - [x] Selecting "Cohort A" navigates to `/?cohort=<id>` and only that cohort's projects render
  - [x] Top-3 badges recalculate against the filtered set (not the global set)
  - [x] "Clear" option returns to all projects with global top-3 badges
  - [x] Filter active with no matches → `"No projects yet"` empty state
- **Verification**:
  - `bun run test:unit -- features/cohort-filter widgets/project-grid app`
  - `bun run build`

---

### Checkpoint: After Tasks 4–6
- [ ] `bun run test` green
- [ ] `bun run build` succeeds
- [ ] Visiting `/` locally shows the grid with working cohort filter

---

### Task 7: Submit a project (happy path)

- **Covers**: Scenario 3 (Success Criteria 1, 2, 3, 4, 5 — full)
- **Size**: M
- **Dependencies**: Tasks 2, 4
- **References**:
  - `next-best-practices` — server actions, `revalidatePath('/')`
  - `security-and-hardening` — file MIME + size validation before upload
  - `shadcn` — `bunx shadcn@latest add textarea`
  - `supabase` — browser-side upload via `@supabase/ssr` browser client
  - `features/auth-login/api/actions.ts` (server-action pattern)
- **Implementation targets**:
  - `features/submit-project/api/schema.ts` (Zod: title ≤ 80, tagline ≤ 140, `project_url` URL, MIME/size hints)
  - `features/submit-project/lib/upload-screenshot.ts` (client helper → `supabase.storage.from('project-screenshots').upload()`)
  - `features/submit-project/api/actions.{ts,test.ts}` (server action inserts row using submitter's `cohort_id`, rejects when missing)
  - `features/submit-project/ui/submit-form.{tsx,test.tsx}` (client form; disables submit during upload; surfaces field + storage errors)
  - `shared/ui/textarea.tsx` (shadcn add)
  - `features/submit-project/index.ts`
  - `app/page.tsx` (mount submit button/dialog for signed-in users with a cohort)
- **Acceptance**:
  - [x] Valid input (title="My App", tagline="A cool tool", url="https://myapp.com", 1 MB PNG) → new card with title "My App" and tagline "A cool tool" appears in the grid after submit
  - [x] Empty title (or any required field empty) → submit rejected, inline validation error shown, no row inserted
  - [x] 6 MB screenshot → form shows "File must be ≤ 5 MB" (client check) and storage also rejects as defence-in-depth
  - [x] `.gif` upload → form shows "Only JPEG, PNG, or WebP allowed" (client check) and MIME filter rejects
  - [x] JPEG/PNG/WebP up to 5 MB all succeed (parametrised test)
- **Verification**:
  - `bun run test:unit -- features/submit-project`
  - `bun run build`

---

### Task 8: Block submission for students without a cohort + enforce self-vote prevention

Split into 8a and 8b — two independent hardening slices, both small.

#### Task 8a: Block submission for students without a cohort

- **Covers**: Scenario 4 (full)
- **Size**: S
- **Dependencies**: Task 7
- **References**:
  - `next-best-practices` — server-side guard + UI guard
  - Task 7 implementation (to extend)
- **Implementation targets**:
  - `features/submit-project/ui/submit-form.tsx` (render guidance banner + disabled submit when `profile.cohort_id` is null)
  - `features/submit-project/ui/submit-form.test.tsx` (extend)
  - `features/submit-project/api/actions.ts` (early-return error if acting profile has null `cohort_id`)
  - `features/submit-project/api/actions.test.ts` (extend)
- **Acceptance**:
  - [x] Signed-in student with `profile.cohort_id = null` → form shows "Contact your instructor to get assigned to a cohort" and Submit button is `disabled`
  - [x] Direct server-action invocation for a cohort-less user rejects with a clear error (defence-in-depth against UI bypass)
- **Verification**:
  - `bun run test:unit -- features/submit-project`

#### Task 8b: Self-vote prevention trigger

- **Covers**: Invariant 1 (ownership — DB backstop against self-vote), Invariant 2 (one-vote-per-pair — reinforces the unique constraint against the owner edge case)
- **Size**: S
- **Dependencies**: Task 3
- **References**:
  - `.claude/rules/supabase-migration.md` — triggers use manual migration path
- **Implementation targets**:
  - Manual migration creating `public.prevent_self_vote()` trigger function + `BEFORE INSERT` trigger on `public.votes`
  - `supabase/tests/votes_test.sql` (extend)
- **Acceptance**:
  - [ ] Inserting a vote where `user_id = projects.user_id` raises a `raise_exception`
  - [ ] Inserting a vote on someone else's project still succeeds
- **Verification**:
  - `bun run test:db`

---

### Checkpoint: After Tasks 7–8
- [ ] `bun run test` green
- [ ] `bun run build` succeeds
- [ ] A cohort-assigned student can submit a project from the UI and it appears in the grid; cohort-less student sees the blocked state

---

### Task 9: Edit own project

- **Covers**: Scenario 5 Success Criteria "edit/delete visible only on own card", "edit tagline → card updates" (edit portion; delete handled in Task 10)
- **Size**: M
- **Dependencies**: Task 7
- **References**:
  - `next-best-practices` — server action + `revalidatePath`
  - `shadcn` — `bunx shadcn@latest add dialog`
  - `security-and-hardening` — RLS is authoritative; UI-only hiding is not enough
- **Implementation targets**:
  - `features/edit-project/api/schema.ts` (Zod; mirrors submit-project rules, screenshot optional)
  - `features/edit-project/api/actions.{ts,test.ts}`
  - `features/edit-project/ui/edit-dialog.{tsx,test.tsx}` (shadcn Dialog with the same fields except screenshot optional)
  - `features/edit-project/index.ts`
  - `shared/ui/dialog.tsx` (shadcn add)
  - `widgets/project-grid/ui/project-card.tsx` (render "Edit" trigger only when `session.user.id === project.user_id`)
- **Acceptance**:
  - [ ] Student viewing their own card → "Edit" trigger is visible
  - [ ] Student viewing another student's card → "Edit" trigger is not rendered
  - [ ] Editing tagline from "A cool tool" to "An awesome tool" → the card rerenders with "An awesome tool"
  - [ ] Server action attempting to update another user's project is rejected by RLS (test invokes action with a spoofed `id`)
- **Verification**:
  - `bun run test:unit -- features/edit-project widgets/project-grid`

---

### Task 10: Delete own project (with confirmation)

- **Covers**: Scenario 5 Success Criteria "press delete → confirmation", "confirm → card disappears", "cancel → card remains"
- **Size**: S
- **Dependencies**: Task 9 (card-owner gating), Task 7 (storage cleanup helper)
- **References**:
  - `next-best-practices` — `revalidatePath`
  - `shadcn` dialog (already added in Task 9)
- **Implementation targets**:
  - `features/delete-project/api/actions.{ts,test.ts}` (server action: remove row; attempt best-effort screenshot removal from storage)
  - `features/delete-project/ui/delete-button.{tsx,test.tsx}` (shadcn Dialog confirm)
  - `features/delete-project/index.ts`
  - `widgets/project-grid/ui/project-card.tsx` (render trigger)
- **Acceptance**:
  - [ ] Student viewing their own card → "Delete" trigger is visible
  - [ ] Student viewing another student's card → "Delete" trigger is not rendered
  - [ ] Clicking "Delete" opens a confirmation dialog
  - [ ] Confirming → row is deleted, revalidation re-renders grid without the card
  - [ ] Cancelling → dialog closes, card stays in the grid
  - [ ] Delete action on a non-owned project is rejected by RLS (defence-in-depth test)
- **Verification**:
  - `bun run test:unit -- features/delete-project widgets/project-grid`

---

### Checkpoint: After Tasks 9–10
- [ ] `bun run test` green
- [ ] `bun run build` succeeds
- [ ] Owner can edit + delete their own project end-to-end

---

### Task 11: Toggle upvote

- **Covers**: Scenario 6 (full)
- **Size**: M
- **Dependencies**: Task 3 (votes table), Task 8b (self-vote trigger), Task 5 (card UI)
- **References**:
  - `next-best-practices` — server action with `revalidatePath('/')`
  - `vercel-react-best-practices` — optimistic UI with `useOptimistic`
  - `frontend-ui-engineering` — clear "upvoted" visual state
- **Implementation targets**:
  - `features/toggle-vote/api/actions.{ts,test.ts}` (server action: insert vote if absent, delete if present)
  - `features/toggle-vote/ui/vote-button.{tsx,test.tsx}` (client; receives `projectId`, `ownedByViewer`, `alreadyVoted`, `voteCount`; renders sign-in prompt for anon)
  - `features/toggle-vote/index.ts`
  - `widgets/project-grid/ui/project-card.tsx` (mount the right variant per viewer state)
  - `widgets/project-grid/api/fetch-projects.ts` (include `viewer_has_voted` flag by joining to votes for the current `auth.uid()`)
- **Acceptance**:
  - [ ] Card has 3 votes, viewer has not voted, viewer is signed in + not the owner → pressing upvote → vote count becomes 4 and button shows "upvoted" state
  - [ ] Card has 4 votes, viewer already voted → pressing upvote → vote count becomes 3 and button returns to default state
  - [ ] Viewer is the owner → upvote button is not rendered
  - [ ] Unauthenticated viewer → vote count visible; the upvote slot is replaced with a "Sign in to vote" prompt
  - [ ] Direct server-action insert where `user_id = project.user_id` is rejected by the trigger (defence-in-depth test)
- **Verification**:
  - `bun run test:unit -- features/toggle-vote widgets/project-grid`
  - `bun run build`

---

### Task 12: End-to-end happy-path spec

- **Covers**: Scenarios 1, 3, 5, 6 (integration across the stack)
- **Size**: S
- **Dependencies**: Tasks 5–11
- **References**:
  - `browser-testing-with-devtools`
  - `e2e/helpers/*` (existing Supabase + mailpit helpers)
- **Implementation targets**:
  - `e2e/micro-hunt.spec.ts` — sign in two cohort-A students, student A submits a project with a real screenshot, student B upvotes, student A edits and then deletes; grid reflects each step
- **Acceptance**:
  - [ ] Playwright run passes locally against `supabase start`
  - [ ] Screenshots/artifacts generated on failure
- **Verification**:
  - `bun run test:e2e`

---

### Checkpoint: After Task 12
- [ ] `bun run test` green (unit + db)
- [ ] `bun run test:e2e` green
- [ ] `bun run build` succeeds
- [ ] Full flow verifiable by a human at `/` locally

---

## Undecided Items
- None. Cohort seed names ("Cohort A", "Cohort B") are placeholders — adjust in the seed migration if the course wants real cohort labels.
