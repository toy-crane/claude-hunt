# remove-image Implementation Plan

## Context

Spec: `artifacts/remove-image/spec.md`.

Today, deleting a project removes its screenshot from storage (best-effort), but **replacing** the screenshot through the edit flow leaves the previous file orphaned in the `project-screenshots` bucket. Over time this produces unbounded orphan growth and quota/billing surprises. This plan closes that gap for the edit-replace path and extends test coverage so both lifecycles (replace, delete) are proven to remove the previous stored image while never failing the user-visible action. No UI, schema, or bucket config changes are needed.

## Architecture Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Where the new cleanup lives | `features/edit-project/api/actions.ts` (server action) | Mirrors the existing `delete-project` cleanup site; keeps storage side-effects next to the row write that supersedes them |
| Reading the previous `screenshot_path` | A single SELECT before the UPDATE (like `delete-project`) | Supabase `.update().select()` only returns post-update rows; a pre-update SELECT is the simplest way to recover the old path |
| When to call `storage.remove` | Only when `input.screenshotPath` is provided **and** differs from the current path, **after** the UPDATE succeeds | No-op edits must not touch storage; a failed UPDATE (RLS / 0 rows) must not delete anyone's image |
| Failure handling | Fire-and-forget `await supabase.storage.from(...).remove([...])`, errors ignored | Matches `delete-project` and the spec's non-blocking invariant |
| E2E assertion shape | `fetch(previousUrl)` asserted 4xx; metadata checked via visible card text | Externally observable, matches the spec's "stops serving" and "card renders" language |

## Infrastructure Resources

None — `project-screenshots` bucket and RLS policies already exist.

## Data Model

No schema changes. `projects.screenshot_path` remains `NOT NULL`.

## Required Skills

| Skill | Applicable Task | Purpose |
|-------|-----------------|---------|
| test-driven-development | Tasks 1, 2, 3 | RED→GREEN discipline; one acceptance bullet ↔ one test |
| supabase | Task 1 | Confirms `supabase.storage.from(bucket).remove([paths])` shape and error semantics |
| code-review-and-quality | Final checkpoint | Five-axis review before merge |

## Affected Files

| File Path | Change Type | Related Task |
|-----------|-------------|--------------|
| `features/edit-project/api/actions.ts` | Modify | Task 1 |
| `features/edit-project/api/actions.test.ts` | Modify | Task 1 |
| `features/delete-project/api/actions.test.ts` | Modify | Task 2 |
| `e2e/project-board.spec.ts` | Modify | Task 3 |

Reference files (read-only; patterns to mirror):
- `features/delete-project/api/actions.ts` — established fetch-then-update-then-remove pattern
- `features/delete-project/api/actions.test.ts` — Vitest storage-mock shape (`storage.from().remove()`)
- `features/submit-project/lib/upload-screenshot.ts` — path format `${user.id}/${uuid}.webp`, bucket `project-screenshots`

## Tasks

### Task 1: edit-project removes the previous screenshot after a successful replace

- **Covers**: Scenario 1 (unit portion — removal triggered), Scenario 2 (unit portion — removal skipped), Scenario 4 edit-half (full), Owner-gated invariant (full, via RLS-0-rows path)
- **Size**: S (2 files)
- **Dependencies**: None
- **References**:
  - test-driven-development — criterion-to-test mapping
  - supabase — storage client `remove()` patterns
  - `features/delete-project/api/actions.ts` (existing pattern to mirror)
- **Implementation targets**:
  - `features/edit-project/api/actions.test.ts` (extend; add `storage.from().remove` mock like `delete-project`'s test; the four acceptance cases below)
  - `features/edit-project/api/actions.ts` (fetch current `screenshot_path` only when `input.screenshotPath` is provided; after successful UPDATE, fire-and-forget `storage.from("project-screenshots").remove([previousPath])` when the paths differ)
- **Acceptance**:
  - [ ] Given a new `screenshotPath` that differs from the current path and the UPDATE succeeds, `storage.from("project-screenshots").remove` is called exactly once with `[previousPath]` and the action returns `{ ok: true }`
  - [ ] Given no `screenshotPath` in the input, `storage.from(...).remove` is never called and the action returns `{ ok: true }`
  - [ ] Given a non-owner caller (RLS returns 0 rows on UPDATE), `storage.from(...).remove` is never called and the action returns a "not found or permission" error
  - [ ] Given `storage.from(...).remove` resolves with an error, the action still returns `{ ok: true }`
- **Verification**:
  - `bun run test:unit -- features/edit-project`
  - `bun run build`

---

### Task 2: delete-project test proves non-blocking cleanup

- **Covers**: Scenario 4 delete-half (full)
- **Size**: S (1 file; ~one new case)
- **Dependencies**: None
- **References**:
  - test-driven-development — one new RED case that the existing action should already satisfy (fire-and-forget pattern)
  - `features/delete-project/api/actions.test.ts` (extend existing file)
- **Implementation targets**:
  - `features/delete-project/api/actions.test.ts` (add a case where `storage.from().remove` resolves with `{ data: null, error: { message: "storage error" } }` and assert the action still returns `{ ok: true }` and revalidates)
- **Acceptance**:
  - [ ] Given a successful row delete and `storage.from(...).remove` resolving with an error, `deleteProject` returns `{ ok: true }` and `revalidatePath("/")` is still called
- **Verification**:
  - `bun run test:unit -- features/delete-project`
  - `bun run build`

---

### Task 3: E2E proves the observable outcomes of replace and delete against a real bucket

- **Covers**: Scenario 1 (E2E portion — card renders new screenshot, metadata preserved, previous URL 4xx), Scenario 2 (E2E — original URL still 200, card unchanged after metadata-only edit), Scenario 3 (E2E — project disappears from the board, final URL 4xx), Non-blocking invariant (observed as "action succeeded" in both flows)
- **Size**: S (1 file)
- **Dependencies**: Task 1 (the replace-side 4xx assertion requires edit-project cleanup to be live)
- **References**:
  - test-driven-development — RED first on each new assertion
  - `e2e/project-board.spec.ts` — existing "student submits, edits, and deletes their own project end-to-end" test (around lines 157–240) that already replaces the screenshot and deletes the project
- **Implementation targets**:
  - `e2e/project-board.spec.ts` (extend the existing end-to-end test: (a) before the replace, capture the current screenshot public URL; after the save, `fetch` it and assert a 4xx; (b) add a metadata-only edit step that changes title/tagline, saves, then `fetch`es the unchanged URL and asserts 200 and that the card still shows the original image; (c) before the delete, capture the current URL; after delete succeeds, `fetch` it and assert 4xx, and assert the project card is absent from the board)
- **Acceptance**:
  - [ ] After the owner replaces the screenshot and the save succeeds, the card renders the newly uploaded image and `fetch(previousUrl)` returns a 4xx
  - [ ] After a metadata-only edit save succeeds, the title/tagline/URL fields reflect the owner's new values while the card still shows the original screenshot and `fetch(originalUrl)` returns 200
  - [ ] After the owner deletes the project, the project card no longer appears on the board and `fetch(lastUrl)` returns a 4xx
- **Verification**:
  - `bun run test:e2e -- project-board`
  - `bun run build`

---

### Checkpoint: After Tasks 1–3
- [ ] All tests pass: `bun run test` (Vitest + pgTAP) and `bun run test:e2e` (Playwright against local Supabase)
- [ ] Build succeeds: `bun run build`
- [ ] Edit-replace, metadata-only edit, and delete all behave per the spec against a real bucket

## Verification Summary

End-to-end walkthrough once all three tasks land:

1. `bun run test:unit -- features/edit-project features/delete-project` — covers Scenarios 1, 2, and 4 (both halves) and the owner-gated invariant at the action boundary.
2. `bun run test:e2e -- project-board` — with `supabase start` running, proves Scenarios 1, 2, and 3 end-to-end with a real bucket.
3. `bun run build` — no type regressions.

## Undecided Items

None.
