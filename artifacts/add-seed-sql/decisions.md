# add-seed-sql — Execution Decisions

## Reviewer selection

**When**: Step 2, choose reviewers
**Decision**: Run `ui-quality-reviewer`, `design-reviewer`, `react-reviewer` in parallel at Step 5. Skip `wireframe-reviewer`.
**Why**: Task 3 modifies two React UI components (`cohort-dropdown.tsx`, `onboarding-form.tsx`) that render user-visible text — quality/design/react coverage warranted. No `wireframe.html` exists for this feature (the spec has no new UI layout — only a `.name` → `.label` string swap), so wireframe conformance is n/a.
**Harness Signal**: N/A — routine reviewer selection.
**Result**: Success — design-reviewer PASS (both files, no shadcn-guard violations); react-reviewer PASS (label field present on `Cohort`, keys stable, no missed consumers); ui-quality-reviewer returned a Warning (tooling unavailable — Chrome MCP extension not connected) logged below without re-review.

## Task execution order

**When**: Step 3, ordering
**Decision**: Execute Tasks 1 → 2 → 3 → 4 as listed in plan.md.
**Why**: Task 1 writes the failing pgTAP test (RED). Task 2 makes it GREEN and introduces the new `label`/`updated_at` columns in the generated types — which Tasks 3 and 4 both depend on. Task 3 consumes the new type in the onboarding + cohort-filter UIs; Task 4 repairs the rest of the `Cohort` fixtures + e2e lookup. No alternative ordering considered — dependency chain is linear.
**Harness Signal**: N/A — plan.md already expresses explicit Task dependencies.
**Result**: Success — Tasks executed in the planned order with no reshuffling; pgTAP RED → GREEN transition observed exactly at the Task 1 → Task 2 boundary.

## Pruned `supabase db diff` output before committing the column migration

**When**: Step 4, Task 2 — `supabase db diff -f add_cohort_label_and_updated_at` ran
**Decision**: Hand-pruned the generated migration down to the two intended `ALTER TABLE` statements (add `label`, add `updated_at`). Dropped everything else the diff emitted.
**Why**: The diff tool over-captured — it proposed dropping the `on_auth_user_created` trigger, the `prevent_self_vote` trigger and function, the four storage-objects policies, the `projects_with_vote_count` view, and five FK constraints, then recreating a subset. None of those things changed in `supabase/schemas/`; they live in manual-path migrations outside the declarative tree, so the diff comparison sees the declarative side as "missing" them. The rule `.claude/rules/supabase-migration.md` explicitly says "Review the generated migration file before committing" and the CLI itself warns "The diff tool is not foolproof, so you may need to manually rearrange and modify the generated migration." Kept only the two intended ALTERs; verified via `supabase db reset` + pgTAP (67 tests pass).
**Harness Signal**: This is a recurring failure mode of `supabase db diff` in projects that mix declarative schemas with manual-path migrations for triggers / storage policies / auth hooks. The supabase skill could add a review checklist specifically for "unexpected drops outside the schema file you just edited" — telling the builder to prune rather than accept. A `--schema public` flag to `db diff` could also reduce noise; worth documenting.
**Result**: Success — pruned migration applied cleanly on `supabase db reset`; the triggers/policies/views the diff wanted to drop remained intact (pgTAP suite still 67/67 green, including `votes_test.sql` which exercises the `prevent_self_vote` trigger, and `storage_project_screenshots_test.sql` which exercises the storage policies).

## E2E `project-board` test fails on a pre-existing onboarding redirect, not on the cohort seed

**When**: Step 4, Task 4 verification — `bun run test:e2e -- project-board`
**Decision**: Accept the e2e failure as out-of-scope. Do not fix the redirect handling inside this feature. Direct DB query confirms the `LGE-1` cohort row exists with the right label, so the single line in the spec that references cohort lookup would succeed if the test ever reached it.
**Why**: The failure is at line 53 — `await expect(page).toHaveURL("http://localhost:3000/")` — which fails because after magic-link sign-in, new users are now redirected to `/onboarding?next=%2F`. This redirect behavior was introduced by PR #40 (`feat: add onboarding process for display name and cohort selection`) and is not touched by `add-seed-sql`. Running the same spec against `main` (via `git checkout main -- e2e/`) produces 3 failures, confirming the test suite was already broken before this branch. Fixing the onboarding-flow handling in the e2e test would expand scope beyond the stated feature. pgTAP test 7 (set-equality of the four seeded pairs) and the direct `psql` verification both confirm the cohort seed is correct; the line `.eq("name", "LGE-1").single()` is equivalent to what pgTAP already proved.
**Harness Signal**: Plan acceptance should distinguish between tests the plan *introduces or touches* vs tests that *existed and might already be broken at the tip*. A plan-reviewer or plan-execute pre-check that runs the e2e suite once on the base branch and records the baseline would let acceptance be judged as "no new breakage" rather than "all green." Worth considering as a plan-reviewer input.
**Result**: Partial — seed correctness proven (pgTAP + direct `psql` query); e2e spec not reached end-to-end because of the pre-existing onboarding redirect. Follow-up item: update `e2e/project-board.spec.ts` to handle the `/onboarding` redirect after magic-link sign-in (out of scope here; create separate issue).

## ui-quality-reviewer Warning accepted (Chrome MCP not connected)

**When**: Step 5, evaluation loop
**Decision**: Accept the ui-quality-reviewer's Warning status and do not re-run. Per the execute-plan SKILL.md rule: *"For `ui-quality-reviewer` only: Warning → log in decisions.md without re-review."*
**Why**: The reviewer successfully started the dev server at `http://localhost:3000` but could not reach the Chrome MCP extension, so no screenshots were captured. The failure is tooling-level, not a visual defect. The visual change in this feature is narrow — a pure `.name` → `.label` string swap inside existing shadcn `SelectItem` components — and the design-reviewer already verified that the shadcn primitives truncate Korean glyphs safely inside the 200 px trigger. Dev server was stopped after review to free port 3000.
**Harness Signal**: When the ui-quality-reviewer cannot reach the Chrome MCP extension, the report is structurally indistinguishable from a real pass — every surface shows "PASS (unverified — screenshots unavailable)." A machine-readable `inconclusive` status (distinct from `pass`) would let the harness surface the tooling gap instead of relying on the Team Lead to read the prose. Also, the skill could add an up-front connectivity check so the reviewer exits early when the extension isn't reachable, rather than starting a dev server first.
**Result**: Success — warning accepted; visual correctness covered by design-reviewer and by manual inspection of the rendered `SelectItem` content.
