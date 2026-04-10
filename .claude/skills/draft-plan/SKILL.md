---
name: draft-plan
description: Create an implementation plan based on spec.yaml. Discover related skills and generate a TDD-based task list with vertical slicing and dependency ordering. Triggered by "/draft-plan", "create plan", "implementation plan", etc.
argument-hint: "feature name"
---

# Create Implementation Plan

## Step 1: Check Prerequisites

Extract the feature name from $ARGUMENTS.

Required (project-level, shared across all features):
- `artifacts/spec.yaml` -- If missing, output "Please run `/write-spec` first." and stop

Optional (per-feature):
- `artifacts/<feature>/spec.md`
- `artifacts/<feature>/wireframe.html`

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

## Step 4: Discover Skills

Scan `.claude/skills/` and select every skill that has even a slight connection to this feature.
When in doubt, include it — builders can ignore what they don't need.

## Step 5: Fill in the Blanks

Read the above inputs and find items that are needed for implementation but not yet decided.

- Only ask about decisions with high cost of change
- One question at a time, present 2-4 options

## Step 6: Generate Plan Document

Read each confirmed skill's SKILL.md. The plan must not contradict rules that builders will load during execution.

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

Quote spec.yaml examples verbatim. Copy the `input` and `expect` values directly — do not paraphrase or rewrite them. Use the checkbox format from plan-template.md: `- [ ] SCENARIO-ID: { input } → { expect }`.

#### Ordering

- Place spec test (*.spec.test.tsx) generation first. If prerequisite work is needed, place it before with a reason
- Order tasks starting with those that have the fewest dependencies
- Place high-risk tasks early (fail fast)
- Each task must leave the system in a working state

#### Checkpoint Discipline

Insert a checkpoint after every 2-3 tasks. A checkpoint verifies: all tests pass, build succeeds, and the vertical slice works end-to-end.

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
