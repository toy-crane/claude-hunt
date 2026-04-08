---
name: draft-plan
description: Create an implementation plan based on spec.yaml. Find related skills via skill-researcher and generate a TDD-based task list. Triggered by "/draft-plan", "create plan", "implementation plan", etc.
argument-hint: "feature name"
---

# Create Implementation Plan

## Step 1: Check Prerequisites

Extract the feature name from $ARGUMENTS.

- `artifacts/spec.yaml` -- If missing, output "Please run `/write-spec` first." and stop
- `artifacts/<feature>/spec.md` -- Optional
- `artifacts/<feature>/wireframe.html` -- Optional

## Step 2: Codebase Exploration

Explore the existing code to understand the architecture and related patterns.

- Check project structure, existing components, and state management approach
- Identify files this feature will affect and their dependency relationships
- If similar existing functionality exists, reference its implementation

## Step 3: Skill Search

Invoke the `skill-researcher` agent to find skills that can help with this feature's scenarios.

Show the recommendation list to the user and receive confirmation/adjustments.

## Step 4: Fill in the Blanks

Read the above inputs and find items that are needed for implementation but not yet decided.

- Only ask about decisions with high cost of change
- One question at a time, present 2-4 options

## Step 5: Generate Plan Document

Read `references/plan-template.md` and write following its format.

### Plan Requirements

#### Task Writing Principles
- Tasks include only What and acceptance criteria. Exclude How since the codebase may change
- Task references include only external sources that the executor cannot find on their own (for skills, only name + keywords)

#### Ordering
- Place spec test (*.spec.test.tsx) generation first. If prerequisite work is needed, place it before with a reason
- Order tasks starting with those that have the fewest dependencies

#### Testing
- Include implementation test pass in the acceptance criteria of each implementation task

#### Wireframe Integration
- If wireframe.html exists, reflect component types in the task's implementation targets
- For components identified in the wireframe that don't exist in the project, check package registry for installability before implementing directly

#### Other
- Reflect codebase exploration results in the Affected Files section

Save as `artifacts/<feature>/plan.md`.

## Step 6: Independent Review

Invoke the `plan-reviewer` agent to verify inconsistencies between the above inputs and plan.md.

If gaps exist, show them to the user, let them select which gaps to address, and apply them to plan.md.

## Done

Inform the user whether to proceed with `/execute-plan <feature>`.
