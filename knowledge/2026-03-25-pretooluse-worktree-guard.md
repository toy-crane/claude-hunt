---
title: "PreToolUse Hook to Guard Worktree File Boundaries"
date: 2026-03-25
category: tooling
tags: [claude-code, hooks, git-worktrees, pretooluse]
severity: medium
---

## Problem

When Claude Code runs in a git worktree, it can accidentally edit files in the main repo instead of the worktree copy. This happened when `worktree-create.sh` was edited at the main repo path rather than the worktree path, causing an unintended dirty state in the main repo.

## Root Cause

Claude Code has no built-in boundary enforcement for worktrees. File paths are absolute, and nothing prevents an Edit/Write tool call from targeting a file outside the current worktree. The main repo and worktrees share the same parent directory structure (`.claude/worktrees/<name>/`), making path confusion easy.

## Solution

Added a `PreToolUse` hook (`worktree-guard.sh`) using a **deny-list** approach:

1. If not in a worktree (`$PWD` doesn't contain `/.claude/worktrees/`), allow everything
2. Extract `file_path` from the tool input JSON
3. Compute `MAIN_REPO_ROOT` by stripping `/.claude/worktrees/*` from `$PWD`
4. Compute `WORKTREE_ROOT` via `git rev-parse --show-toplevel`
5. **Deny** if file is in `MAIN_REPO_ROOT` but not in `WORKTREE_ROOT`

Key design decisions:
- **Deny-list over allow-list** — only blocks the main repo, doesn't restrict edits to other system paths (e.g., `~/.claude/plans/`)
- **Matcher `Edit|Write`** — Read/Grep/Glob are non-destructive and allowed everywhere
- **Bash not guarded** — heuristic path parsing in shell commands is unreliable and produces false positives

## Prevention

- The PreToolUse hook itself prevents this class of error automatically
- When creating new worktree hooks, always test from within a worktree to verify path resolution
- `git rev-parse --show-toplevel` correctly returns the worktree root (not the main repo) when run from inside a worktree

## Related Files

- `.claude/hooks/worktree-guard.sh` — the PreToolUse guard script
- `.claude/settings.json` — hook configuration (`PreToolUse` section)
