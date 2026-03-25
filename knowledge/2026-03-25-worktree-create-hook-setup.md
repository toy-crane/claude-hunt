---
title: "Claude Code WorktreeCreate Hook for Auto Environment Setup"
date: 2026-03-25
category: tooling
tags: [claude-code, hooks, git-worktrees, bun]
severity: medium
---

## Problem

When Claude Code creates git worktrees for parallel agent work, the new worktree lacks:
1. **Dependencies** — no `node_modules/` directory (not tracked by git)
2. **Environment files** — `.env` files in `.gitignore` are not copied to the worktree

This causes immediate failures when agents try to run tests, build, or access environment variables in the worktree.

## Root Cause

Git worktrees only include tracked files. Gitignored files like `node_modules/` and `.env` must be set up separately. Without a hook, every worktree requires manual setup.

## Solution

Created a `WorktreeCreate` hook in `.claude/settings.json` that runs `.claude/hooks/worktree-create.sh`. The script:

1. **Reads the worktree name** from stdin JSON (`{"name": "..."}`)
2. **Fetches latest main** with `git fetch origin main` to ensure the remote ref is current
3. **Creates the worktree** at `.claude/worktrees/<name>` via `git worktree add -b <name> origin/main`, branching from the latest remote main
4. **Copies gitignored `.env` files** by finding all `.env*` files (max depth 2), checking each with `git check-ignore`, and copying matches to the worktree
5. **Installs dependencies** with `bun install`
6. **Prints the worktree path** to stdout (required by Claude Code)

Key implementation details:
- `git fetch origin main` runs first to ensure `origin/main` is up to date, preventing worktrees from starting on stale code when local `main` hasn't been pulled
- `git worktree add -b "$NAME" origin/main` creates a named branch from the latest remote main, not the local HEAD
- All stdout is redirected to `/dev/null` to avoid polluting the path output
- `bun install` output goes to stderr so only the worktree path appears on stdout
- Only gitignored `.env` files are copied — tracked ones already exist in the worktree

## Prevention

- Always branch worktrees from `origin/main` (not local `main`) to avoid starting from stale code — local `main` can silently drift behind when using worktrees since you rarely check it out directly.
- When adding new gitignored config files that agents need, update `worktree-create.sh` to include them.
- If the project switches package managers, update the install command in the script.

## Related Files

- `.claude/hooks/worktree-create.sh` — the worktree setup script
- `.claude/settings.json` — hook configuration (`WorktreeCreate` section)
- `supabase/.env.sample` — sample env file for reference
