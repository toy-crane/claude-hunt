# fit-login-onboarding — Execution Decisions

## Reviewer selection: all four UI reviewers

**When**: Step 2
**Decision**: Run `wireframe-reviewer`, `ui-quality-reviewer`, `design-reviewer`, and `react-reviewer` in parallel at the end of the evaluation loop.
**Why**: `artifacts/fit-login-onboarding/wireframe.html` exists → wireframe-reviewer applies. All three tasks with code changes (Tasks 1–3) ship UI → ui-quality + design apply. The code is React/Next.js client components → react-reviewer applies. No backend, no security surface, no perf critical path → no security/perf reviewers needed.
**Harness Signal**: Simple branching: UI features with wireframe + React + design-system rules always run the full UI reviewer quartet. This could be a skill default when plan.md's Affected Files list is majority `.tsx`.
**Result**: Pending

## Task execution order: 1 → 2 → 3 → 4, sequential

**When**: Step 3
**Decision**: Execute Task 1 first (AuthLayout + test), then Task 2 (login adopt), then Task 3 (onboarding adopt), then Task 4 (create-logo spec doc update).
**Why**: Tasks 2 and 3 both depend on Task 1 (AuthLayout must exist before adoption). Task 2 and Task 3 are independent of each other but are executed sequentially by the single Team Lead to keep the commit history linear and reviewable. Task 4 depends on Tasks 1–3 because the supersession of the create-logo invariant is only accurate once the new behavior ships.
**Harness Signal**: Plan.md already declares Task 2 ⊥ Task 3 (both depend only on Task 1). Sequential Team-Lead execution is fine here because each task is S-size, but for larger plans a teammate split (TeamCreate) could shorten wall-clock time. The plan could explicitly flag "parallelizable after Task N" for future harness to act on.
**Result**: Pending
