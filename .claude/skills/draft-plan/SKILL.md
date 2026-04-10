---
name: draft-plan
description: Create an implementation plan based on spec.yaml. Find related skills via skill-researcher and generate a TDD-based task list with vertical slicing and dependency ordering. Triggered by "/draft-plan", "create plan", "implementation plan", etc.
argument-hint: "feature name"
---

# Create Implementation Plan

## Step 1: Check Prerequisites

Extract the feature name from $ARGUMENTS.

- `artifacts/spec.yaml` -- If missing, output "Please run `/write-spec` first." and stop
- `artifacts/<feature>/spec.md` -- Optional
- `artifacts/<feature>/wireframe.html` -- Optional

## Step 2: Enter Plan Mode

Operate in read-only mode. Do not create, modify, or delete any project files.

The only file output from this skill is `artifacts/<feature>/plan.md`.

## Step 3: Codebase Exploration

Explore the existing code to understand the architecture and related patterns.

- Check project structure, existing components, and state management approach
- Identify files this feature will affect and their dependency relationships
- Map dependencies between components — what depends on what
- If similar existing functionality exists, reference its implementation
- Note risks and unknowns

## Step 4: Skill Search

Invoke the `skill-researcher` agent to find skills that can help with this feature's scenarios.

Show the recommendation list to the user and receive confirmation/adjustments.

## Step 5: Fill in the Blanks

Read the above inputs and find items that are needed for implementation but not yet decided.

- Only ask about decisions with high cost of change
- One question at a time, present 2-4 options

## Step 6: Generate Plan Document

Read `references/plan-template.md` and write following its format.

### Task Writing Principles

#### Vertical Slicing

Each task must be a vertical slice delivering working, testable functionality through one complete path — not a horizontal layer.

Bad (horizontal slicing):
```
Task 1: Build entire database schema
Task 2: Build all API endpoints
Task 3: Build all UI components
Task 4: Connect everything
```

Good (vertical slicing):
```
Task 1: User can create an account (schema + API + UI for registration)
Task 2: User can log in (auth schema + API + UI for login)
Task 3: User can create a task (task schema + API + UI for creation)
```

#### Task Sizing

Target S (1-2 files) or M (3-5 files). Never L or larger.

Break a task down further when:
- Acceptance criteria need more than 3 bullets
- It touches 2 or more independent subsystems
- The title contains "and" (sign it is two tasks)

#### Acceptance Criteria

Quote spec.yaml examples verbatim. Copy the `input` and `expect` values directly — do not paraphrase or rewrite them. Format: `SCENARIO-ID: { input } → { expect }`.

#### Ordering

- Place spec test (*.spec.test.tsx) generation first. If prerequisite work is needed, place it before with a reason
- Order tasks starting with those that have the fewest dependencies
- Place high-risk tasks early (fail fast)
- Each task must leave the system in a working state

#### Checkpoint Discipline

Insert a checkpoint after every 2-3 tasks. A checkpoint verifies: all tests pass, build succeeds, and the vertical slice works end-to-end.

#### Testing

Include implementation test pass in the acceptance criteria of each implementation task.

#### Wireframe Integration

- If wireframe.html exists, reflect component types in the task's implementation targets
- For components identified in the wireframe that don't exist in the project, check package registry for installability before implementing directly

#### Other

- Reflect codebase exploration results in the Affected Files section
- Task references include only external sources that the executor cannot find on their own (for skills, only name + keywords)

Save as `artifacts/<feature>/plan.md`.

## Step 7: Independent Review

Invoke the `plan-reviewer` agent to verify inconsistencies between the above inputs and plan.md.

If gaps exist, show them to the user, let them select which gaps to address, and apply them to plan.md.

## Step 8: Present for Human Review

Present the complete plan.md to the user. Ask for approval or revision requests. Apply any requested changes. Do not proceed until the user approves.

## Done

Inform the user whether to proceed with `/execute-plan <feature>`.
