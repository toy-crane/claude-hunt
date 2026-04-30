# improve-project-detail-page Implementation Plan

## Architecture Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Multi-image storage | `projects.images` JSONB array (`[{"path":"…"}]`); `images[0]` is canonical primary | Atomic reorder via single UPDATE; ≤5 images so no normalization gain; existing `screenshot_path` migrates to `images[0]`. |
| `screenshot_path` column | Drop after backfill; view exposes `primary_image_path` derived from `images[0]->>'path'` | Single source of truth. View rename clarifies semantics for board callers. |
| Comment threading | Single `comments` table with self-referencing `parent_comment_id`; depth=1 enforced by CHECK (parent's parent must be NULL) | Standard threaded-comment model. Hard-cap at depth 1 prevents accidental nesting. |
| Reaction storage | Dedicated `comment_reactions` table; `emoji` text column with CHECK in `('👍','💡','🎉','❤️')`; UNIQUE `(comment_id, user_id, emoji)` | Lets each user have at most one of each emoji per comment; toggle = INSERT-or-DELETE. |
| Submit/Edit UX | Both become pages: `/projects/new` and `/projects/[id]/edit` (no longer dialogs) | User decision in wireframe phase. Page route enables redirect-on-success to `/projects/[id]`. |
| Detail-page action row | Pattern A: vote pill + "Visit project" primary button on one row (natural width, left-aligned); GitHub as a small text link below — only when `github_url` is set | Single primary CTA, conditional secondary doesn't shift layout. |
| Reaction UI | Slack/Reddit-style: only emojis with count ≥ 1 render as chips; a `[😊+]` trigger opens a popover with the 4 fixed emojis | Avoids placeholder-clutter; progressive disclosure. |
| File upload | `@reui/use-file-upload` hook for selection/drag-drop/validation; `@reui/sortable` (Sortable + SortableItem + SortableItemHandle, `layout="grid"`) for reorder | Wireframe layout (1 primary + 4 thumb slots) is preserved; hook+sortable provide tested mechanics. dnd-kit is the most-used React DnD lib. |
| Owner-only controls on detail | Two icon buttons (pencil = Edit link, trash = Delete confirm) at top-right of hero, mirroring the wireframe | Wireframe-decided (Screen 1, user-accepted). Matches the existing board-card owner action pair. |
| Comment edit/delete | Author-only via `dropdown-menu` on each own comment; `updated_at != created_at` derives the "수정됨" tag | Uses existing column; no extra `edited_at` field. |
| Comment ordering | Top-level: newest first (`created_at desc`). Replies under a parent: oldest first (`created_at asc`) | Mirrors common conventions (HN, GitHub). |
| OG image | Next.js conventional `app/projects/[id]/opengraph-image.tsx` rendering primary image + title + tagline + cohort | Built-in Next.js convention; no extra build step. |

## Infrastructure Resources

| Resource | Type | Declared in | Creation Task |
|----------|------|-------------|---------------|
| Existing screenshot bucket reused for additional images per user | Storage bucket | already declared | (existing — no change) |

No new buckets, env vars, cron jobs, or webhooks. The screenshot bucket's `<user_id>/...` RLS keys still apply because each project's images all live under the owner's prefix.

## Data Model

### Project (modify)
- `id` (existing)
- `user_id` → Profile (existing)
- `cohort_id` → Cohort (existing)
- `title`, `tagline`, `project_url`, `vote_count` (existing)
- `images` jsonb, default `'[]'`, length 1..5, each item shape `{ "path": "<storage path>" }`
- `github_url` text nullable, CHECK matches `^https://github\.com/[^/\s]+/[^/\s]+/?$`
- (drop) `screenshot_path` — replaced by `images[0]`
- `created_at`, `updated_at`

### Comment (new)
- `id` uuid
- `project_id` → Project (cascade delete)
- `user_id` → Profile (cascade delete)
- `parent_comment_id` → Comment (cascade delete), nullable
- `body` text, length 1..1000
- `created_at`, `updated_at` (when `created_at != updated_at`, the comment is "수정됨")

### CommentReaction (new)
- `id` uuid
- `comment_id` → Comment (cascade delete)
- `user_id` → Profile (cascade delete)
- `emoji` text, CHECK in `('👍','💡','🎉','❤️')`
- `created_at`, `updated_at`
- UNIQUE `(comment_id, user_id, emoji)` so one user has at most one of each emoji per comment

## Required Skills

| Skill | Applicable Task | Purpose |
|-------|-----------------|---------|
| `test-driven-development` | All tasks | RED → GREEN; one test per Acceptance bullet. |
| `incremental-implementation` | All tasks | Vertical-slice ordering, leaving system working at each step. |
| `supabase` | T1, T2, T3, T11, T13, T14 | Declarative schemas, `db diff`, pgTAP tests, dual-source storage rules. |
| `supabase-postgres-best-practices` | T1, T2, T3 | Index choice, RLS phrasing, CHECK constraints, view security_invoker semantics. |
| `shadcn` | T6, T7, T8, T10, T12, T13, T14 | Use existing components first (`Avatar`, `Empty`, `DropdownMenu`, `HoverCard`, `Sonner`); install `Popover` and `Separator` from `@shadcn` registry; install `@reui/use-file-upload` and `@reui/sortable`. Do not modify `shared/ui/*` source. |
| `next-best-practices` | T4, T5, T6, T9, T10, T15 | App Router conventions: dynamic routes, server components, `generateMetadata`, `opengraph-image.tsx`, `notFound()`, `revalidatePath`. |
| `nextjs` | T9, T15 | `next/image` `remotePatterns` for Supabase storage host, OG image export. |
| `vercel-react-best-practices` | T7, T9, T11, T12, T14 | Async parallelization on the detail page (`Promise.all` for project + comments + viewer + reactions); `useOptimistic` for vote/reaction toggle; `useTransition` for comment submit. |
| `frontend-ui-engineering` | T7, T9, T13, T14 | Component composition, accessibility, loading/error states. |
| `fsd` | All UI tasks | Slice placement, public API barrels, no cross-slice imports. |
| `code-review-and-quality` | Final checkpoint | Pre-merge review across correctness/readability/security/perf. |
| `security-and-hardening` | T1, T11, T13, T14 | RLS guards, input validation, CSRF for server actions. |
| `documentation-and-adrs` | Final checkpoint | Append decision log to `artifacts/improve-project-detail-page/decisions.md`. |

## Affected Files

| File Path | Change Type | Related Task |
|-----------|-------------|--------------|
| `supabase/schemas/projects.sql` | Modify | T1 |
| `supabase/schemas/projects_with_vote_count.sql` | Modify | T1 |
| `supabase/schemas/comments.sql` | New | T2 |
| `supabase/schemas/comment_reactions.sql` | New | T3 |
| `supabase/migrations/<ts>_projects_multi_image_github.sql` | New (generated by `db diff` + manual backfill) | T1 |
| `supabase/migrations/<ts>_comments.sql` | New | T2 |
| `supabase/migrations/<ts>_comment_reactions.sql` | New | T3 |
| `supabase/tests/projects_images_test.sql` | New | T1 |
| `supabase/tests/comments_test.sql` | New | T2 |
| `supabase/tests/comment_reactions_test.sql` | New | T3 |
| `entities/project/model/schema.ts` | Modify (add `ProjectImage`, update `Project`) | T1 |
| `entities/project/model/constants.ts` | Modify (add `MAX_PROJECT_IMAGES = 5`, GitHub regex) | T1, T7, T8 |
| `entities/project/index.ts` | Modify (re-export new types) | T1 |
| `entities/comment/model/schema.ts` | New | T2 |
| `entities/comment/model/constants.ts` | New (`MAX_COMMENT_BODY = 1000`) | T2 |
| `entities/comment/index.ts` | New | T2 |
| `entities/reaction/model/schema.ts` | New (with `REACTION_EMOJI` const) | T3 |
| `entities/reaction/index.ts` | New | T3 |
| `widgets/project-grid/api/queries.ts` (or equivalent) | Modify (rename `screenshot_path` → `primary_image_path`) | T4 |
| `widgets/project-grid/ui/project-card.tsx` (+ test) | Modify (Link to `/projects/[id]`; drop external `<a target=_blank>`; rename field) | T5 |
| `widgets/project-detail/api/queries.ts` | New | T4, T9 |
| `widgets/project-detail/ui/hero.tsx` (+ test) | New (title, tagline, meta, action row) | T4 |
| `widgets/project-detail/ui/image-gallery.tsx` (+ test) | New | T9 |
| `widgets/project-detail/ui/owner-controls.tsx` (+ test) | New (two icon buttons: pencil → `/projects/[id]/edit`, trash → confirm + delete) | T10 |
| `widgets/project-detail/index.ts` | New | T4 |
| `widgets/comment-list/ui/comment-list.tsx` (+ test) | New | T11, T12 |
| `widgets/comment-list/ui/comment-item.tsx` (+ test) | New (own-vs-other variants, "수정됨", reactions row) | T11, T13, T14 |
| `widgets/comment-list/ui/reply-thread.tsx` (+ test) | New (1-depth nest, no reply-to-reply) | T12 |
| `widgets/comment-list/api/queries.ts` | New | T11 |
| `widgets/comment-list/index.ts` | New | T11 |
| `features/submit-project/api/actions.ts` | Modify (accept `imagePaths[]` + `githubUrl?`; redirect to `/projects/[id]` via returned id) | T6, T7, T8 |
| `features/submit-project/api/schema.ts` | Modify (`screenshotPaths: string[].min(1).max(5)`, optional `githubUrl`) | T7, T8 |
| `features/submit-project/ui/submit-form.tsx` (+ test) | Modify (multi-image slots, GitHub field, page-style buttons) | T6, T7, T8 |
| `features/submit-project/ui/submit-dialog.tsx` (+ test) | Delete | T6 |
| `features/edit-project/api/actions.ts` | Modify (multi-image diff, github_url) | T10 |
| `features/edit-project/api/schema.ts` | Modify | T10 |
| `features/edit-project/ui/edit-form.tsx` (+ test) | New (replaces dialog) | T10 |
| `features/edit-project/ui/edit-dialog.tsx` (+ test) | Delete | T10 |
| `features/delete-project/api/actions.ts` | Modify (best-effort delete all paths in `images[]`) | T10 |
| `features/upload-project-images/ui/image-slots.tsx` (+ test) | New (composes `useFileUpload` + `Sortable` + fixed-slot UI) | T7 |
| `features/upload-project-images/index.ts` | New | T7 |
| `features/leave-comment/api/actions.ts` | New | T11, T12 |
| `features/leave-comment/api/schema.ts` | New | T11 |
| `features/leave-comment/ui/comment-form.tsx` (+ test) | New (1000 char counter, anon prompt) | T11, T12 |
| `features/leave-comment/index.ts` | New | T11 |
| `features/edit-comment/api/actions.ts` (+ test) | New | T13 |
| `features/edit-comment/ui/edit-comment-inline.tsx` (+ test) | New | T13 |
| `features/edit-comment/index.ts` | New | T13 |
| `features/delete-comment/api/actions.ts` (+ test) | New | T13 |
| `features/delete-comment/index.ts` | New | T13 |
| `features/toggle-reaction/api/actions.ts` (+ test) | New | T14 |
| `features/toggle-reaction/ui/reaction-row.tsx` (+ test) | New (chips + popover) | T14 |
| `features/toggle-reaction/index.ts` | New | T14 |
| `app/projects/new/page.tsx` (+ test in `__tests__/`) | New | T6 |
| `app/projects/[id]/page.tsx` (+ test in `__tests__/`) | New (T4) → Modify (T11: parallel comments fetch + `<CommentList />`; T15: `generateMetadata`) | T4, T11, T15 |
| `app/projects/[id]/edit/page.tsx` (+ test in `__tests__/`) | New | T10 |
| `app/projects/[id]/opengraph-image.tsx` | New | T15 |
| `app/page.tsx` | Modify (rename `screenshot_path` if exposed; small touch) | T1 |
| `app/_components/project-board.tsx` | Modify (drop EditDialog/DeleteButton owner action props — moved to detail) | T5, T10 |
| `widgets/header/ui/header.tsx` (or wherever Submit lives) | Modify ("프로젝트 제출" → `<Link href="/projects/new">`) | T6 |
| `shared/lib/screenshot-upload.ts` | Modify (export `uploadProjectImage` that returns `{ path }`; loop callers handle multi) | T7 |
| `shared/ui/popover.tsx` | New (via `npx shadcn@latest add @shadcn/popover`) | T14 |
| `shared/ui/separator.tsx` | New (via `npx shadcn@latest add @shadcn/separator`) | T9 |
| `shared/lib/use-file-upload.ts` | New (via `npx shadcn@latest add @reui/use-file-upload`) | T7 |
| `shared/ui/sortable.tsx` | New (via `npx shadcn@latest add @reui/sortable`) | T7 |
| `next.config.mjs` | Verify `remotePatterns` includes Supabase storage host | T9 |
| `e2e/project-detail.spec.ts` | New | T16 |

Change Type: New | Modify | Delete

## Tasks

### Task 1: Migrate `projects` to multi-image (JSONB) + `github_url`

- **Covers**: Scenario 2 (partial — schema only); Scenario 1 (partial — primary image surfacing); Scenario 5 (partial — primary image as OG source)
- **Size**: M (3-5 files)
- **Dependencies**: None
- **References**:
  - skill `supabase` — `db diff`, dual-source rules, schemas/, manual migration for DML/backfill
  - skill `supabase-postgres-best-practices` — JSONB CHECK on length, view security_invoker
  - rule `.claude/rules/supabase-migration.md` — declarative path, post-diff checks
  - rule `.claude/rules/supabase-timestamps.md` — moddatetime triggers
  - file `supabase/schemas/projects_with_vote_count.sql` — current view shape
- **Implementation targets**:
  - `supabase/schemas/projects.sql` — add `images jsonb not null default '[]'` (no length CHECK yet — added in T7 after the action writes images); add `github_url text null check (github_url ~ '^https://github\.com/[^/\s]+/[^/\s]+/?$')`. Keep `screenshot_path` `not null` and unchanged so existing `submitProject`/`editProject` actions continue working until T7 migrates them.
  - `supabase/schemas/projects_with_vote_count.sql` — add `primary_image_path` derived as `coalesce(images->0->>'path', screenshot_path)` (so the view returns the right value during the transition); also project `github_url`. Keep `screenshot_path` projected for one cycle.
  - `supabase/migrations/<ts>_projects_multi_image_github.sql` — generated by `db diff`; review per checklist
  - `supabase/migrations/<ts>_backfill_project_images.sql` — manual: `UPDATE public.projects SET images = jsonb_build_array(jsonb_build_object('path', screenshot_path)) WHERE jsonb_array_length(images) = 0 AND screenshot_path IS NOT NULL;` (one-time DML — `screenshot_path` stays for now)
  - `entities/project/model/schema.ts` + `model/constants.ts` + `index.ts` — add `ProjectImage = { path: string }`, `images: ProjectImage[]`, `MAX_PROJECT_IMAGES = 5`, `GITHUB_URL_PATTERN`
  - `supabase/tests/projects_images_test.sql` — pgTAP
- **Acceptance**:
  - [ ] After `supabase db reset`, every existing `screenshot_path` value also appears as `images[0].path` for the same row (backfill DML ran)
  - [ ] `images` column accepts `'[]'` at this point (the 1..5 length CHECK lands in T7)
  - [ ] `select primary_image_path from projects_with_vote_count where id = …` returns the right value: `images[0].path` if present, otherwise `screenshot_path`
  - [ ] `update projects set github_url = 'https://example.com'` is rejected by the CHECK; `'https://github.com/octocat/hello'` is accepted
  - [ ] Existing single-screenshot writes (current `submitProject` / `editProject`) still succeed (both columns still readable/writable)
- **Verification**:
  - `bunx supabase db reset` then `bun run test:db` — pgTAP asserts column shape, backfill, CHECK rejections, view projection
  - `bunx supabase db diff -f noop` — must produce zero output (drift = 0)

---

### Task 2: Add `comments` table + RLS + CHECK depth-1

- **Covers**: Scenario 3 (partial — schema only); Scenario 4 (partial — ownership constraint)
- **Size**: M
- **Dependencies**: T1 (so the foreign-key references the now-current Project shape)
- **References**:
  - skill `supabase`, `supabase-postgres-best-practices`
  - file `supabase/schemas/votes.sql` — RLS pattern (anyone read, owner-only write)
- **Implementation targets**:
  - `supabase/schemas/comments.sql` — `id, project_id fk cascade, user_id fk cascade, parent_comment_id fk cascade null, body text 1..1000, created_at, updated_at`. RLS: anon+authenticated SELECT; INSERT only when `auth.uid() = user_id`; UPDATE / DELETE only when `auth.uid() = user_id`. CHECK trigger on INSERT: if `parent_comment_id is not null`, the parent's `parent_comment_id` MUST be NULL (depth ≤ 1). **`handle_updated_at` trigger calling `extensions.moddatetime(updated_at)` per `.claude/rules/supabase-timestamps.md`** — required so T13's "수정됨" indicator can derive from `updated_at != created_at`.
  - `supabase/migrations/<ts>_comments.sql` — generated
  - `entities/comment/model/schema.ts` + `model/constants.ts` + `index.ts`
  - `supabase/tests/comments_test.sql` — pgTAP
- **Acceptance**:
  - [ ] Authenticated user can INSERT a top-level comment (`parent_comment_id is null`); RLS allows it
  - [ ] Authenticated user can INSERT a reply (`parent_comment_id` set to a top-level comment); RLS allows it
  - [ ] INSERT with `parent_comment_id` pointing to an existing reply is rejected by the depth-1 trigger
  - [ ] User A cannot UPDATE or DELETE User B's comment (RLS denies)
  - [ ] Deleting a project cascades — the project's comments and replies disappear
  - [ ] Deleting a top-level comment cascades — its replies disappear
  - [ ] Anon SELECT returns all comments + replies for a project
  - [ ] Updating a comment's body advances `updated_at` past `created_at` (moddatetime trigger fires)
- **Verification**:
  - `bun run test:db`
  - `bunx supabase db diff -f noop` — zero output

---

### Task 3: Add `comment_reactions` table + RLS + emoji CHECK

- **Covers**: Scenario 3 (partial — schema only)
- **Size**: S
- **Dependencies**: T2
- **References**:
  - skill `supabase`, `supabase-postgres-best-practices`
- **Implementation targets**:
  - `supabase/schemas/comment_reactions.sql` — `id, comment_id fk cascade, user_id fk cascade, emoji text check in ('👍','💡','🎉','❤️'), created_at, updated_at`, UNIQUE `(comment_id, user_id, emoji)`. RLS: anon+authenticated SELECT, INSERT/DELETE own. **`handle_updated_at` trigger calling `extensions.moddatetime(updated_at)` per `.claude/rules/supabase-timestamps.md`** — required for the timestamp invariant even if reactions are typically toggle-only.
  - `supabase/migrations/<ts>_comment_reactions.sql` — generated
  - `entities/reaction/model/schema.ts` (with `REACTION_EMOJI = ['👍','💡','🎉','❤️'] as const`) + `index.ts`
  - `supabase/tests/comment_reactions_test.sql` — pgTAP
- **Acceptance**:
  - [ ] INSERT with `emoji='🐶'` is rejected by the CHECK
  - [ ] Two INSERTs with same `(comment_id, user_id, emoji)` — second is rejected by UNIQUE
  - [ ] Two INSERTs with same `(comment_id, user_id)` but different `emoji` both succeed
  - [ ] Anon SELECT returns reactions
  - [ ] Deleting a comment cascades — its reactions disappear
- **Verification**:
  - `bun run test:db`
  - `bunx supabase db diff -f noop` — zero output

---

### Checkpoint: After Tasks 1-3 (schema foundation)
- [ ] `bun run test` (Vitest + pgTAP)
- [ ] `bun run build` succeeds
- [ ] `supabase db diff` reports no drift
- [ ] App still loads (board page unchanged at this point)

---

### Task 4: `/projects/[id]` route — read-only display

- **Covers**: Scenario 1 (full happy path); Scenario 5 (partial — page must exist before OG can target it)
- **Size**: M
- **Dependencies**: T1
- **References**:
  - skill `next-best-practices` — App Router dynamic routes, `notFound()`, server-side data fetch, `Promise.all`
  - skill `vercel-react-best-practices` — async-parallel rule
  - skill `shadcn` — `HoverCard` already installed; reuse `Avatar`, `Empty`
  - file `widgets/project-grid/api/...` — existing data layer to mirror
  - wireframe Screen 1 — layout reference
- **Implementation targets**:
  - `widgets/project-detail/api/queries.ts` — `fetchProjectDetail(id, viewerUserId)` returning the project row (incl. images, github_url, cohort label, author, vote count, viewer's vote)
  - `widgets/project-detail/ui/hero.tsx` — title + tagline + meta line + action row (Pattern A); reuses existing `VoteButton` from `@features/toggle-vote`
  - `widgets/project-detail/index.ts` — barrel
  - `app/projects/[id]/page.tsx` — RSC, parallel fetch viewer + project, `notFound()` if missing
  - `app/projects/[id]/__tests__/page.test.tsx`
  - `widgets/project-detail/ui/hero.test.tsx`
- **Acceptance**:
  - [ ] Visiting `/projects/<existing id>` returns 200 and renders title="My App", full tagline (no truncation), cohort="LGE-1", author display name, submitted-at, current vote count
  - [ ] Visiting `/projects/<unknown id>` returns 404
  - [ ] Anonymous visitor sees the same project content as a signed-in visitor (same DOM)
  - [ ] "Visit project" button has `target="_blank"` and `rel="noopener noreferrer"`, `href` equals `project_url`
  - [ ] When `github_url` is null, no GitHub link renders
  - [ ] When `github_url` is set, a "GitHub 저장소 보기" link renders with `target="_blank"`
  - [ ] The project's owner sees the vote count but the vote button is disabled (self-vote prevented; mirrors the board behavior — spec invariant)
- **Verification**:
  - `bun run test:unit -- project-detail` — DOM assertions for hero composition (mocked data)
  - `bun run build`
  - Browser MCP — navigate to `/projects/<seeded id>`, take a screenshot, save to `artifacts/improve-project-detail-page/evidence/t4.png`

---

### Task 5: Board card click → `/projects/[id]` (replace external link)

- **Covers**: Scenario 1 (full — entry path)
- **Size**: S (1-2 files)
- **Dependencies**: T4
- **References**:
  - file `widgets/project-grid/ui/project-card.tsx` — current external `<a target=_blank href=projectUrl>` on three places (desktop image+title, mobile image+title)
  - skill `next-best-practices` — `<Link>` over `<a>`
- **Implementation targets**:
  - `widgets/project-grid/ui/project-card.tsx` — replace external anchors with `<Link href={"/projects/"+id}>`; rename `screenshot_path` reads to `primary_image_path` everywhere; HoverCard preview behavior unchanged
  - `widgets/project-grid/ui/project-card.test.tsx` — update assertions
- **Acceptance**:
  - [ ] Clicking a card's thumbnail, title, or row body navigates to `/projects/<id>` (internal route, no new tab, no `target="_blank"`)
  - [ ] HoverCard preview popover still appears on desktop hover
  - [ ] Board still renders the primary image as the thumbnail
- **Verification**:
  - `bun run test:unit -- project-card`
  - `bun run test:e2e` — existing `e2e/project-board.spec.ts` smoke must still pass
  - Browser MCP — navigate to `/`, click a card, confirm URL change to `/projects/<id>`; save screenshot

---

### Checkpoint: After Tasks 4-5 (detail page reachable)
- [ ] `bun run test`
- [ ] `bun run build`
- [ ] Vertical slice: visitor lands on `/`, clicks a project card, lands on `/projects/[id]`, sees full content, clicks "Visit project" → external site opens in new tab

---

### Task 6: Submit page — convert dialog to `/projects/new` (single image baseline)

- **Covers**: Scenario 2 (partial — page-shape only; multi-image lands in T7)
- **Size**: M
- **Dependencies**: T4 (so server action's redirect target exists)
- **References**:
  - skill `next-best-practices` — `redirect()`, server action returning to client, auth-gated routes
  - skill `shadcn` — `Field`/`FieldGroup` rules; `Button` composition
  - file `features/submit-project/ui/submit-dialog.tsx` — current dialog wrapper to remove
  - wireframe Screen 0
- **Implementation targets**:
  - `app/projects/new/page.tsx` — RSC, requires auth (redirect to `/login` otherwise); renders `SubmitForm`
  - `app/projects/new/__tests__/page.test.tsx`
  - `features/submit-project/ui/submit-form.tsx` — page layout (header + back link + Cancel/Submit row); on success calls `router.push("/projects/" + projectId)` (action already returns it)
  - `features/submit-project/ui/submit-form.test.tsx` — update for new layout + redirect call
  - `features/submit-project/ui/submit-dialog.tsx` — **deleted**
  - `widgets/header/...` — Submit button becomes `<Link href="/projects/new">`
  - `app/_components/project-board.tsx` — remove `<SubmitDialog />` wiring; the entry point is now in the header
- **Acceptance**:
  - [ ] Authenticated visitor clicking "프로젝트 제출" navigates to `/projects/new`
  - [ ] Anonymous visitor visiting `/projects/new` is redirected to `/login`
  - [ ] After successful submit, browser navigates to `/projects/<new id>`
  - [ ] Cancel link returns to `/`
  - [ ] No `<SubmitDialog />` element exists on the board page
- **Verification**:
  - `bun run test:unit -- submit`
  - `bun run build`
  - Browser MCP — sign in, click Submit, verify URL is `/projects/new`; submit a seed project, verify redirect to `/projects/<id>`

---

### Task 7: Multi-image upload component (1 required + 4 optional, drag reorder)

- **Covers**: Scenario 2 (full — multi-image rules)
- **Size**: M
- **Dependencies**: T6
- **References**:
  - skill `shadcn` — install `@reui/use-file-upload`, `@reui/sortable`; rule "do not modify shared/ui/* source"; rewrite imports to `@shared/lib/utils` if CLI leaves `@/lib/utils`
  - file `components.json` — `@reui` alias already registered
  - external — reui Sortable Upload reference (composition pattern only)
  - wireframe Screen 0 (image slot grid)
- **Implementation targets**:
  - Run `bunx --bun shadcn@latest add @reui/use-file-upload @reui/sortable` (also adds `popover` later in T14)
  - `features/upload-project-images/ui/image-slots.tsx` — composes `useFileUpload({maxFiles:5, accept:'image/*', multiple:true, maxSize:25*1024*1024})` + `<Sortable layout="grid" value={images} onValueChange={…} getItemValue={(i)=>i.id}>`. Layout: 1 primary slot (16:10) + 4 thumb slots in a row, fixed visually. `images[0]` always renders in primary slot. Empty trailing slots show `+ 추가` placeholder (clicks `openFileDialog`). Each filled slot has × remove and is wrapped in `<SortableItem>` with `<SortableItemHandle>`. Drag reorder mutates the array; remove + 1번 자동 승격 = filtering + slicing.
  - `features/upload-project-images/index.ts`
  - `features/upload-project-images/ui/image-slots.test.tsx` — drag reorder, remove → primary auto-promotion, max-5 rejection
  - `features/submit-project/api/schema.ts` — replace `screenshotPath: string` with `imagePaths: string[].min(1).max(5)`
  - `features/submit-project/api/actions.ts` — insert `images = imagePaths.map(p => ({path: p}))`; stop writing `screenshot_path`
  - `features/submit-project/ui/submit-form.tsx` — replace single file input with `<ImageSlots />`; upload each image client-side via `uploadProjectImage` then send paths array to action
  - `shared/lib/screenshot-upload.ts` — extract per-file `uploadProjectImage(file)` returning `{ path }`; preserve existing single-file API for backward compat in T6
  - **`supabase/schemas/projects.sql` — add `check (jsonb_array_length(images) between 1 and 5)`; drop `screenshot_path` column.** All callers now read/write `images`.
  - **`supabase/schemas/projects_with_vote_count.sql` — drop the `coalesce(...)` shim and the `screenshot_path` projection; `primary_image_path` becomes `images->0->>'path'`.**
  - `supabase/migrations/<ts>_drop_screenshot_path.sql` — generated by `db diff` once schemas are updated. Strip cross-schema noise per checklist.
  - Update `supabase/tests/projects_images_test.sql` to assert: `images = '[]'` is rejected; `images` with 6 entries is rejected; `screenshot_path` column no longer exists.
- **Acceptance**:
  - [ ] Submitting with only 1 image succeeds; the single image lands in `images[0]`
  - [ ] Selecting a 6th file shows the inline message "최대 5장까지 업로드할 수 있어요"; previously selected files are preserved
  - [ ] Dragging slot 3 onto slot 1 causes slot 3's image to become the new primary; visual primary slot shows the dragged image
  - [ ] Removing the primary image causes slot 2's image to auto-promote to primary
  - [ ] After submit, the database `images` array order matches the on-screen order
  - [ ] `supabase db diff` after schema changes lands cleanly; subsequent `noop` diff is empty
  - [ ] `screenshot_path` column no longer exists in `public.projects`; `images` length CHECK rejects 0 and 6
- **Verification**:
  - `bun run test:unit -- upload-project-images submit-form`
  - `bun run build`
  - Browser MCP — submit a project with 3 images, reorder them, confirm `/projects/<id>` shows them in the chosen order; save screenshot

---

### Task 8: GitHub URL field on submit + display CTA on detail

- **Covers**: Scenario 2 (full — github URL); Scenario 1 (full — conditional GitHub button)
- **Size**: S
- **Dependencies**: T7, T4
- **References**:
  - file `entities/project/model/constants.ts` — `GITHUB_URL_PATTERN`
- **Implementation targets**:
  - `features/submit-project/api/schema.ts` — `githubUrl: z.string().regex(GITHUB_URL_PATTERN, "GitHub 저장소 주소를 입력해주세요").optional()`
  - `features/submit-project/api/actions.ts` — pass `github_url`
  - `features/submit-project/ui/submit-form.tsx` — add Field for GitHub URL with `(선택)` label and helper text; inline error from server validation
  - `widgets/project-detail/ui/hero.tsx` — render `<Link>` to GitHub URL when present (already wired in T4 acceptance, but server query must now select the column)
  - `widgets/project-detail/api/queries.ts` — include `github_url` in projection
- **Acceptance**:
  - [ ] Submitting with GitHub URL `https://github.com/octocat/hello` succeeds; detail page shows "GitHub 저장소 보기" link
  - [ ] Submitting with GitHub URL `https://example.com/foo` shows "GitHub 저장소 주소를 입력해주세요" inline; previously entered fields are preserved
  - [ ] Submitting with GitHub URL empty succeeds; detail page shows no GitHub link
- **Verification**:
  - `bun run test:unit -- submit-form project-detail`
  - `bun run build`
  - Browser MCP — submit two projects (one with valid GitHub URL, one without), confirm conditional rendering; save screenshot

---

### Checkpoint: After Tasks 6-8 (full submit flow)
- [ ] `bun run test`
- [ ] `bun run build`
- [ ] Vertical slice: signed-in visitor goes through `/projects/new`, uploads 3 images + GitHub URL, lands on `/projects/[id]` showing the full data

---

### Task 9: Image gallery on detail page (browse all images)

- **Covers**: Scenario 1 (full — gallery); Scenario 2 (full — order surfaced)
- **Size**: M
- **Dependencies**: T4, T7
- **References**:
  - skill `nextjs` — `<Image>`, `remotePatterns` for Supabase storage host
  - skill `shadcn` — install `@shadcn/separator` if needed; `HoverCard` for thumbnail preview already used on board
  - wireframe Screen 1 (gallery section)
- **Implementation targets**:
  - `widgets/project-detail/ui/image-gallery.tsx` — primary 16:10 + thumb strip below + arrows; thumb click and arrows swap which image is in the primary slot. Arrows wrap around in both directions. Strip hidden when only 1 image. **Clicking the primary image does nothing** (no lightbox — explicitly excluded for v1).
  - `widgets/project-detail/ui/image-gallery.test.tsx`
  - `next.config.mjs` — verify Supabase storage host is in `remotePatterns`
- **Acceptance**:
  - [ ] A project with 3 images renders the primary image first; clicking thumbnail #2 swaps it into the primary slot
  - [ ] Right arrow advances to image #2 then #3; pressing right again wraps to image #1. Left arrow on image #1 wraps to the last image. Wrap-around in both directions
  - [ ] A project with 1 image renders only the primary slot (no thumb strip, no arrows)
  - [ ] Each image is rendered through `next/image` with the resolved Supabase signed/public URL
- **Verification**:
  - `bun run test:unit -- image-gallery`
  - `bun run build`
  - Browser MCP — navigate to a 3-image detail page, click each thumbnail, screenshot each state to `evidence/t9-{1,2,3}.png`

---

### Task 10: Edit page `/projects/[id]/edit` (multi-image + github_url)

- **Covers**: Scenario 4 (partial — owner-only access); Scenario 2 (partial — owner mutation path); detail page Edit/Delete affordances
- **Size**: M
- **Dependencies**: T4, T7, T8
- **References**:
  - skill `shadcn` — `DropdownMenu` for kebab; reuse same `<ImageSlots />`
  - file `features/edit-project/api/actions.ts` — current single-image edit; extend
- **Implementation targets**:
  - `app/projects/[id]/edit/page.tsx` — RSC; auth-required; loads existing project; renders `EditForm` prefilled. Forbid (404 or redirect) when viewer is not owner.
  - `app/projects/[id]/edit/__tests__/page.test.tsx`
  - `features/edit-project/ui/edit-form.tsx` (+ test) — same fields as submit including images and github_url; saves via `editProject`; on success redirects to `/projects/[id]`
  - `features/edit-project/ui/edit-dialog.tsx` — **deleted**
  - `features/edit-project/api/schema.ts` + `actions.ts` — accept `imagePaths: string[]` and `githubUrl?: string | null`. Server action diffs old paths vs. new and best-effort removes orphaned storage objects
  - `features/delete-project/api/actions.ts` — best-effort delete every path in `images[]` from the bucket; on success, server action redirects to `/`
  - `widgets/project-detail/ui/owner-controls.tsx` (+ test) — two icon buttons (pencil aria-label="편집" linking to `/projects/[id]/edit`, trash aria-label="삭제" opening a confirm dialog and calling `deleteProject`); only renders when viewer is owner; matches wireframe Screen 1
  - `widgets/project-grid/ui/project-card.tsx` — remove inline EditDialog/DeleteButton (owner controls now live on detail page only)
- **Acceptance**:
  - [ ] Owner navigates to `/projects/[id]`, clicks the pencil icon → lands on `/projects/[id]/edit` with all fields prefilled (title, tagline, project URL, GitHub URL, images in correct order)
  - [ ] Non-owner visiting `/projects/[id]/edit` directly receives a 404 (least info disclosure)
  - [ ] Saving a reordered images list updates `images` in the database in the new order; the detail page reflects it
  - [ ] After reordering and saving, the board card for this project renders the new first image as its thumbnail (verifies `primary_image_path` from the view)
  - [ ] Removing an image clears its storage object on save (best-effort — failures don't block save)
  - [ ] Owner clicks the trash icon → confirmation → on confirm, project is deleted, images are removed, browser navigates to `/`
- **Verification**:
  - `bun run test:unit -- edit-project owner-controls`
  - `bun run build`
  - Browser MCP — as project owner: edit → reorder → save → confirm new order on detail page; delete → confirm board no longer shows it; save screenshots

---

### Checkpoint: After Tasks 9-10 (full project lifecycle)
- [ ] `bun run test`
- [ ] `bun run build`
- [ ] Vertical slice: submit → view detail (gallery, GitHub link) → edit (reorder + remove) → delete

---

### Task 11: Top-level comments — post and read

- **Covers**: Scenario 3 (partial — top-level only); Scenario 4 (partial — author info on own comments)
- **Size**: M
- **Dependencies**: T2, T4
- **References**:
  - skill `shadcn` — `Empty` for the no-comments state; `Avatar`+`AvatarFallback`
  - skill `vercel-react-best-practices` — `useTransition` for submit; `Promise.all` between project + comments fetch
  - file `features/toggle-vote/api/actions.ts` — server action shape to mirror
  - wireframe Screen 2 (no replies, no reactions yet)
- **Implementation targets**:
  - `features/leave-comment/api/schema.ts` — `body: z.string().trim().min(1).max(1000)`, `projectId`, optional `parentCommentId` (used in T12)
  - `features/leave-comment/api/actions.ts` — server action; insert with `auth.uid()`; revalidatePath
  - `features/leave-comment/ui/comment-form.tsx` (+ test) — textarea + counter + 등록/취소; anon branch shows `Empty` with login link
  - `widgets/comment-list/api/queries.ts` — `fetchComments(projectId, viewerUserId)` returning all comments for the project, ordered top-level newest-first; replies grouped under each parent
  - `widgets/comment-list/ui/comment-list.tsx` (+ test) — section header "댓글 N" + `<CommentForm />` + iterate comments
  - `widgets/comment-list/ui/comment-item.tsx` (+ test) — avatar, name, time, body
  - `app/projects/[id]/page.tsx` — fetch comments in parallel with project + viewer; render `<CommentList />` below hero/gallery
- **Acceptance**:
  - [ ] Authenticated visitor types "정말 잘 만드셨네요!" and clicks 등록 — the comment appears at the top of the list with the author's display name, avatar, and a relative timestamp; the form clears
  - [ ] Submitting an empty comment keeps the form open with no DB write
  - [ ] Submitting a 1001-character body shows "1000자까지 작성할 수 있어요" inline; the typed text is preserved
  - [ ] Anonymous visitor sees the comment list but the form is replaced with a `Empty` containing a login link
- **Verification**:
  - `bun run test:unit -- leave-comment comment-list`
  - `bun run build`
  - Browser MCP — as authenticated user, post a comment, refresh, confirm persistence; sign out, confirm form replaced with login prompt

---

### Task 12: Replies (1 depth, no reply-to-reply)

- **Covers**: Scenario 3 (full — reply nesting)
- **Size**: M
- **Dependencies**: T11
- **References**:
  - file `features/leave-comment/api/actions.ts` — extend with `parentCommentId`
  - DB depth-1 trigger from T2 enforces server-side
  - wireframe Screen 2
- **Implementation targets**:
  - `features/leave-comment/ui/comment-form.tsx` — accept `parentCommentId?` prop; smaller variant when used as reply form
  - `widgets/comment-list/ui/reply-thread.tsx` (+ test) — renders replies under a parent in oldest-first order; left border + indent; replies render `<CommentItem />` without the "답글하기" button
  - `widgets/comment-list/ui/comment-item.tsx` — add "답글하기" inline link → expands an inline reply form below the comment
- **Acceptance**:
  - [ ] Clicking "답글하기" on a top-level comment expands a reply form below it
  - [ ] Submitting a reply shows it nested under the parent in oldest-first order
  - [ ] Replies render no "답글하기" button
  - [ ] The author of a top-level comment can reply to their own comment (spec SC 3.6 — self-reply allowed)
  - [ ] Attempting to reply to a reply via crafted request is rejected by the server (depth-1 trigger)
- **Verification**:
  - `bun run test:unit -- reply-thread leave-comment`
  - `bun run test:db` — pgTAP from T2 still asserts depth rejection
  - Browser MCP — post a top-level comment, reply to it, verify nesting + absence of reply button on the reply

---

### Task 13: Edit / delete own comment + "수정됨" indicator

- **Covers**: Scenario 4 (full)
- **Size**: M
- **Dependencies**: T11, T12
- **References**:
  - skill `shadcn` — `DropdownMenu` for kebab
  - DB ownership RLS from T2
- **Implementation targets**:
  - `features/edit-comment/api/actions.ts` (+ test) — server action; updates `body` only when `auth.uid() = user_id` (RLS)
  - `features/edit-comment/ui/edit-comment-inline.tsx` (+ test) — replaces the comment body with a textarea inline; 저장/취소 buttons
  - `features/delete-comment/api/actions.ts` (+ test) — server action; cascades to replies + reactions via FKs
  - `widgets/comment-list/ui/comment-item.tsx` — kebab menu (`DropdownMenu`) on own comments only with "편집"/"삭제(확인)"; show "수정됨" tag when `updated_at != created_at`
- **Acceptance**:
  - [ ] Author of a comment sees the kebab menu on that comment; comments by other visitors show no kebab
  - [ ] Editing the body and saving updates the visible body and shows "수정됨"
  - [ ] Deleting a comment removes it and any replies + reactions from the page
  - [ ] A non-author calling edit/delete via crafted request receives a server error (RLS rejects)
  - [ ] The project owner sees no kebab on other visitors' comments on their project
- **Verification**:
  - `bun run test:unit -- edit-comment delete-comment comment-item`
  - `bun run test:db` — RLS pgTAP from T2 covers ownership rejection
  - Browser MCP — edit own comment, confirm "수정됨" appears; delete a comment, confirm replies disappear

---

### Task 14: Reactions on comments (popover + chip toggle)

- **Covers**: Scenario 3 (full — reactions)
- **Size**: M
- **Dependencies**: T3, T11
- **References**:
  - skill `shadcn` — install `@shadcn/popover`; `useTransition` + optimistic update for snappy toggling
  - skill `vercel-react-best-practices` — `useOptimistic`
  - wireframe Screen 2 (reaction row variant)
- **Implementation targets**:
  - `bunx --bun shadcn@latest add @shadcn/popover`
  - `features/toggle-reaction/api/schema.ts`
  - `features/toggle-reaction/api/actions.ts` (+ test) — `toggleReaction({commentId, emoji})`: if exists, DELETE; else INSERT (RLS owns the auth check)
  - `features/toggle-reaction/ui/reaction-row.tsx` (+ test) — given `reactions[]` and `viewerReactions[]`, render only chips with count ≥ 1; "+" trigger opens `Popover` with the 4 emojis; clicking an emoji calls the action with optimistic state
  - `widgets/comment-list/ui/comment-item.tsx` — render `<ReactionRow />` for both comments and replies
  - `widgets/comment-list/api/queries.ts` — include `reactions` aggregated per comment (group by emoji with count + viewer flag)
- **Acceptance**:
  - [ ] On a comment with no reactions, only the `[😊+]` trigger renders
  - [ ] Clicking the trigger opens a popover containing exactly four buttons: 👍 💡 🎉 ❤️
  - [ ] Tapping 💡 closes the popover; a `💡 1` chip appears; the chip styling indicates the viewer's own reaction
  - [ ] Tapping 💡 again removes the chip and the count returns to 0
  - [ ] Two different visitors each tapping 💡 results in `💡 2` for both viewers
  - [ ] The author of a comment can react to their own comment with any of the 4 emojis (spec SC 3.6 — self-reaction allowed)
  - [ ] An anonymous visitor clicking the `[😊+]` trigger or any existing reaction chip is redirected to `/login`. After login, the user lands back on the project detail page
  - [ ] Attempting to react to a comment using a non-allowlisted emoji via crafted request is rejected by the DB CHECK
- **Verification**:
  - `bun run test:unit -- toggle-reaction reaction-row`
  - `bun run test:db` — pgTAP from T3 covers CHECK + UNIQUE
  - Browser MCP — open a comment, react with each of the 4 emojis, verify counts; sign out, verify read-only

---

### Checkpoint: After Tasks 11-14 (comments complete)
- [ ] `bun run test`
- [ ] `bun run build`
- [ ] Vertical slice: visitor reads → posts comment → another reads, replies, reacts → original author edits/deletes

---

### Task 15: OG meta + opengraph-image route

- **Covers**: Scenario 5 (full)
- **Size**: S
- **Dependencies**: T4, T7
- **References**:
  - skill `nextjs` — `generateMetadata`, `app/.../opengraph-image.tsx`
  - external — Next.js opengraph-image conventions
- **Implementation targets**:
  - `app/projects/[id]/page.tsx` — add `generateMetadata({ params })` returning `{ title, description, openGraph: { title, description, url, images: [primaryImage] } }`
  - `app/projects/[id]/opengraph-image.tsx` — Next.js convention; renders 1200×630 with primary image, title, tagline, cohort label using `next/og`
  - `app/projects/[id]/__tests__/opengraph-image.test.tsx` — assert composition shape (image url, title text presence)
- **Acceptance**:
  - [ ] HTML response of `/projects/<id>` contains `<meta property="og:title" content="<title>">`, `<meta property="og:description" content="<tagline>">`, `<meta property="og:image" content="<absolute url>">`, `<meta property="og:url" content="<canonical url>">`
  - [ ] Reordering images so a different image becomes primary updates the `og:image` value on the next render
  - [ ] Editing the title or images does not change the canonical URL (`/projects/<id>` is stable)
- **Verification**:
  - `bun run test:unit -- opengraph-image`
  - `bun run build`
  - Browser MCP — fetch `/projects/<id>` HTML, grep og: tags; visit `/projects/<id>/opengraph-image`, save the rendered PNG to `evidence/t15-og.png`

---

### Task 16: E2E smoke — full lifecycle

- **Covers**: Cross-cutting smoke for Scenarios 1-5 (the journey, not individual unit assertions which T4-T15 already cover)
- **Size**: M
- **Dependencies**: All prior tasks
- **References**:
  - file `e2e/project-board.spec.ts` — existing two-actor-style example to mirror
  - skill `test-driven-development` — E2E as a single golden-path smoke
- **Implementation targets**:
  - `e2e/project-detail.spec.ts` — single signed-in actor: submit project with 2 images + GitHub URL → land on detail → leave a comment → reply to it → react with 💡 → edit own comment → confirm "수정됨" → delete the comment → delete the project
- **Acceptance**:
  - [ ] The full happy path completes end-to-end against a real Supabase instance with no console errors
  - [ ] The OG response of the detail page (one fetch from inside the test) has the expected `og:image` URL
- **Verification**:
  - `bun run test:e2e` — must be green; preconditions in `CLAUDE.md` (Supabase running, `.env.local`, Playwright Chromium installed)

---

### Final Checkpoint: After Task 16
- [ ] `bun run test` (full)
- [ ] `bun run test:e2e`
- [ ] `bun run build`
- [ ] Manual review of `/projects/<id>` on Mobile and Desktop (matches wireframe Screens 1 + 2)
- [ ] Append to `artifacts/improve-project-detail-page/decisions.md` any in-flight judgment calls
- [ ] `code-review-and-quality` skill run before merge

## Undecided Items

(none — all open questions resolved before implementation began)

## Resolved Items

- **Anonymous click on `[😊+]` or a reaction chip** — redirect to `/login`, return to detail page on success. (T14 acceptance updated.)
- **Image gallery arrow behavior** — wrap-around in both directions. (T9 acceptance updated.)
- **Lightbox on primary image click** — explicitly excluded from this feature. The gallery is in-place only; users who want a larger view click "Visit project" or zoom on their device.
