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

## Settings form — remove "Read-only" helper text

**When**: Step 4, Task 1
**Decision**: Drop the "Read-only." `FieldDescription` from the Email field and the "Shown on your project cards. Up to 50 characters." description from Display name, per the wireframe-phase feedback ("remove unnecessary description").
**Why**: User explicitly asked to remove filler descriptions during the sketch-wireframe step. Existing settings-form.test.tsx asserts `/read-only/i` and a "disabled" state — the disabled attribute stays, only the separate description text is removed. Test needs to be updated.
**Harness Signal**: N/A — direct translation of user feedback captured in wireframe dialogue.
**Result**: Pending
