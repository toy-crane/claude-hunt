---
name: write-spec
description: Write a feature spec through conversation with the user. Simulate user flows, fill in the blanks with questions, then generate spec.md (discussion record) and spec.yaml (verifiable requirements). Trigger with "/write-spec", "write spec", "define feature", etc.
argument-hint: "feature description"
---

# Write Spec

## Step 1: Pre-exploration

Explore existing context before asking questions. Read in order if they exist:

1. `artifacts/<feature>/idea.md` — core idea, design principles (don't re-ask decided items)
2. `artifacts/spec.yaml` — related scenarios
3. `artifacts/<feature>/spec.md`
4. `artifacts/<feature>/references/` — extract scenario candidates from screen composition; ignore visual design
5. Related components in the codebase

For entirely new features, skip 2–5 but still check the references/ directory.

## Step 2: Surface Assumptions

Before asking questions, list what you are assuming based on exploration:

```
ASSUMPTIONS I'M MAKING:
1. ...
2. ...
→ Correct me now or I'll proceed with these.
```

Don't silently fill in ambiguous requirements. The spec's purpose is to surface misunderstandings before code gets written.

## Step 3: Reframe as Success Criteria

Translate vague requirements from the user's description into concrete, testable conditions:

```
REQUIREMENT: "Make the dashboard faster"

REFRAMED:
- Dashboard LCP < 2.5s on 4G connection
- Initial data load completes in < 500ms
→ Are these the right targets?
```

If the user's description is already concrete, skip this step.

## Step 4: Iterative Questioning

Simulate user flows for `$ARGUMENTS` and find the blanks.
At each step, check the happy path, error paths, boundary conditions, and intersections with existing features.

Classify by cost of change:
- **High cost of change**: Must ask
- **Low cost of change**: Suggest a default and move on

### Question Rules

- One question at a time. Present 2-4 options and do not proceed until receiving a response
- Before asking, first check if the answer can be found in the codebase
- If there are intersections with existing scenarios, mention them specifically when asking
- If there are no new discoveries for 3 or more rounds, move to the next step. However, if there are unexplored branches with high cost of change, ask about those first

## Step 5: Save Attached Images

If the user attached images during the conversation, save them to `artifacts/<feature-name>/references/`.

- Filename: English kebab-case describing the image content (e.g., `main-dashboard-layout.png`)
- If the same image already exists, skip it
- After saving, notify in one line which file was saved

## Step 6: Generate spec.md

Read `references/spec-template.md` and write according to that format.

### Writing Rules

- Do all success criteria specify concrete input -> expected output
- Do scope exclusion items have reasons
- Undecided items are recorded only for items the user said they don't know

Filename: `artifacts/<feature-name>/spec.md`

## Step 7: Extract spec.yaml

Extract scenarios from spec.md into `artifacts/spec.yaml`. Follow the criteria in `references/scenario-guide.md` and the structure in `references/spec-example.yaml`.

### Extraction Rules

- ID format: `{FEATURE}-{NNN}` (assign sequentially without conflicting with existing numbers)
- If `artifacts/spec.yaml` already exists, append to features. If not, create a new one
- Write input/expect in `examples` with concrete values verifiable on screen

### Verification Checklist (before saving)

- [ ] Is the input a concrete value (an actual value, not a placeholder)
- [ ] Is the expect a value that can be asserted on screen (not internal state)
- [ ] Do given/when/then meet the criteria in `references/scenario-guide.md`
- [ ] Are there no duplicate scenarios with the same meaning
- [ ] Is there at least 1 example

## Step 8: Gap Check

After saving spec.yaml, invoke the `spec-reviewer` agent to verify missing scenarios between spec.md and spec.yaml.

If there are gaps, show them to the user, let them select which gaps to incorporate, and add them applying the rules from Step 5.

## Done

If the spec includes UI changes, guide to `/sketch-wireframe`; otherwise, guide to `/draft-plan`.
