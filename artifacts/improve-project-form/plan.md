# Improve Project Form Implementation Plan

## Context

The project submission form is currently rendered as an always-open, bordered inline section above the grid on the landing page (`app/page.tsx:72-82`), while edits for the same fields go through a modal dialog (`features/edit-project/ui/edit-dialog.tsx`). This inconsistency pushes the grid below the fold for the 90% of visitors who aren't submitting and gives submit/edit two different mental models.

This plan moves the submit form into a modal dialog that mirrors the existing `EditDialog` pattern, triggered from a primary CTA in the page header. Server-side behavior (auth checks, cohort enforcement, persistence) is untouched — this is a presentation and entry-point change.

## Architecture Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Form container | Modal dialog (Radix via `shared/ui/dialog.tsx`) | Matches the existing `EditDialog` pattern; frees the landing page for browsing |
| Trigger placement | Page header, primary action next to cohort filter | Product Hunt / community-submission convention; single top-right entry point |
| Signed-out behavior | Trigger is rendered as `<Link href="/login">`, no dialog opens | Mirrors the `VoteButton` signed-out pattern (`features/toggle-vote/ui/vote-button.tsx:36-50`); existing magic-link flow returns users to `/` |
| No-cohort behavior | Dialog opens with guidance banner + disabled fields + disabled Submit | Reuses the current `SubmitForm` blocked state; consistent with present UX |
| Success confirmation | `sonner` toast (auto-dismiss) after dialog closes | shadcn's recommended toast library; handles a11y, stacking, and auto-dismiss out of the box — simpler than hand-rolling |
| Close with draft | Silent discard — no confirm prompt, no persistence | 4-field form, re-entering is cheap; explicit user choice |
| Slice placement | New `features/submit-project/ui/submit-dialog.tsx`, parallel to `edit-dialog.tsx` | FSD precedent — dialog wrapper lives in the feature's `ui/` folder, exported from the slice's `index.ts` |
| SubmitForm refactor | Add `onSuccess?: () => void` prop; remove inline "Project submitted!" text | Minimal, clean boundary — the dialog wrapper owns post-success UI (close + toast) |

## Infrastructure Resources

| Resource | Type | Declared in | Creation Task |
|----------|------|-------------|---------------|
| `sonner` npm package | External dependency | `package.json` | Task 1 |
| Global `<Toaster />` mount | App bootstrap | `app/layout.tsx` | Task 1 |

## Data Model

No data-model changes. The `projects` table, server action (`features/submit-project/api/actions.ts`), and input schema (`features/submit-project/api/schema.ts`) are untouched.

## Required Skills

| Skill | Applicable Task | Purpose |
|-------|-----------------|---------|
| test-driven-development | All tasks | Write failing test first; each acceptance bullet maps 1:1 to a test case |
| incremental-implementation | All tasks | Small vertical slices, each leaving the system in a working state |
| frontend-ui-engineering | Tasks 2, 3, 4 | Production-quality dialog UX, focus management, keyboard interactions |
| shadcn | Tasks 1, 3, 4 | `Dialog`, `Button`, `Toaster` are shadcn components — do not override defaults with `className`, use variants and semantic tokens |
| fsd | Tasks 2, 3, 4 | Slice boundaries: dialog lives in `features/submit-project`, exported via `index.ts` barrel |
| next-best-practices | Tasks 1, 4 | `<Toaster />` in root layout; server vs. client component boundaries (page stays RSC, dialog is client) |
| vercel-react-best-practices | Tasks 2, 3 | Controlled dialog state, callback identity stability |
| web-design-guidelines | Task 3 | Dialog a11y: focus trap, escape-to-close, `aria-labelledby`, backdrop semantics |
| api-and-interface-design | Task 2 | `SubmitForm` prop contract change — stable, minimal surface |

## Affected Files

| File Path | Change Type | Related Task |
|-----------|-------------|--------------|
| `package.json` / `bun.lock` | Modify | Task 1 |
| `app/layout.tsx` | Modify | Task 1 |
| `features/submit-project/ui/submit-form.tsx` | Modify | Task 2 |
| `features/submit-project/ui/submit-form.test.tsx` | Modify | Task 2 |
| `features/submit-project/ui/submit-dialog.tsx` | New | Task 3 |
| `features/submit-project/ui/submit-dialog.test.tsx` | New | Task 3 |
| `features/submit-project/index.ts` | Modify | Task 3 |
| `app/page.tsx` | Modify | Task 4 |
| `app/page.test.tsx` | Modify | Task 4 |
| `e2e/project-board.spec.ts` | Modify | Task 5 |

## Tasks

### Task 1: Install Sonner and mount Toaster in root layout

- **Covers**: Prerequisite infrastructure for Scenario 1 (success confirmation)
- **Size**: S (2 files)
- **Dependencies**: None
- **References**:
  - (shadcn — sonner, toast, Toaster)
  - (next-best-practices — root layout, client boundary)
  - `app/layout.tsx` (existing root layout where Toaster mounts)
- **Implementation targets**:
  - `package.json` — add `sonner` via `bun add sonner`
  - `app/layout.tsx` — import and render `<Toaster />` alongside existing providers
- **Acceptance**:
  - [ ] `import { toast } from "sonner"` resolves without error
  - [ ] `<Toaster />` is present in the root layout tree (verifiable via rendering the layout and finding the toast region)
  - [ ] Calling `toast.success("Project submitted")` from any client component shows a toast notification that auto-dismisses
- **Verification**:
  - `bun run build` (type-check passes with the new import)
  - Manual: add a throwaway `toast.success` call in a dev page, confirm it shows and auto-dismisses

---

### Task 2: Refactor SubmitForm to accept `onSuccess` and remove inline success text

- **Covers**: Scenario 1 (partial — form signals success upward instead of owning the UI)
- **Size**: S (2 files)
- **Dependencies**: None (can land before Task 1)
- **References**:
  - (test-driven-development — colocated Vitest test, RED→GREEN)
  - (api-and-interface-design — minimal prop surface)
  - `features/submit-project/ui/submit-form.tsx` (existing component)
  - `features/submit-project/ui/submit-form.test.tsx` (existing tests — preserve mocking pattern)
- **Implementation targets**:
  - `features/submit-project/ui/submit-form.test.tsx` — extend existing tests to cover new `onSuccess` behavior and absence of inline success text
  - `features/submit-project/ui/submit-form.tsx` — add `onSuccess?: () => void` prop, call after the server action returns `ok: true`; remove `<p role="status">Project submitted!</p>`
- **Acceptance**:
  - [ ] With `onSuccess` provided, filling valid fields and pressing Submit calls `onSuccess` exactly once after the server action succeeds
  - [ ] With `onSuccess` provided, the inline "Project submitted!" text is never rendered in the form
  - [ ] When the server action returns `ok: false`, `onSuccess` is not called and the existing submit-error text still appears
  - [ ] All previously passing tests (cohort warning visibility, submit-enabled state, upload error handling) continue to pass
- **Verification**:
  - `bun run test:unit -- submit-form`
  - `bun run build`

---

### Task 3: Create SubmitDialog with trigger, dialog, and success wiring

- **Covers**: Scenario 1 (full), Scenario 2 (full), Scenario 3 (full), Scenario 4 (full)
- **Size**: M (3 files)
- **Dependencies**: Task 1 (needs `toast` from `sonner`), Task 2 (needs `SubmitForm` `onSuccess` prop)
- **References**:
  - (shadcn — Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription; do not override with className)
  - (web-design-guidelines — dialog a11y: focus trap, labelledby, escape behavior)
  - (frontend-ui-engineering — controlled open state, callback stability)
  - (vercel-react-best-practices — `useState` for open, stable `onSuccess` handler)
  - `features/edit-project/ui/edit-dialog.tsx` (existing EditDialog — mirror the controlled `open`/`setOpen` pattern)
  - `features/toggle-vote/ui/vote-button.tsx:36-50` (existing signed-out link pattern to mirror)
  - `features/submit-project/index.ts` (existing barrel — add SubmitDialog export)
- **Implementation targets**:
  - `features/submit-project/ui/submit-dialog.test.tsx` — new colocated Vitest test (mirror `submit-form.test.tsx` mocking strategy)
  - `features/submit-project/ui/submit-dialog.tsx` — new client component:
    - Props: `{ isAuthenticated: boolean; cohortId: string | null }`
    - If `!isAuthenticated`: render a `Button` with `asChild` wrapping `<Link href="/login">Submit a project</Link>` — no dialog
    - Else: render `<Dialog open onOpenChange>` with `<DialogTrigger asChild><Button>Submit a project</Button></DialogTrigger>` + `<DialogContent>` containing `<DialogHeader>` + `<SubmitForm cohortId={cohortId} onSuccess={handleSuccess} />`
    - `handleSuccess` = `() => { setOpen(false); toast.success("Project submitted"); }`
    - On `onOpenChange(false)`: just `setOpen(false)` (React unmounts form → fields reset → silent discard satisfied)
  - `features/submit-project/index.ts` — export `SubmitDialog`
- **Acceptance**:
  - [ ] Signed-in, cohort assigned: click "Submit a project" → dialog opens; fields visible and enabled; Submit button enabled
  - [ ] Signed-in, cohort assigned: fill title="My App", tagline="A cool tool", projectUrl="https://myapp.com", valid screenshot, press Submit → dialog closes and a toast with "Project submitted" appears
  - [ ] Signed-in, no cohort: click button → dialog opens with the "Contact your instructor…" guidance banner, inputs disabled, Submit disabled
  - [ ] Signed-out: rendered element is a link pointing to `/login` — clicking does not open a dialog (no `role="dialog"` appears)
  - [ ] Open dialog, type into title, press Esc → dialog closes; reopening shows an empty title field
  - [ ] Open dialog, type into title, click the close (X) button → dialog closes with no confirmation prompt; reopening shows an empty title field
  - [ ] Open dialog, fill title, tagline, project URL (screenshot is optional for this check), click the backdrop → dialog closes; reopening shows empty title, tagline, and project URL fields
- **Verification**:
  - `bun run test:unit -- submit-dialog`
  - `bun run build`

---

### Checkpoint: After Tasks 1-3

- [ ] All unit tests pass: `bun run test:unit`
- [ ] Build succeeds: `bun run build`
- [ ] `SubmitDialog` renders in isolation (Storybook-style manual check or ad-hoc mount) and can be opened, filled, and submitted, with toast appearing on success — but it is not yet wired into the page

---

### Task 4: Replace inline submit section in `app/page.tsx` with header-mounted SubmitDialog

- **Covers**: Scenario 1 (page-level integration), Scenario 2 (signed-out trigger rendered), Scenario 3 (no-cohort trigger rendered), Scenario 5 (full — inline section removed)
- **Size**: S (2 files)
- **Dependencies**: Task 3 (needs `SubmitDialog` export)
- **References**:
  - (next-best-practices — page stays RSC, dialog is client island)
  - (fsd — page composes feature slices)
  - `app/page.tsx:52-82` (existing header + inline section to modify)
  - `app/page.test.tsx` (existing page tests to update)
- **Implementation targets**:
  - `app/page.tsx`:
    - Remove the `{user ? <section …><SubmitForm …/></section> : null}` block at lines 72-82
    - Import `SubmitDialog` from `@features/submit-project`
    - Add `<SubmitDialog isAuthenticated={Boolean(user)} cohortId={viewerCohortId} />` in the header, inside the right-side flex container alongside the cohort filter
  - `app/page.test.tsx` — update assertions to confirm (a) no bordered inline submit section exists, (b) trigger button / sign-in link is present in each of the three viewer states
- **Acceptance**:
  - [ ] Signed-in with cohort visiting `/`: landing page shows the grid + a "Submit a project" trigger button in the header, no bordered inline section above the grid
  - [ ] Signed-in without cohort visiting `/`: landing page shows the grid + the trigger button in the header, no bordered inline section and no standalone banner above the grid
  - [ ] Signed-out visitor visiting `/`: landing page shows the grid + a "Submit a project" link pointing to `/login` in the header, no bordered inline section above the grid
  - [ ] The cohort filter remains in the header and functions unchanged
- **Verification**:
  - `bun run test:unit -- page`
  - `bun run build`
  - Manual: `bun dev`, load `/` in each of the three viewer states, confirm header layout

---

### Task 5: Update E2E spec for the dialog-based submit flow

- **Covers**: End-to-end verification of Scenarios 1, 2 (post-login return), 5 (and implicit coverage of Scenario 4 via dialog close assertion)
- **Size**: S (1 file)
- **Dependencies**: Task 4 (needs page wired up)
- **References**:
  - (test-driven-development — real Supabase, real browser, no mocks at this boundary)
  - `e2e/project-board.spec.ts` (existing spec to update — currently expects inline form)
  - `CLAUDE.md` → Testing → E2E preconditions
- **Implementation targets**:
  - `e2e/project-board.spec.ts` — update the "student submits, edits, and deletes their own project" flow to: click the header "Submit a project" button, expect a dialog to appear, fill fields inside the dialog, press Submit, expect the dialog to close, expect a toast with "Project submitted", then expect the new card in the grid
- **Acceptance**:
  - [ ] E2E spec signs in, clicks the header trigger, expects `role="dialog"` to appear
  - [ ] After filling fields and pressing Submit inside the dialog, the dialog disappears and a toast with "Project submitted" is observed
  - [ ] The grid contains a card with the submitted title and tagline after the dialog closes
  - [ ] As a signed-out visitor: visit `/` → click the header "Submit a project" link → land on `/login` → complete the magic-link sign-in → land back on `/` → click the trigger again → the dialog now opens (covers Scenario 2's post-login return path)
- **Verification**:
  - `bun run test:e2e` (requires `supabase start` and `bunx playwright install chromium` per `CLAUDE.md`)

---

### Checkpoint: After Tasks 4-5 (final)

- [ ] All tests pass: `bun run test` (unit + pgTAP) and `bun run test:e2e`
- [ ] Build succeeds: `bun run build`
- [ ] End-to-end vertical slice works: a signed-in student with cohort can open the dialog from the header, submit a project, see the dialog close + toast, and see the new card appear in the grid
- [ ] Signed-out visitors see a link that sends them to `/login`; after magic-link sign-in they land back on `/` and can open the dialog
- [ ] Signed-in students without a cohort see the guidance banner inside the dialog with disabled controls

## Undecided Items

- None
