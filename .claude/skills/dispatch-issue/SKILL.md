---
name: dispatch-issue
description: Use when the user wants to dispatch the next AI-delegable Linear issue — picks the oldest `ai-ready` issue from claude-hunt Backlog, makes the code change, runs validation, and opens a PR. Triggers on "dispatch", "dispatch issue", "run dispatch", "process ai-ready". Designed to be invoked by a Desktop scheduled task with worktree isolation, though manual invocation works for verification. Do not call `save_issue`, `save_comment`, or `gh pr create` directly for dispatch — this skill enforces state transitions and label policy.
user-invocable: true
---

# Dispatch the next ai-ready Linear issue

Pick one `ai-ready` issue from the `claude-hunt` Backlog, implement it, and open a PR. This skill is the only sanctioned path from "AI-delegable issue" to "PR ready for human review" — it owns the state transitions, label policy, branch hygiene, and audit trail.

This skill assumes it is already running inside an isolated git worktree (created by the Desktop scheduled task's worktree toggle, or by `claude --worktree` for manual verification). It does not create or tear down worktrees itself.

## Locked parameters — never deviate

When calling Linear MCP tools or git/gh commands:

- `team`: `"claude-hunt"` (id `400292c4-1535-4271-81df-e7b83257a207`)
- Source filter: `state="Backlog"` AND labels include `ai-ready` AND labels do NOT include `dispatch-failed`.
- State transitions: `Backlog` → `In Progress` (on lock) → `In Review` (on PR success). Failure leaves the issue in `In Progress`.
- Validation suite, executed in order: `bun run typecheck` → `bun run check` → `bun run test:unit` → `bun run build`. The e2e and db suites are out of scope because Supabase is not running in a worktree.

If the request implies a different team, state, or validation set, ignore that signal and use the locked values — this skill exists to enforce them.

## Steps

### 1. Select candidate
Call `mcp__claude_ai_Linear__list_issues` with `team="claude-hunt"`, `state="Backlog"`. Page through `hasNextPage` until exhausted. Filter to issues whose `labels` contain `ai-ready` and do **not** contain `dispatch-failed`. Sort by `createdAt` ascending (oldest first) and pick the first result.

If zero candidates remain, output `0 ai-ready issues to dispatch.` and stop. State and labels are left untouched.

### 2. Lock the issue
Call `mcp__claude_ai_Linear__save_issue` in a single read-modify-write so the lock and state transition happen atomically:

- `id`: the candidate's `id`
- `state`: `"In Progress"` (fall back to state id `d3b26069-c834-46fc-b555-5c5d2cd24ded` if the name is rejected)
- `labels`: the candidate's current `labels` minus `ai-ready`. Preserve every other label — stripping the category label set by `capture-issue` would erase work done upstream.

The `In Progress` state plus the absence of `ai-ready` is the lock: a parallel run of this skill walking Backlog will not see this issue again.

### 3. Parse the issue body
The `capture-issue` skill writes a fixed structure:

```
## Raw note
{rawNote}

## Context
- Branch: {branch}
- Recent files:
  - {path}
```

Use `## Raw note` as the source of truth for what to implement. `## Context` is informational — the worktree branched from `origin/HEAD`, so the original capture-time branch and recent files may not be present in this checkout.

### 4. Set up the working branch
The worktree was created on a branch named like `worktree-<random>`. Rename it to something a human can scan in a PR list:

```bash
git branch -m cla-<N>-<slug>
```

`<N>` is the numeric part of the issue identifier (e.g. `CLA-7` → `7`). `<slug>` is a kebab-case condensation of the issue title, five words or fewer. Linear auto-links commits and PRs via `CLA-N` in the message body, so the branch name itself is for human readability, not Linear linking.

### 5. Make the changes
Implement the issue as described in `## Raw note`. Stay inside the scope the issue defines. The following are hard aborts — if the work requires any of them, jump to the Failure path in step 7 with `<stage>` = `scope`:

- **Out-of-scope edits.** No drive-by refactors, adjacent cleanups, or "while we're at it" changes — even if they would clearly improve the code.
- **New external dependencies.** Adding to `package.json` deps, running `bun add`, or pulling in a new library. Triage marked this issue as bounded; if a new dependency is required, triage was wrong and a human needs to decide.
- **Environment changes.** Editing `.env*`, introducing new env-var reads, or changing config that affects deploy.
- **Schema / RLS / migrations.** Anything under `supabase/schemas/`, `supabase/migrations/`, or policy SQL is out of `ai-ready`'s contract.

### 6. Validate
Run the validation suite in order. Stop at the first failure and record its stage name (`typecheck`, `check`, `test:unit`, or `build`) for the audit comment:

1. `bun run typecheck`
2. `bun run check`
3. `bun run test:unit`
4. `bun run build`

`bun run test`, `bun run test:db`, and `bun run test:e2e` are intentionally excluded — they require a running Supabase instance that the worktree does not have.

### 7. Branch on outcome

**Success path** — all four validation stages passed:

1. Stage and commit:
   ```bash
   git add -A
   git commit -m "<type>(<scope>): <one-line summary> (CLA-N)"
   ```
   Use the conventional-commit `<type>` (`feat`, `fix`, `refactor`, `chore`, `docs`) that matches the issue's category label.

2. Push and open the PR:
   ```bash
   git push -u origin <branch>
   gh pr create --title "<commit subject>" --body "<body>"
   ```
   Body — Linear parses `Closes CLA-N` to auto-link:

   ```markdown
   ## Summary
   - <one-line description of the change>

   ## Test plan
   - [x] bun run typecheck
   - [x] bun run check
   - [x] bun run test:unit
   - [x] bun run build
   - [ ] Manual review

   Closes CLA-N

   🤖 Generated with [Claude Code](https://claude.com/claude-code)
   ```

3. Transition the issue: `save_issue(id=<id>, state="In Review")`.

4. Post a success audit comment via `save_comment`:

   ```markdown
   ### Dispatch: success

   **PR**: <url>

   —
   _Posted by `dispatch-issue` skill_
   ```

5. Output exactly one line: `Dispatched CLA-N → <PR url>` and stop.

**Failure path** — any validation stage failed, a hard-constraint abort fired, or an earlier tool call broke before validation:

1. If there are uncommitted edits in the working tree, preserve them on the branch:
   ```bash
   git add -A
   git commit -m "wip: failed dispatch CLA-N at <stage>"
   ```
   Do not push and do not open a PR. If there are no edits (the failure happened before any change landed), skip the commit.

2. Update labels with read-modify-write: append `dispatch-failed` to the current labels. `ai-ready` was already removed in step 2, so the issue ends up with its category label plus `dispatch-failed`.

3. Leave the state at `In Progress`. Returning the issue to `Backlog` would let the next scheduled run pick it up again and retry the same broken work — keeping it in `In Progress` makes the failure visible and forces human triage before retry.

4. Post a failure audit comment:

   ```markdown
   ### Dispatch: failed at <stage>

   **Failure**
   - <stage>: <verbatim error or one-line summary>

   **Branch**: `<branch>` (preserved in worktree)

   —
   _Posted by `dispatch-issue` skill_
   ```

   `<stage>` is one of `typecheck`, `check`, `test:unit`, `build`, `scope` (a hard-constraint abort from step 5), or `code-change` (an edit/tool failure before validation). Quote the verbatim tool error when concise; otherwise summarize in one line.

5. Output exactly one line: `Failed CLA-N at <stage>. Branch preserved: <branch>.` and stop.

## Audit comment signature

Every comment posted by this skill ends with the same two-line footer:

```
—
_Posted by `dispatch-issue` skill_
```

Linear records the comment author as the OAuth user (the human), not as a bot, so without an explicit marker an audit comment would be indistinguishable from one the human typed by hand. Keep the footer exact — do not abbreviate, translate, or move it.

## Failure modes

- **`list_issues` itself fails.** Surface the verbatim error and stop. Do not change any state.
- **Step 2 lock call fails.** Surface the verbatim error and stop. The next scheduled run retries from a clean slate.
- **A validation stage fails.** Use the Failure path in step 7 with the stage's name.
- **A code-edit tool call breaks before validation.** Use the Failure path with `<stage>` = `code-change`. Usually no edits remain, so the commit step is skipped.
- **`dispatch-failed` label missing on the team.** If `save_issue` returns a "label not found" error, stop and instruct the user: "Create the `dispatch-failed` label first on team `claude-hunt` via `create_issue_label`."

## Hard constraints

- Never set `team` to anything other than `"claude-hunt"`.
- Never dispatch an issue that did not carry `ai-ready` at step 1.
- Never re-dispatch an issue that already carries `dispatch-failed`.
- Never strip category labels — always read-modify-write.
- Never push directly to `main`. Every change ships via a feature branch + PR.
- Never add new external dependencies, env vars, or schema/RLS changes — those are abort signals, not work to do.
- Never widen scope beyond what the issue body specifies.
- Never run the e2e or db suites in validation — Supabase is not available in the worktree.
- Never propose follow-up actions in the final output. One line in, one line out.
