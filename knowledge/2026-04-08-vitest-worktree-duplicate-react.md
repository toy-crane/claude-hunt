---
title: "Vitest picks up tests from git worktrees causing duplicate React errors"
date: 2026-04-08
category: test-failures
tags: [vitest, git-worktrees, react]
severity: medium
---

## Problem

All spec tests under `.claude/worktrees/add-spec-test/__tests__/` failed with "Invalid hook call. Hooks can only be called inside of the body of a function component." — 9 tests failed simultaneously.

## Root Cause

Vitest's `include: ["**/*.test.{ts,tsx}"]` glob matched test files inside `.claude/worktrees/`, which has its own `node_modules/react`. When those tests rendered components importing from the root project's React, two separate React instances collided — React detects this and throws the "Invalid hook call" error.

## Solution

Added `.claude/worktrees/**` to Vitest's `exclude` array in `vitest.config.ts`:

```ts
exclude: ["**/node_modules/**", ".claude/worktrees/**"],
```

## Prevention

- When using git worktrees in a project, always exclude worktree directories from the root test runner.
- The "Invalid hook call" error with "more than one copy of React" is a strong signal of duplicate `node_modules` — check for nested `node_modules/react` directories.

## Related Files

- `vitest.config.ts`
