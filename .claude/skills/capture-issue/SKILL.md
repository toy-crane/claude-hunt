---
name: capture-issue
description: Use when the user wants to capture a new issue idea to Linear for later refinement. Triggers on "capture", "capture issue", "log to linear", "track this", "캡쳐", "이슈 캡쳐", "이슈 만들어", "이슈 추가", "Linear에 올려". This is the single entry point for all new bugs, features, refactors, chores, and docs work in the claude-hunt repo — including meta-tooling like skills, hooks, and rules. Do not invoke save_issue directly for new issues; this skill enforces team and label defaults.
user-invocable: true
---

# Capture issue to Linear

The single ingestion gate for new requirements in this repo. Move fast: don't propose follow-ups, don't summarize, don't ask anything optional. The only acceptable prompt is the one in Step 3 (refine-readiness).

## Locked parameters — never deviate

When calling `mcp__claude_ai_Linear__save_issue`:

- `team`: `"claude-hunt"` (id `400292c4-1535-4271-81df-e7b83257a207`)
- `assignee`: `"me"`
- `state`: `"Backlog"`
- Do not set `project`, `priority`, `estimate`, `cycle`, `milestone`.

If the user's request implies a different team, project, or state, ignore that signal and use the locked values — this skill exists to enforce them.

## Steps

### 1. Parse input
Extract a `title` (one-line essence) and an optional `rawNote` (extra lines the user typed). If the user only gave a single phrase, the title doubles as the rawNote.

### 2. Collect context
Run silently, no user prompts:

- `git rev-parse --abbrev-ref HEAD` → current branch
- `git status -s` → top 5 changed paths (truncate the rest)

### 3. Refine-readiness self-check
Before creating the issue, ask: "Given `title` + `rawNote` + branch + recent files, could a future refinement pass reconstruct *what this issue is about* — enough to write a proper Summary and Acceptance criteria?"

If yes → proceed.

If no (input is too vague, e.g. "something is weird", "fix this") → call `AskUserQuestion` **once** with a single free-text question asking the user to add a short clarifying line. Append their answer to `rawNote`. Do not loop, do not ask a second time.

Refinement cannot recover information that capture failed to record. This is the only point where slowing capture down is acceptable.

### 4. Decide label
Apply **at most one** label from this team-scoped set: `bug`, `feat`, `refactor`, `chore`, `docs`.

- Apply a label only when the user's intent clearly fits one. The semantics are standard conventional-commit terms — judge from the input.
- When two labels plausibly fit, apply none.
- When intent is unclear, apply none.
- Never invent a label outside this set. Never apply more than one. Never guess.

### 5. Build description
Use this exact markdown — heading levels and order are part of the contract for the future `refine-issue` skill:

    ## Raw note
    {rawNote}

    ## Context
    - Branch: {branch}
    - Recent files:
      - {path}
      - {path}

Do not add extra sections, timestamps, repo names, or HTML wrappers.

### 6. Create the issue
Call `mcp__claude_ai_Linear__save_issue` with:

- `team: "claude-hunt"`
- `assignee: "me"`
- `state: "Backlog"`
- `title`
- `description` (from Step 5)
- `labels: [<label>]` if one was chosen, otherwise omit

### 7. Report
Read the `identifier` and `url` from the response (e.g. `CLA-7`).

Output exactly one line:

    Created <identifier> · <label or "no label"> · <url>

Stop. Do not propose next actions. Do not echo the description.

## Failure modes

- **`save_issue` returns an error** → output the verbatim error. Do not claim success.
- **Empty title** → ask once via `AskUserQuestion` for the title (the only required field). One question, no loop.
- **Sparse input** → see Step 3.

## Hard constraints

- Never call `mcp__claude_ai_Linear__save_issue` for a new issue outside this flow.
- Never set `team` to anything other than `"claude-hunt"`.
- Never apply a label outside `bug` / `feat` / `refactor` / `chore` / `docs`.
- Never ask more than one clarifying question per capture.
