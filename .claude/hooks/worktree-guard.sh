#!/bin/bash

# PreToolUse hook: Block file mutations outside the current worktree.
# Uses deny-list approach — only denies the main repo root.
# Exit 0 = allow, Exit 2 = block.

INPUT=$(cat)

# If not in a worktree, allow everything
if [[ "$PWD" != *"/.claude/worktrees/"* ]]; then
  exit 0
fi

FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path')

# If no file_path in input, allow
if [[ -z "$FILE_PATH" || "$FILE_PATH" == "null" ]]; then
  exit 0
fi

WORKTREE_ROOT="$(git rev-parse --show-toplevel)"
MAIN_REPO_ROOT="${PWD%%/.claude/worktrees/*}"

# Deny: file is in main repo but NOT in current worktree
if [[ "$FILE_PATH" == "$MAIN_REPO_ROOT"/* && "$FILE_PATH" != "$WORKTREE_ROOT"/* ]]; then
  echo "BLOCKED: Cannot edit '$FILE_PATH' from worktree." >&2
  echo "Only files within $WORKTREE_ROOT are allowed." >&2
  exit 2
fi

exit 0
