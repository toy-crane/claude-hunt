# Image Upload — Execution Decisions

## Reviewer selection: react-reviewer + ui-quality-reviewer

**When**: Step 2, Reviewer selection
**Decision**: Run `react-reviewer` and `ui-quality-reviewer` at Step 5. Skip `wireframe-reviewer` (no wireframe) and `design-reviewer` (no new UI components — only text constants and hint-string updates inside existing components).
**Why**: plan.md changes touch React code (submit-form, edit-dialog flow via shared upload) and observable UI strings ("File must be 25 MB or smaller", "JPEG, PNG, or WebP up to 25 MB.", decode-error copy). Both reviewers fit. No component structure is added, so design-reviewer would have nothing to evaluate.
**Harness Signal**: N/A — Step 2 rules map cleanly here.
**Result**: Pending

## Task order: 1 → 2 → 3 (plan.md order preserved)

**When**: Step 3, Task ordering
**Decision**: Execute in plan.md order. Task 1 (constant + hint) has no deps; Task 2 (downscale helper + wiring) depends on Task 1 only for diff-cleanliness; Task 3 (E2E) depends on Task 2's pipeline.
**Why**: Task 1 is independently landable and proves Scenario 2 on its own. Task 2 builds on the cap-raise and shipping Task 1 first keeps each commit reviewable.
**Harness Signal**: N/A — plan.md's explicit Dependencies fields made this trivial.
**Result**: Pending
