# Decisions — `/ship` skill

## Skipped spec.md / wireframe (meta-tooling)

**When**: Step 1, Prerequisites check
**Decision**: Proceed without `spec.md` or `wireframe.html`. Use `plan.md` as the single source of truth.
**Why**: This is meta-tooling (a new skill + GitHub workflow removals), not a product feature. `CLAUDE.md` explicitly excludes meta-tooling from the spec-driven pipeline. Plan's §6 Success Criteria replaces spec scenarios.
**Harness Signal**: `/execute-plan` assumes `spec.md` exists. Consider explicit branch in the skill for meta-tooling flows where plan.md carries its own acceptance criteria.
**Result**: Success — Plan's §4 tasks and §6 Success Criteria were sufficient; no spec ambiguity surfaced during execution.

---

## No Reviewers selected

**When**: Step 2, Reviewer selection
**Decision**: Skip all Reviewers (`wireframe-reviewer`, `ui-quality-reviewer`, `design-reviewer`, `react-reviewer`).
**Why**: No UI, no wireframe, no React components — all four Reviewer triggers are absent. Change is limited to a config JSON, a skill markdown, and GitHub workflow deletions.
**Harness Signal**: `/execute-plan` has no dedicated reviewer for skill/workflow authoring. Could add a "skill-reviewer" that validates SKILL.md frontmatter, trigger phrases, and shell-script safety.
**Result**: Success — all changes are text/config; correctness is verified by actually running `/ship` (smoke test, post-merge). A reviewer would not add signal here.

---

## Split destructive steps from additive steps

**When**: Step 3, Task ordering
**Decision**: Execute only **additive** Tasks autonomously (Task 1 config, Task 2 SKILL.md). Pause before destructive / shared-system Tasks (Tasks 3–5 remove GitHub workflows) and the smoke-test deploy.
**Why**: `CLAUDE.md` auto-mode instructions: "Anything that deletes data or modifies shared or production systems still needs explicit user confirmation." Removing GitHub workflows changes shared CI state; the smoke test triggers a real production deploy. Plan's §5 also calls for a user-performed Vercel dashboard step before workflow removal.
**Harness Signal**: `/execute-plan` does not currently distinguish additive from destructive Tasks. Adding a "destructive: true" marker per Task in plan.md would let auto-mode pause automatically.
**Result**: Success — pause point was correct. User confirmed Vercel dashboard step (and `vercel.json` already had `deploymentEnabled: false` as belt-and-suspenders) before destructive Tasks resumed. No accidental production disruption.

---

## Proceeded with workflow removals without smoke test

**When**: Step 4, after Task 2
**Decision**: Remove `production.yml`, `ci.yml`, and Claude workflows without first running a smoke `/ship` against production.
**Why**: User confirmed Vercel dashboard and `vercel.json` both disable auto-deploy → removing workflows cannot leak un-migrated deploys. Smoke test deferred to post-merge (user's next real change). If `/ship` fails at that time, manual fallback exists: user can run `supabase db push` + `vercel --prod` directly.
**Harness Signal**: A "smoke-test-first" sequence is safer but requires user-in-the-loop for production deploys. Plan should either explicitly assign smoke tests to the user OR accept deferred validation when a safe manual fallback exists.
**Result**: Pending — resolved once first real `/ship` run succeeds post-merge.
