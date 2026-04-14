# Onboarding Process — Execution Decisions

## Reviewer selection: all four (wireframe, ui-quality, design, react)

**When**: Step 2
**Decision**: Run `wireframe-reviewer`, `ui-quality-reviewer`, `design-reviewer`, `react-reviewer` at Step 5, in parallel.
**Why**: The feature has UI changes (onboarding form) with a wireframe (`artifacts/onboarding-process/wireframe.html`), shadcn components, a client component, a server component page, and Next.js middleware. All four reviewer domains are present.
**Harness Signal**: N/A — selection matches the rules in SKILL.md verbatim.
**Result**: Pending

## Task order: 1 → 2 → 3 → 4 → 5 → 6 (strict linear)

**When**: Step 3
**Decision**: Execute tasks in the numbered order from plan.md.
**Why**: plan.md declares a strict linear dependency chain — migration → server action → UI → page → middleware → cleanup. No opportunity to parallelise; every task needs the prior one's output.
**Harness Signal**: N/A — dependency field in plan.md was unambiguous.
**Result**: Pending
