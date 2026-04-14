# Image Upload — Execution Decisions

## Reviewer selection: react-reviewer + ui-quality-reviewer

**When**: Step 2, Reviewer selection
**Decision**: Run `react-reviewer` and `ui-quality-reviewer` at Step 5. Skip `wireframe-reviewer` (no wireframe) and `design-reviewer` (no new UI components — only text constants and hint-string updates inside existing components).
**Why**: plan.md changes touch React code (submit-form, edit-dialog flow via shared upload) and observable UI strings ("File must be 25 MB or smaller", "JPEG, PNG, or WebP up to 25 MB.", decode-error copy). Both reviewers fit. No component structure is added, so design-reviewer would have nothing to evaluate.
**Harness Signal**: N/A — Step 2 rules map cleanly here.
**Result**: Success — react-reviewer returned SHIP (no CRITICAL/HIGH violations), ui-quality-reviewer returned PASS (0 fail, 0 warning, 3 advisory). Neither re-review needed.

## Task order: 1 → 2 → 3 (plan.md order preserved)

**When**: Step 3, Task ordering
**Decision**: Execute in plan.md order. Task 1 (constant + hint) has no deps; Task 2 (downscale helper + wiring) depends on Task 1 only for diff-cleanliness; Task 3 (E2E) depends on Task 2's pipeline.
**Why**: Task 1 is independently landable and proves Scenario 2 on its own. Task 2 builds on the cap-raise and shipping Task 1 first keeps each commit reviewable.
**Harness Signal**: N/A — plan.md's explicit Dependencies fields made this trivial.
**Result**: Success — all three tasks landed in order, each as a single atomic commit, each leaving the system green.

## E2E helper adjusted for post-onboarding middleware redirect

**When**: Step 4, Task 3 — first E2E run
**Decision**: Extended the sign-in helper to tolerate the `/onboarding?next=/` redirect that now follows a magic-link sign-in for fresh users. After the magic link settles, the helper (a) admin-sets cohort + display name, (b) navigates to `/`, then asserts the URL.
**Why**: `bf88687 feat: add onboarding` was merged to main just before this branch cut. The pre-existing `project-board.spec.ts` still expected `toHaveURL("http://localhost:3000/")` directly after the magic link, which now races the onboarding redirect. Verified on main that the same test also fails there — this is a pre-existing breakage the E2E additions exposed. Fixed it here rather than leaving it broken since this feature's E2E assertions depend on the helper.
**Harness Signal**: When a Plan phase adds or touches an E2E flow, the Explore agent should check the dependency chain of middleware/redirect rules that may already be broken on main. `execute-plan` could gain a pre-flight step that runs the baseline E2E on the base branch to distinguish pre-existing failures from regressions.
**Result**: Success — after the helper update, all four E2E tests pass against the live dev server and real Supabase Storage.

## Port 3000 conflict: killed competing dev server from another worktree

**When**: Step 4, Task 3 — E2E suite
**Decision**: Asked the user and then killed the Next.js dev server running from the `feat/create-log` worktree on port 3000 so Playwright's `webServer` config could spin up our worktree's own dev server and serve the updated client-side downscale code.
**Why**: Playwright's `reuseExistingServer: !CI` silently reused the other worktree's server, serving stale client code. The small-image E2E received `image/png` because the downscale never ran — the OLD code was answering the browser. The user authorized the kill.
**Harness Signal**: Multi-worktree development regularly collides on fixed dev-server ports. `init-project` or the E2E preconditions could publish an ownership check ("is the :3000 server this worktree?") before running tests. Alternatively, Playwright's `webServer` could use a unique port per worktree (derived from worktree path hash) so multiple branches can run E2E in parallel.
**Result**: Success — after the kill, all 4 E2E tests passed on the first rerun.

## Local .env.local updated with SUPABASE_SECRET_KEY (not committed)

**When**: Step 4, Task 3 — first E2E run failed on missing env var
**Decision**: Added `SUPABASE_SECRET_KEY` to the gitignored `.env.local`, sourced from `supabase status -o env`.
**Why**: `CLAUDE.md` → Testing → E2E preconditions lists this as required. The file is `.gitignore`'d so nothing sensitive lands in git.
**Harness Signal**: `init-project` or an E2E preflight could verify `.env.local` has the keys E2E helpers require and print which ones are missing, instead of letting tests fail with an opaque `createAdminClient` throw.
**Result**: Success — secret was already the local dev default from `supabase status`.

## Reviewer feedback: accept should-fix + nits as follow-ups, not blockers

**When**: Step 5, evaluation loop — react-reviewer SHIP + ui-quality-reviewer PASS
**Decision**: Accept the two reviewers' verdicts without re-reviewing. Log the one should-fix (`async-parallel`: `supabase.auth.getUser()` could run in parallel with `downscaleImage`) and the five advisories/nits (bitmap.close test assertion, userEvent vs fireEvent pattern, MiB/MB unit pedantry, hint/error phrasing symmetry, decode-message tone softening) as follow-up candidates — not block the ship.
**Why**: react-reviewer explicitly noted the async-parallel item is "not a critical waterfall because `getUser` is a fast local JWT read" and rated no CRITICAL/HIGH violations. ui-quality-reviewer rated 0 fail / 0 warning / 3 advisory. Per `execute-plan` Step 5: advisories surface only in the final report; should-fix at the reviewer's non-blocking severity is guidance, not a gate. Applying the `Promise.all` fix now would be a worthwhile micro-optimization, but scope discipline says park it — the happy path already completes in well under a second and the fix is trivially applicable later.
**Harness Signal**: Reviewers distinguish must-fix / should-fix / nit, but `execute-plan`'s Step 5 only documents pass/fail + warnings/advisories. Consider an explicit rule for "should-fix" severity: "apply inline if < 3 lines and truly scope-local, else record as follow-up". Would reduce scope-ambiguity on these judgment calls.
**Result**: Success — no re-review needed; follow-up items logged for future work.
