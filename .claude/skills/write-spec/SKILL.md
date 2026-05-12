---
name: write-spec
description: Write a feature spec through conversation with the user. Simulate user flows, fill in the blanks with questions, then generate spec.md (a single WHAT-only specification covering scope, scenarios, and invariants). Accepts a Linear issue identifier (e.g. CLA-8) as the seed. Trigger with "/write-spec", "write spec", "define feature", etc.
argument-hint: "feature description | Linear issue id (e.g. CLA-8)"
---

# Write Spec

The output of this skill is a single document: `artifacts/<feature-name>/spec.md`. The spec describes WHAT the feature must do from an externally observable perspective. Implementation choices (FSD slice placement, file layout, table schemas, test types, libraries) belong in `plan.md`, not here.

## Step 1: Resolve Input and Ensure Worktree

`/write-spec` accepts two input modes. Detect which one applies before doing anything else.

**Mode A — Linear issue.** `$ARGUMENTS` matches a Linear identifier (uppercase team key + `-` + number, e.g. `CLA-8`).

1. Fetch the issue with `mcp__plugin_linear_linear__get_issue`. If the fetch fails or the issue does not exist, stop and surface the error — do not fall back to Mode B.
2. Derive `<feature>` as `<lowercase-id>-<title-slug>`, where `<title-slug>` is up to 5 significant words from the issue title, lowercased and hyphen-separated. Drop articles and prepositions. Example: `CLA-8` "Enable SDD workflow to consume Linear issues as input" → `cla-8-enable-sdd-workflow`.
3. The **seed description** for the rest of this skill is the issue's title and description. Keep the fetched issue body in context so later steps can read it.

**Mode B — Free text.** `$ARGUMENTS` is a plain feature description. Derive `<feature>` from `$ARGUMENTS` (lowercased, hyphen-separated, max 5 words). The **seed description** is `$ARGUMENTS`.

After deriving `<feature>`, ensure a worktree:

- If the path contains `.claude/worktrees/`, continue to Step 2.
- Otherwise, invoke `/create-worktree feat/<feature>`. The session will switch into the new worktree, then continue to Step 2.

## Step 2: Pre-exploration

Explore existing context before asking questions. Read in order if they exist:

1. `artifacts/<feature>/idea.md` — core idea and design principles (do not re-ask decided items)
2. `artifacts/<feature>/spec.md` — prior discussion record, if a previous pass exists

For entirely new features, only check idea.md.

## Step 3: Surface Assumptions

Before asking questions, list what you are assuming based on exploration:

```
ASSUMPTIONS I'M MAKING:
1. ...
2. ...
→ Correct me now or I'll proceed with these.
```

In Mode A (Linear issue), seed this list from the issue's title, description, and any acceptance hints already present. Each seeded assumption must be a claim the issue commits to, not a paraphrase. List Linear-sourced assumptions first, then exploration-derived ones.

Don't silently fill in ambiguous requirements. The spec's purpose is to surface misunderstandings before code gets written.

## Step 4: Reframe as Success Criteria

Translate vague requirements from the **seed description** into concrete, testable conditions:

```
REQUIREMENT: "Make the dashboard faster"

REFRAMED:
- Dashboard LCP < 2.5s on 4G connection
- Initial data load completes in < 500ms
→ Are these the right targets?
```

If the user's description is already concrete, skip this step.

## Step 5: Iterative Questioning

Simulate user flows for the **seed description** and find the blanks. At each step, check the happy path, error paths, boundary conditions, and intersections with existing features.

Keep questions about WHAT the user can observe — not about HOW it is built. Avoid questions about file paths, slice placement, table design, or test strategy.

Classify by cost of change:
- **High cost of change**: Must ask
- **Low cost of change**: Suggest a default and move on

### Question Rules

- One question at a time. Present 2-4 options and do not proceed until receiving a response
- Before asking, first check if the answer can be found in the codebase or in existing spec/idea documents
- If a question intersects an existing scenario, mention that scenario specifically
- After 3 rounds with no new discoveries, move to the next step — unless an unexplored branch has a high cost of change, in which case ask about that first

## Step 6: Generate spec.md

If the user attached images, save them to `artifacts/<feature-name>/references/` first.

Read `references/spec-template.md` and write following that format. Use `references/spec-example.md` as a model for tone and concreteness, and `references/scenario-guide.md` for Given/When/Then and Success Criteria rules.

### Writing Rules

- **WHAT only.** No FSD slices, file paths, table or column names, test types, or library names appear in spec.md.
- **Success Criteria are observable.** Every bullet describes input → output that a user, an API consumer, or a test harness can verify externally. Never reference internal state or function calls.
- **Excluded items have a reason.**
- **Undecided Items only record items the user explicitly could not decide.**
- **Use Invariants for cross-scenario rules** (security, performance, data consistency). Omit the section if none apply.

Filename: `artifacts/<feature-name>/spec.md`

## Done

If the spec includes UI changes, guide to `/sketch-wireframe`; otherwise, guide to `/draft-plan`.
