# improve-main-page — Decision Log

## Reviewer selection

**When**: Step 2
**Decision**: Run `wireframe-reviewer`, `ui-quality-reviewer`, `react-reviewer`, and `design-reviewer` at the evaluation loop (Step 5).
**Why**:
- `wireframe-reviewer` — wireframe.html exists and every task changes UI.
- `ui-quality-reviewer` — 6/6 tasks deliver user-visible UI changes.
- `react-reviewer` — all changes are React/Next.js components; `<ViewTransition>`, optimistic state, stable callbacks, and list keys are explicit concerns in plan.md.
- `design-reviewer` — the brand has a specific "monochrome + terracotta only" discipline that plan.md upgrades to exact hex tokens; a token-compliance pass is warranted.
- `migration-reviewer` / `security-auditor` — omitted; no schema or auth changes in this feature.
**Harness Signal**: N/A (matches the skill's "UI + wireframe → run these three" recommendation; design-reviewer was added by judgment given the tight palette rules in spec.md).
**Result**: Pending

## Task execution order

**When**: Step 3
**Decision**: Execute tasks in plan.md's stated order: T1 → T2 → T3 → T4 → T5 → T6. No parallelization, no merging.
**Why**:
- T1 (PromptLine) drops a new component onto the existing grid — zero regression risk, shortest task.
- T2 (grid → list) is the biggest layout swap; it must come after T1 so the prompt line already exists above it.
- T3 (chips) replaces CohortDropdown; needs T2's list underneath so the subtitle-count + prompt-line already read from client state.
- T4 (owner actions) renders inside the row built in T2; depends on T2.
- T5 (mobile) rewrites the same `project-card.tsx` T2 creates; must come after T2 and chip-wrap only makes sense after T3.
- T6 (palette) intentionally last — earlier tasks use semantic tokens; T6 retunes to exact hex values in one pass.
**Harness Signal**: plan.md already declared dependencies explicitly, so no reorder was required. The "Dependencies" field on each Task worked; keep it.
**Result**: Pending

## Spec sync deferral for Scenario 7

**When**: Step 1 (prereq read)
**Decision**: Do NOT pause to run a `/write-spec` sync for the 3 stale bullets in `spec.md` § Scenario 7 (34 px thumb / vertical vote / scrollable chips). Execute Task 5 against the wireframe 🅰️ decision (documented in plan.md Task 5 Acceptance) and note the spec drift for a follow-up edit after the feature ships.
**Why**: The drift is purely a wording update on three Success Criteria bullets; the underlying design intent is captured in the wireframe and in Task 5's Acceptance bullets. Stopping mid-execution to edit spec.md would force context re-entry without changing any implementation. Post-ship, a one-paragraph `/write-spec` pass reconciles the wording.
**Harness Signal**: Consider adding a rule to `sketch-wireframe` that amends spec.md in-place when a wireframe iteration changes an observable criterion — current rule forbids spec edits during the wireframe loop, which creates this exact drift situation.
**Result**: Pending
