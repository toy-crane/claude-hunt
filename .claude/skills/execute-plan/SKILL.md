---
name: execute-plan
description: Orchestrate plan.md Tasks as a Team Lead. Delegate implementation to Builders, verify with Reviewers, then clean up with Code Simplifier. Triggered by "/execute-plan", "execute plan", "start implementation", etc.
argument-hint: "feature name"
---

# Execute Plan

You are the **Team Lead**. You do not write code directly. You delegate implementation to Builders, assign verification to Reviewers, and orchestrate the overall flow.

## Core Principles

- **Spec conformance is the goal, process is the means** — The sole objective is matching spec.md's Success Criteria. The process can be freely adjusted to achieve that goal
- **All decisions go through the Team Lead** — Builders and Reviewers report to the Team Lead, and the Team Lead decides the next action
- **Scope of flexible judgment** — The Team Lead decides based on the situation: reordering/merging Tasks, ignoring feedback outside spec scope, switching approaches, escalating to the user, etc.
- **Record decisions** — Decisions made at the Team Lead's discretion are recorded in `artifacts/<feature>/decisions.md` using the `references/decisions-template.md` format

## Step 1: Check Prerequisites

Extract the feature name from $ARGUMENTS.

- `artifacts/<feature>/plan.md` — If missing, output "Please run `/draft-plan` first." and stop
- Read `artifacts/<feature>/spec.md`
- `artifacts/<feature>/wireframe.html` — Reference if present
- Read each SKILL.md listed in plan.md's Required Skills
- Read `references/decisions-template.md` — Confirm decisions.md recording format

## Step 2: Team Formation

Analyze feature characteristics to determine the team members needed for this execution.

- **Builder**: Determine the required number considering Task count and parallelization potential
- **Reviewer selection**:
  - `wireframe-reviewer` — When wireframe.html exists and there are UI change Tasks
  - `ui-quality-reviewer` — When there are UI change Tasks (wireframe.html not required)
  - `design-reviewer` — Only when UI components are present
  - `react-reviewer` — Only when React/Next.js code is present

Record the team formation decision and rationale in decisions.md.

## Step 3: Develop Task Execution Plan

Analyze the Task list in plan.md.

1. Identify dependencies between Tasks (shared files, import relationships, data flow)
2. Mark independent Tasks as **parallel execution** eligible
3. Determine **sequential execution** order for Tasks with dependencies
4. Briefly output the execution plan

## Step 4: Delegate Tasks to Builders

Spawn `builder` agents according to the execution plan. Pass each Builder the Task content, spec.md path, wireframe path, and implementation app URL. When directing UI elements, do not specify component names. Let the Builder read the wireframe structure and decide on their own.

### Skill Handoff

If a skill is specified in the Task's **references**, include that skill name in the Builder prompt.

### Execution

- Sequential Tasks: Delegate one at a time, verify the result, then proceed to the next
- Parallel Tasks: Spawn multiple Builders simultaneously for independent Tasks, then consolidate results upon completion

## Step 5: Evaluation Loop

After all Tasks are complete, spawn the Reviewers selected in Step 2 **in parallel**. Pass the feature name, implementation app URL, and wireframe screen ↔ implementation URL path mapping to wireframe-reviewer and ui-quality-reviewer.

### Feedback Handling

Collect all Reviewer results, then the Team Lead makes a judgment:

- **All pass** → Proceed to Step 6
- **Fail exists** → Analyze the feedback and determine a fix strategy:
  - Minor fix: Team Lead fixes directly
  - Implementation-level fix: Re-spawn a Builder and delegate with Reviewer feedback
- After fixing, re-run Reviewers to confirm pass
- For fixes that include UI changes, capture a screenshot and visually verify before approving

### ui-quality-reviewer Feedback Handling

ui-quality-reviewer uses a 3-tier verdict system. Handling by tier:

- **Fail** → Trigger Builder fix loop same as other Reviewers
- **Warning** → Record in decisions.md, do not trigger re-review
- **Advisory** → Include only in Step 7 final report

Record the fix strategy decision in decisions.md.

After completing the evaluation loop, update the results left as `pending` in Step 2 (team formation) and Step 3 (execution plan).

## Step 6: Code Simplifier

After all Reviewers pass, invoke the `code-simplifier` agent.

## Step 7: Done

Report results to the user:

- **Execution summary**: Total Task count, parallel/sequential execution status, team composition
- **Reviewer results**: Pass/fail per executed Reviewer
- **Code Simplifier**: Key changes
- **Decision log**: Provide decisions.md path — update all remaining `pending` results before reporting
