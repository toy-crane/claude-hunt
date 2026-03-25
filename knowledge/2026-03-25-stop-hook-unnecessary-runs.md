---
title: "Claude Code Stop Hook Runs Unnecessarily on Every Response"
date: 2026-03-25
category: tooling
tags: [claude-code, hooks, git]
severity: low
---

## Problem

The Claude Code `Stop` hook configured in `.claude/settings.json` ran the full test suite after **every** assistant response, even when no files were modified. This caused unnecessary test failures (e.g., `vitest: command not found` in worktrees without `node_modules`) and slowed down conversations that were purely Q&A.

## Root Cause

`Stop` hooks don't support a `matcher` field like `PostToolUse` hooks do. There is no built-in way to filter `Stop` hooks to only run after file-modifying tool calls. Without an explicit check in the script, it always executes the full test suite.

## Solution

Added a git diff guard at the top of `.claude/hooks/stop-test.sh`:

```bash
# Skip tests if no files were modified
if git diff --quiet HEAD && git diff --cached --quiet; then
  exit 0
fi
```

This checks both unstaged and staged changes against HEAD. If nothing changed, the hook exits immediately without running tests.

## Prevention

- When writing `Stop` hooks, always consider whether the hook should run unconditionally or only when files change.
- Use `git diff --quiet` as a standard guard pattern for test/lint hooks that only make sense after modifications.

## Related Files

- `.claude/hooks/stop-test.sh` — the stop hook script
- `.claude/settings.json` — hook configuration (`Stop` section)
