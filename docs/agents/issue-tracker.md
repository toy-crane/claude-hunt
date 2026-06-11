# Issue tracker: Linear

Issues live in the Linear **Claude Hunt** team (`teamId: 400292c4-1535-4271-81df-e7b83257a207`, identifiers `CLA-N`). All operations go through the Linear MCP tools (`list_issues`, `get_issue`, `save_issue`, `save_comment`, `list_comments`, …). Do not use `gh` issues or scratch files as a tracker.

## Tool gotchas (verified 2026-06)

- **`team` parameter**: pass the team UUID (or the display name `"Claude Hunt"`). The slug `claude-hunt` silently returns empty results from `list_issues` — no error. `list_issue_labels` accepts only the UUID.
- **Archived issues leak**: `list_issues` defaults to `includeArchived: true`. Always pass `includeArchived: false` — archiving is an explicit "out of the queue" signal; never triage or dispatch an archived issue.
- The MCP namespace prefix varies by environment (connector vs. plugin). Rely on the tool names above, not a hardcoded prefix.

## Rules

- **Creating issues**: new issues go through the `capture-issue` skill — never call `save_issue` directly to create one. The skill enforces team, state, and label defaults.
- **Reading an issue**: `get_issue` with the identifier (`CLA-N`) or ID. Comments come from `list_comments`.
- **Listing issues**: `list_issues` with the team UUID plus `state` / `label` filters and `includeArchived: false`.
- **Commenting**: `save_comment` with `issueId` and a Markdown `body`.
- **Changing labels**: `save_issue` with `id` and `labels`. `labels` overwrites the full set — read the current labels first and pass the complete final list.
- **Moving state**: `save_issue` with `id` and `state`. Team states: `Backlog` · `Todo` · `In Progress` · `In Review` · `Done` · `Canceled` · `Duplicate`.

## State transition points

The issue-processing loop touches state in three places:

- Dispatch picks an issue up → `In Progress` (if it is already In Progress, another session owns it — skip)
- A PR is created → `In Review`
- A dispatch fails → back to `Todo` (+ `dispatch-failed` label)

`Done` after merge is handled by the Linear GitHub integration.

## Branch naming

Put the issue identifier in the branch name, lowercase (e.g. `dispatch-cla-123`). The Linear GitHub integration detects the identifier, auto-links the PR to the issue, and moves the issue to Done on merge. Do not use the `gitBranchName` Linear suggests — it can contain Korean characters.

## When a skill says "file it on the issue tracker"

Create the issue in the Linear Claude Hunt team via the `capture-issue` skill.

## When a skill says "fetch the ticket"

`get_issue` for the body, `list_comments` for the discussion.
