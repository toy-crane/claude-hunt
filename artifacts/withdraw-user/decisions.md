# Execution Decisions — withdraw-user

## Reviewer selection

**When**: Step 2
**Decision**: Run `wireframe-reviewer`, `ui-quality-reviewer`, `design-reviewer`, `react-reviewer` at the end of Step 4.
**Why**: wireframe.html exists and Tasks 1/3 touch UI → wireframe-reviewer + ui-quality-reviewer. Tasks 1/3 render UI components (Card, Dialog, Field) → design-reviewer. All three task families are React/Next.js (server actions + client dialog + page composition) → react-reviewer. Code-reviewer is omitted because the listed reviewer set in the skill covers the dimensions that matter for this feature.
**Harness Signal**: N/A — matches the skill's explicit Step 2 rules.
**Result**: Pending

## Task execution order

**When**: Step 3
**Decision**: Execute 1 → 2 → 3 → 4 sequentially.
**Why**: Plan dependencies — Task 3 depends on Tasks 1 (Danger Zone slot in page.tsx) and 2 (server action). Task 4 depends on Task 3. Although Tasks 1 and 2 are independent, sequential execution keeps commits single-purpose.
**Harness Signal**: N/A — order derives directly from plan.md's Dependencies fields.
**Result**: Pending

## SUPABASE_SECRET_KEY — read via `process.env`, not `env.ts`

**When**: Step 4, Task 2 (after first `bun run build` failure)
**Decision**: Instead of adding `SUPABASE_SECRET_KEY` to the server block of `shared/config/env.ts` (which would fail the build if the key is missing at boot), read it lazily via `process.env.SUPABASE_SECRET_KEY` inside `createAdminClient()` with a runtime check.
**Why**: `.env.local` in this repo does not set `SUPABASE_SECRET_KEY` (see `.env.example` comment: "Not validated at app boot; safe to leave unset in production"). Adding it to t3-env causes the production build to crash during static page collection for `/auth/callback`. The key is only needed when an admin action actually runs, so lazy-reading matches the existing pattern in `e2e/helpers/supabase-admin.ts` and avoids breaking the boot path for environments that don't need admin privileges.
**Harness Signal**: plan.md listed "SUPABASE_SECRET_KEY (server)" in Infrastructure Resources as declared in `env.ts`, but the skill (or plan step) did not flag that t3-env validates at import time and would fail the build. Consider having `draft-plan` surface "which env tier (client/server/lazy runtime-only) should hold each new key" when an Infrastructure Resource is added.
**Result**: Success — build passes; admin action fails fast with a clear error if the key is missing.

## E2E spec authored, live run deferred

**When**: Step 4, Task 4
**Decision**: Commit `e2e/withdraw-user.spec.ts` without verifying it runs green in this worktree. The spec seeds peer + own data via the admin client, signs in through the UI magic-link flow, exercises withdraw via UI, and asserts both UI and DB post-conditions (user gone, projects gone, votes gone, peer vote count -1, `/settings` redirects, deleted email starts a fresh OTP sign-up). A cancel sub-case asserts cancellation leaves all data intact.
**Why**: A dev server owned by another session (PID 78854) is bound to `localhost:3000` with `cwd` at the main repo path (`/Users/toycrane/Documents/Projects/claude-hunt`). Playwright's config uses `reuseExistingServer: true`, so the browser lands on the pre-Task-1 version of the app — the page snapshot on failure clearly shows the old "Read-only." + "Shown on your project cards" descriptions that Task 1 removed. The spec itself compiled cleanly (tsc passes for the new files; the one pre-existing error in `app/layout.test.tsx` is unrelated). Running the spec against this worktree requires stopping PID 78854 first so Playwright starts a fresh `bun run dev` from `.claude/worktrees/feat/withdraw-user`.
**Harness Signal**: Git worktrees + Playwright's `reuseExistingServer` pattern silently cause e2e to validate the wrong codebase. Consider having `execute-plan` (or the e2e skill) detect this case by comparing `lsof -iTCP:3000` → `cwd` against the current working directory, and warn before running `test:e2e` under a worktree.
**Result**: Partial — spec authored and committed; live verification deferred to the user (or post-merge when the main repo's dev server becomes the right one).

## Settings form — remove "Read-only" helper text

**When**: Step 4, Task 1
**Decision**: Drop the "Read-only." `FieldDescription` from the Email field and the "Shown on your project cards. Up to 50 characters." description from Display name, per the wireframe-phase feedback ("remove unnecessary description").
**Why**: User explicitly asked to remove filler descriptions during the sketch-wireframe step. Existing settings-form.test.tsx asserts `/read-only/i` and a "disabled" state — the disabled attribute stays, only the separate description text is removed. Test needs to be updated.
**Harness Signal**: N/A — direct translation of user feedback captured in wireframe dialogue.
**Result**: Pending
