---
name: execute-plan
description: Execute plan.md Tasks directly as Team Lead with Reviewer feedback. Load TDD/incremental/debugging skills, implement each Task with one commit, then run Reviewers at the end. Triggered by "/execute-plan", "execute plan", "start implementation", etc.
argument-hint: "feature name"
---

# Execute Plan

You are the **Team Lead**. You implement Tasks directly in the main context, one Task at a time, and adjust based on Reviewer feedback at the end. You do not delegate implementation to sub-agents.

## Core Principles

- **Spec conformance is the goal, process is the means** — The sole objective is matching spec.md's Success Criteria. The process can be freely adjusted to achieve that goal
- **Team Lead implements and adjusts** — The Team Lead writes code directly and is responsible for responding to Reviewer feedback. All judgment calls stay with the Team Lead
- **Scope of flexible judgment** — The Team Lead decides based on the situation: reordering/merging Tasks, ignoring feedback outside spec scope, switching approaches, escalating to the user, etc.
- **Record decisions with harness signals** — Judgment calls are recorded in `artifacts/<feature>/decisions.md` using the `references/decisions-template.md` format. Emphasize the **Harness Signal** field so future harness updates can learn from each execution

## Step 1: Check Prerequisites

Extract the feature name from $ARGUMENTS.

- `artifacts/<feature>/plan.md` — If missing, output "Please run `/draft-plan` first." and stop
- Read `artifacts/<feature>/spec.md`
- `artifacts/<feature>/wireframe.html` — Reference if present
- Read each SKILL.md listed in plan.md's Required Skills
- Read `references/decisions-template.md` — Confirm decisions.md recording format

**Load these three skills at session start** (they govern how each Task is executed in Step 4):

- `.claude/skills/incremental-implementation/SKILL.md`
- `.claude/skills/test-driven-development/SKILL.md`
- `.claude/skills/debugging-and-error-recovery/SKILL.md`

## Step 2: Select Reviewers

Choose the Reviewer combination for this feature. Reviewers run once at the end (Step 5).

- `wireframe-reviewer` — When wireframe.html exists and there are UI change Tasks
- `ui-quality-reviewer` — When there are UI change Tasks (wireframe.html not required)
- `design-reviewer` — Only when UI components are present
- `react-reviewer` — Only when React/Next.js code is present

Record the Reviewer selection and rationale in decisions.md.

## Step 3: Order Tasks

Analyze the Task list in plan.md.

1. Identify dependencies between Tasks (shared files, import relationships, data flow)
2. Determine execution order — sequential, dependency-first
3. Briefly output the order

Record the order and rationale in decisions.md.

## Step 4: Execute Tasks

The Team Lead implements Tasks directly, one at a time, in the order from Step 3. For each Task:

1. Read the Task's **Acceptance Criteria**
2. Load relevant context (existing code, patterns, types) — follow `incremental-implementation` guidance
3. Decide TDD application:
   - Logic / backend Tasks → write failing test first (RED), then minimum implementation (GREEN), using `test-driven-development`
   - UI Tasks → TDD is optional; visual verification happens via Reviewers in Step 5
4. Implement the minimum code to satisfy the Acceptance Criteria
5. Run relevant tests (if any were added or touched)
6. Run `bun run build` to verify compilation / type-check
7. Create a **conventional commit** (one commit per Task) following CLAUDE.md's commit rules
8. Mark the Task complete in plan.md and move to the next Task

**On failure** (test fail, build fail, unexpected behavior): use the `debugging-and-error-recovery` skill to find the root cause before retrying. Do not skip steps to work around a failure.

**Judgment calls during Step 4** — record in decisions.md with Harness Signal:

- Spec ambiguity → which interpretation was chosen and why
- Task scope changed (added / removed / merged)
- Build or test failure recovery path
- User escalation triggered

## Step 5: Evaluation Loop

After all Tasks are complete, spawn the Reviewers selected in Step 2 **in parallel**. Pass the feature name, implementation app URL, and wireframe screen ↔ implementation URL path mapping to `wireframe-reviewer` and `ui-quality-reviewer`.

### Feedback Handling

Collect all Reviewer results, then the Team Lead makes a judgment:

- **All pass** → Proceed to Step 6
- **Fail exists** → Analyze the feedback and fix directly in the main context. After fixing, re-run the relevant Reviewer(s) to confirm pass. For fixes that include UI changes, capture a screenshot and visually verify before approving

### ui-quality-reviewer Feedback Handling

`ui-quality-reviewer` uses a 3-tier verdict system. Handling by tier:

- **Fail** → Team Lead fix loop (same as other Reviewers)
- **Warning** → Record in decisions.md, do not trigger re-review
- **Advisory** → Include only in Step 6 final report

Record feedback judgments in decisions.md.

After completing the evaluation loop, update the `Pending` results left in Step 2 (Reviewer selection) and Step 3 (Task order).

## Step 6: Done

Report results to the user:

- **Execution summary**: Total Task count, Reviewer composition
- **Reviewer results**: Pass / fail per executed Reviewer
- **Decision log**: Provide decisions.md path — update all remaining `Pending` results before reporting, and include a brief summary of the **Harness Signal** entries so future harness tuning has usable input
