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
- **Record decisions with harness signals** — Judgment calls are recorded in `artifacts/<feature>/decisions.md` using the `references/decisions-template.md` format (entries start as `Pending` and resolve to `Success` / `Partial` / `Failure` once their effect is observable). Emphasize the **Harness Signal** field so future harness updates can learn from each execution

## Step 1: Check Prerequisites

Extract the feature name from $ARGUMENTS.

- `artifacts/<feature>/plan.md` — If missing, output "Please run `/draft-plan` first." and stop
- Read `artifacts/<feature>/spec.md`
- `artifacts/<feature>/wireframe.html` — Reference if present
- Read each SKILL.md listed in plan.md's Required Skills
- Read `references/decisions-template.md` — Confirm decisions.md recording format

**Invoke these skills at session start**: `incremental-implementation`, `test-driven-development`, `debugging-and-error-recovery`. They govern how each Task runs in Step 4.

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

Implement Tasks one at a time, in the order from Step 3. For each Task:

1. Read the Acceptance Criteria
2. Apply TDD (RED → GREEN) where it fits
3. Implement the minimum code to satisfy the criteria
4. Run `bun run build` and any touched tests
5. Create one conventional commit per Task
6. Mark the Task complete in plan.md

Use `debugging-and-error-recovery` on any failure — find the root cause, do not work around it. Record judgment calls (spec ambiguity, scope changes, recovery paths, user escalation) in decisions.md with a Harness Signal.

## Step 5: Evaluation Loop

After all Tasks complete, spawn the Reviewers from Step 2 **in parallel** to shorten wall-clock time. Each reviewer's agent spec defines its own input contract.

On results:

- **All pass** → Proceed to Step 6
- **Fail** → Fix directly and re-run the affected Reviewer. For UI fixes, screenshot-verify before approving

For `ui-quality-reviewer` only: **Warning** → log in decisions.md without re-review. **Advisory** → surface only in the Step 6 report.

Record feedback judgments in decisions.md. After the loop closes, finalize the `Pending` results from Step 2 and Step 3.

## Step 6: Done

Report results to the user:

- **Execution summary**: Total Task count, Reviewer composition
- **Reviewer results**: Pass / fail per executed Reviewer
- **Decision log**: Provide decisions.md path — update all remaining `Pending` results before reporting, and include a brief summary of the **Harness Signal** entries so future harness tuning has usable input
