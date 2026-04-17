# Decisions — `/ship` skill

## Skipped spec.md / wireframe (meta-tooling)

**When**: Step 1, Prerequisites check
**Decision**: Proceed without `spec.md` or `wireframe.html`. Use `plan.md` as the single source of truth.
**Why**: This is meta-tooling (a new skill + GitHub workflow removals), not a product feature. `CLAUDE.md` explicitly excludes meta-tooling from the spec-driven pipeline. Plan's §6 Success Criteria replaces spec scenarios.
**Harness Signal**: `/execute-plan` assumes `spec.md` exists. Consider explicit branch in the skill for meta-tooling flows where plan.md carries its own acceptance criteria.
**Result**: Pending

---

## No Reviewers selected

**When**: Step 2, Reviewer selection
**Decision**: Skip all Reviewers (`wireframe-reviewer`, `ui-quality-reviewer`, `design-reviewer`, `react-reviewer`).
**Why**: No UI, no wireframe, no React components — all four Reviewer triggers are absent. Change is limited to a config JSON, a skill markdown, and GitHub workflow deletions.
**Harness Signal**: `/execute-plan` has no dedicated reviewer for skill/workflow authoring. Could add a "skill-reviewer" that validates SKILL.md frontmatter, trigger phrases, and shell-script safety.
**Result**: Pending

---

## Split destructive steps from additive steps

**When**: Step 3, Task ordering
**Decision**: Execute only **additive** Tasks autonomously (Task 1 config, Task 2 SKILL.md). Pause before destructive / shared-system Tasks (Tasks 3–5 remove GitHub workflows) and the smoke-test deploy.
**Why**: `CLAUDE.md` auto-mode instructions: "Anything that deletes data or modifies shared or production systems still needs explicit user confirmation." Removing GitHub workflows changes shared CI state; the smoke test triggers a real production deploy. Plan's §5 also calls for a user-performed Vercel dashboard step before workflow removal.
**Harness Signal**: `/execute-plan` does not currently distinguish additive from destructive Tasks. Adding a "destructive: true" marker per Task in plan.md would let auto-mode pause automatically.
**Result**: Pending
