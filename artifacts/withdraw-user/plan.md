# Withdraw User Implementation Plan

## Architecture Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Deletion strategy | Cascade delete via `auth.admin.deleteUser(user.id)` | `profiles.id → auth.users ON DELETE CASCADE` is already in place, which then cascades through `projects` and `votes`. No schema changes needed. |
| Admin client placement | New `shared/api/supabase/admin.ts` (service-role client, server-only) | Server actions that need elevated privileges (admin.deleteUser) cannot use the user-session client. Keeping it in `shared/api/supabase/` matches existing `server.ts` / `client.ts` conventions. |
| Storage cleanup order | List screenshots → delete from `project-screenshots` bucket → call `admin.deleteUser` | Supabase blocks deleting an auth user that still owns storage objects (409). Must clear screenshots first. |
| Session termination | Call `supabase.auth.signOut()` on the user-session client after admin delete, then `redirect("/")` | Clears the cookie immediately so the UI reflects signed-out state on the next page render. |
| Confirmation UX | shadcn `Dialog` with typed-email confirmation; exact-match (case-sensitive) | Matches v0 / GitHub-style pattern; reuses existing `features/delete-project/ui/delete-button.tsx` as a reference. |
| New feature slice | `features/withdraw-user/` | FSD convention: user-facing action. Settings layout remains in `features/settings` + `app/settings/page.tsx`. |
| Auth guard location | Server action validates `auth.getUser()` on every call | Invariant: only the caller's own account can be deleted. No `userId` parameter from the client. |

## Infrastructure Resources

| Resource | Type | Declared in | Creation Task |
|----------|------|-------------|---------------|
| `SUPABASE_SECRET_KEY` (server) | Env var | `shared/config/env.ts` (server block), `.env.local` (already present per `CLAUDE.md` E2E preconditions) | Task 2 |

## Data Model

No schema changes. Relies on existing cascade relationships:

### auth.users → profiles (ON DELETE CASCADE)
- profile (id → profiles.id)

### profiles → projects (ON DELETE CASCADE)
- user_id → owned projects (incl. `screenshot_path` in `project-screenshots` bucket)

### profiles → votes (ON DELETE CASCADE)
- user_id → votes this user has cast

Storage bucket `project-screenshots` is **not** cascade-linked; screenshots for the deleted user's projects must be removed explicitly before `auth.admin.deleteUser` is called.

## Required Skills

| Skill | Applicable Task | Purpose |
|-------|-----------------|---------|
| `test-driven-development` | All tasks | RED → GREEN discipline, criterion-to-test mapping |
| `fsd` | Tasks 1, 3 | Feature slice placement (`features/withdraw-user`), cross-slice imports via barrel |
| `shadcn` | Tasks 1, 3 | Use `Dialog`, `Card`, `Button`, `Field` primitives; never modify `components/ui/*` directly |
| `supabase` | Task 2 | Service-role admin client; `auth.admin.deleteUser`; storage cleanup patterns |
| `security-and-hardening` | Task 2 | Auth guard on destructive server action; no user-controlled id parameter |
| `next-best-practices` | Tasks 1, 2, 3 | Server actions, `redirect`, `revalidatePath` |
| `frontend-ui-engineering` | Tasks 1, 3 | Card-section layout, accessible dialog, destructive button variant |
| `incremental-implementation` | All tasks | Vertical slicing, small commits |

## Affected Files

| File Path | Change Type | Related Task |
|-----------|-------------|--------------|
| `app/settings/page.tsx` | Modify | 1, 3 |
| `app/settings/page.test.tsx` | Modify | 1, 3 |
| `features/settings/ui/settings-form.tsx` | Modify | 1 |
| `features/settings/ui/settings-form.test.tsx` | Modify | 1 |
| `shared/config/env.ts` | Modify | 2 |
| `shared/api/supabase/admin.ts` | New | 2 |
| `features/withdraw-user/api/actions.ts` | New | 2 |
| `features/withdraw-user/api/actions.test.ts` | New | 2 |
| `features/withdraw-user/ui/withdraw-dialog.tsx` | New | 3 |
| `features/withdraw-user/ui/withdraw-dialog.test.tsx` | New | 3 |
| `features/withdraw-user/index.ts` | New | 3 |
| `e2e/withdraw-user.spec.ts` | New | 4 |

## Tasks

### Task 1: Redesign Settings page into sectioned layout (Profile / Account / Danger Zone) ✅

- **Covers**: Scenario 1 (full)
- **Size**: M (4 files)
- **Dependencies**: None
- **References**:
  - `shadcn` — Card, Button, Field, Separator
  - `fsd` — settings-form stays inside `features/settings`; page-level composition in `app/settings/page.tsx`
  - `artifacts/withdraw-user/wireframe.html` — Screen 0 (Settings default) for row/section order
  - `features/settings/ui/settings-form.tsx` — current layout to reorder
- **Implementation targets**:
  - `app/settings/page.tsx` — three `Card`-like sections: Profile (wraps `SettingsForm`), Account (Log out form), Danger Zone (static `Withdraw` button placeholder that will be wired in Task 3)
  - `app/settings/page.test.tsx` — assert section headings, Log out button in Account, Withdraw button + warning text in Danger Zone
  - `features/settings/ui/settings-form.tsx` — reorder: Email row first, then Display name, Save button right-aligned at the bottom. Drop the two helper descriptions that duplicate the label (keep error + aria-invalid behavior)
  - `features/settings/ui/settings-form.test.tsx` — assert Email renders before Display name; assert Save button is the only Save control
- **Acceptance**:
  - [ ] `/settings` for a signed-in user renders three sections with headings `Profile`, `Account`, `Danger Zone` in that order
  - [ ] Profile section shows the Email row before the Display name row; Save button is the last focusable control in the Profile section
  - [ ] Account section contains a `Log out` button wired to the existing `signOut` server action
  - [ ] Danger Zone section contains a `Delete account` row with a visible `Withdraw` button and the warning text "Permanently remove your profile, projects, and votes. This cannot be undone."
  - [ ] The `Back to home` link still navigates to `/`
- **Verification**:
  - `bun run test:unit -- app/settings/page features/settings`
  - `bun run build`

---

### Task 2: Withdraw server action + service-role admin client ✅

- **Covers**: Scenario 5 (full); Scenario 2 (partial — server-side happy path, no UI integration)
- **Size**: M (4 files)
- **Dependencies**: None (can run in parallel with Task 1)
- **References**:
  - `supabase` — admin client patterns, `auth.admin.deleteUser`, storage removal
  - `security-and-hardening` — never accept a user id from the caller
  - `features/delete-project/api/actions.ts` — reference for auth guard + storage cleanup pattern
  - `e2e/helpers/supabase-admin.ts` — existing admin-client example using `SUPABASE_SECRET_KEY`
  - Supabase docs: deleting user blocked while they own storage objects
- **Implementation targets**:
  - `shared/config/env.ts` — add `server: { SUPABASE_SECRET_KEY: z.string().min(1) }` and `runtimeEnv.SUPABASE_SECRET_KEY`
  - `shared/api/supabase/admin.ts` — exports `createAdminClient()` using `@supabase/supabase-js` + service-role key; server-only (`"use server"` is not enough; file should not be imported by client code — export only from server modules)
  - `features/withdraw-user/api/actions.ts` — `"use server"`; `withdrawAccount(): Promise<{ ok: true } | { ok: false; error: string }>`. Steps: (a) user-session `auth.getUser()` guard; (b) fetch `screenshot_path` list for `projects.user_id = user.id`; (c) `supabase.storage.from("project-screenshots").remove(paths)` (best-effort on empty list); (d) `admin.auth.admin.deleteUser(user.id)`; (e) user-session `signOut()`; (f) return `{ ok: true }` (caller performs redirect)
  - `features/withdraw-user/api/actions.test.ts` — mocks `@shared/api/supabase/server`, `@shared/api/supabase/admin`; cases: unauthenticated → `{ ok: false }`; happy path → storage remove called with listed paths, admin.deleteUser called with `user.id`, signOut called; admin.deleteUser error → `{ ok: false }` with message
- **Acceptance**:
  - [ ] Unauthenticated call (no session cookie) returns `{ ok: false, error: ... }` and never invokes `auth.admin.deleteUser`
  - [ ] Authenticated call for user X: invokes storage remove with the exact paths returned by the `select screenshot_path where user_id = X` query, then `auth.admin.deleteUser(X)`, then `signOut()` — regardless of any additional values passed to the action
  - [ ] If `admin.deleteUser` fails, the action returns `{ ok: false, error: <message> }` and does not clear cookies (preserves "still usable" invariant when deletion fails)
  - [ ] Action never reads a user id from its arguments — `user.id` is always sourced from the authenticated session
- **Verification**:
  - `bun run test:unit -- features/withdraw-user/api/actions`
  - `bun run build`

---

### Checkpoint: After Tasks 1-2
- [ ] All tests pass: `bun run test`
- [ ] Build succeeds: `bun run build`
- [ ] `/settings` renders the redesigned sectioned layout; the Withdraw button is visible but inert (dialog wiring deferred to Task 3)

---

### Task 3: Withdraw dialog UI wired to server action ✅

- **Covers**: Scenarios 2 (UI integration), 3 (full), 4 (full)
- **Size**: M (4 files)
- **Dependencies**: Task 1 (Danger Zone slot), Task 2 (server action)
- **References**:
  - `shadcn` — Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Button (`variant="destructive"`), Input, Label
  - `frontend-ui-engineering` — accessible destructive confirmation, `aria-describedby`, focus management
  - `features/delete-project/ui/delete-button.tsx` — closest existing dialog pattern to mirror
  - `artifacts/withdraw-user/wireframe.html` — Screens 1 and 2 for dialog structure
- **Implementation targets**:
  - `features/withdraw-user/ui/withdraw-dialog.tsx` — client component. Props: `email: string`. State: `open`, `confirmation`, `error`, `isPending` (useTransition). On submit: call `withdrawAccount()`; on `{ ok: true }` → `router.replace("/")` + `router.refresh()`; on failure → show error, keep dialog open. Final button `disabled={confirmation !== email || isPending}`.
  - `features/withdraw-user/ui/withdraw-dialog.test.tsx` — renders trigger; clicking opens dialog; typing wrong value keeps confirm disabled; typing exact email enables it; Cancel closes dialog without calling the action; on confirm success, `router.replace("/")` called
  - `features/withdraw-user/index.ts` — barrel: `export { WithdrawDialog } from "./ui/withdraw-dialog.tsx"; export { withdrawAccount } from "./api/actions.ts";`
  - `app/settings/page.tsx` — replace Task-1 placeholder button with `<WithdrawDialog email={viewer.email} />`; update `app/settings/page.test.tsx` stub accordingly
- **Acceptance**:
  - [ ] Clicking `Withdraw` opens a dialog titled `Delete account` showing a bulleted list of what will be removed (profile, projects, votes, uploaded screenshots)
  - [ ] input=`alice` (for viewer email `alice@example.com`) → final `Delete account` button disabled
  - [ ] input=`ALICE@EXAMPLE.COM` → button disabled (case-sensitive match)
  - [ ] input=`alice@example.com` → button enabled
  - [ ] Clearing the input returns the button to disabled
  - [ ] Clicking `Cancel` closes the dialog and does not call `withdrawAccount`
  - [ ] Closing and re-opening the dialog shows an empty confirmation input (no stale value from the previous open)
  - [ ] On successful withdrawal the client navigates to `/` (via `router.replace("/")`); error surfaces in the dialog and the dialog stays open
- **Verification**:
  - `bun run test:unit -- features/withdraw-user app/settings`
  - `bun run build`

---

### Task 4: End-to-end verification of withdrawal (real Supabase)

- **Covers**: Scenario 2 (remaining end-to-end acceptance); Scenario 5 (full-stack redirect verification)
- **Size**: S (1 file)
- **Dependencies**: Task 3
- **References**:
  - `CLAUDE.md` → Testing → E2E preconditions (Supabase running, `SUPABASE_SECRET_KEY` in env, chromium installed)
  - `e2e/helpers/supabase-admin.ts` — `createAdminClient`, `uniqueTestEmail`
  - Existing e2e specs in `e2e/*.spec.ts` for login + project-submit bootstrap patterns
- **Implementation targets**:
  - `e2e/withdraw-user.spec.ts`:
    - Seed: create user via admin client, insert a profile with display_name, insert one project (with a fake screenshot_path uploaded to `project-screenshots`), cast one vote on another seeded project (call the target "peer project"; record its vote count before withdrawal)
    - **Cancel sub-case**: sign in, open `/settings`, open Withdraw dialog, click Cancel, navigate to `/` — assert seeded project card still shown, peer project's vote count unchanged
    - **Happy path**: sign in as the user, navigate to `/settings`, click Withdraw, type email, click Delete account
    - Assert: URL becomes `/`; header shows signed-out state (no user menu); the seeded project title is no longer present in the project board
    - Assert: peer project's displayed vote count (on its card) has decreased by exactly 1 compared to the pre-withdrawal snapshot
    - Assert via admin client: `auth.users` row for this id no longer exists; `projects`/`votes` rows for this user are gone
    - Assert: direct navigation to the deleted user's project URL (e.g. `/projects/<id>`) returns 404 (or its equivalent not-found page) — if project detail routes don't exist yet, assert the id is absent from the project board API response
    - Assert: visiting `/settings` redirects to `/login?next=/settings`
    - Assert: requesting an email OTP for the deleted email on `/login` succeeds as a brand-new sign-up (Supabase returns a fresh signInWithOtp response; no error about existing account)
- **Acceptance**:
  - [ ] After withdrawal, `/` shows the signed-out navigation (no user menu visible)
  - [ ] The withdrawn user's project card is no longer rendered on the home project board
  - [ ] The peer project's vote count on its card decreases by exactly 1 after withdrawal
  - [ ] Any vote the user cast is gone (verified via admin client row count)
  - [ ] Direct navigation to the withdrawn user's project URL returns a not-found state (no card, no screenshot, no avatar reachable)
  - [ ] `/settings` now redirects to `/login?next=/settings`
  - [ ] `auth.admin.getUserById(id)` returns not-found after withdrawal
  - [ ] Submitting the deleted email on `/login` starts a fresh OTP sign-up flow (no lingering account)
  - [ ] Cancel sub-case: after opening and canceling the Withdraw dialog, `/` still shows the user's project card and the peer project's vote count is unchanged
- **Verification**:
  - `bun run test:e2e -- withdraw-user`

---

### Checkpoint: After Tasks 3-4
- [ ] All tests pass: `bun run test && bun run test:e2e`
- [ ] Build succeeds: `bun run build`
- [ ] Manual smoke test: sign in, submit a project, vote on another, open `/settings`, withdraw. Verify home no longer shows the card and navigation shows signed-out state.

---

## Undecided Items

- None
