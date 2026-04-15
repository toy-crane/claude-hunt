# add-footer · Execution Decisions

## Reviewer selection: wireframe-reviewer + design-reviewer

**When**: Step 2, Reviewer selection
**Decision**: Run `wireframe-reviewer` and `design-reviewer` only. Skip `ui-quality-reviewer` and `react-reviewer`.
**Why**:
- `wireframe-reviewer` covers visual conformance against the existing `wireframe.html`; this overlaps `ui-quality-reviewer` and is more concrete because we have a reference.
- `design-reviewer` covers shadcn token / separator / icon rules — the highest-risk axis for this feature given the icon and color-class concerns.
- `react-reviewer` adds little here: the footer is a static server component with no hooks, no client boundary, no rendering perf concerns.
**Harness Signal**: For tiny static-content widgets the four-reviewer matrix is overkill. Consider noting in the skill that `react-reviewer` is optional when the changeset has no client components or hooks.
**Result**: Pending

## Task order: Task 1 → Task 2 (sequential per plan)

**When**: Step 3, Task ordering
**Decision**: Execute Task 1 (Footer widget) then Task 2 (Mount on home page) sequentially, per plan.
**Why**: Task 2 imports the component built in Task 1 — no other dependencies. No reason to deviate.
**Harness Signal**: N/A
**Result**: Success — both Tasks landed first try; full Vitest suite (272 tests) and `bun run build` pass.

## Switched from `lucide-react` to `@remixicon/react`

**When**: Step 4, Task 1 implementation
**Decision**: Use `RiChat3Line` (Feedback) and `RiExternalLinkLine` (creator link arrow) from `@remixicon/react` instead of `MessageSquare` / `ExternalLink` from `lucide-react`.
**Why**: The plan and exploration both referenced `lucide-react` based on `package.json` lookup, but `lucide-react` is not actually a dependency — the project standardised on `@remixicon/react` (every existing component imports from there). The plan's icon-library claim was wrong.
**Harness Signal**: The `Plan` agent asserted `lucide-react` is in `package.json` without grepping. The draft-plan skill should require icon-library claims to be verified by reading `package.json` deps — not inferred from import patterns the agent thinks it remembers. Consider adding "verify dependency exists in `package.json` before naming it" to the plan-template's References section.
**Result**: Success — 6/6 tests pass with `@remixicon/react` icons
