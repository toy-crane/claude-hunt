#!/bin/bash
set -e

# WorktreeRemove hook: stop the dev server started by worktree-create.sh and clean up.

INPUT=$(cat)

# Hook payload may carry name or path; derive name from whichever is present.
NAME=$(echo "$INPUT" | jq -r '.name // empty')
WORKTREE_PATH=$(echo "$INPUT" | jq -r '.path // empty')
if [ -z "$NAME" ] && [ -n "$WORKTREE_PATH" ]; then
  NAME=$(basename "$WORKTREE_PATH")
fi

if [ -z "$NAME" ]; then
  echo "worktree-remove: no name/path in hook input, nothing to clean up" >&2
  exit 0
fi

SAFE_NAME="${NAME//\//-}"
PID_FILE="/tmp/claude-hunt-dev-${SAFE_NAME}.pid"
LOG_FILE="/tmp/claude-hunt-dev-${SAFE_NAME}.log"

if [ -f "$PID_FILE" ]; then
  PID=$(cat "$PID_FILE")
  if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then
    echo "Stopping dev server PID $PID..." >&2
    # next-dev runs as a child of bun; kill children first, then the parent
    pkill -P "$PID" 2>/dev/null || true
    kill "$PID" 2>/dev/null || true
  fi
  rm -f "$PID_FILE"
fi

rm -f "$LOG_FILE"
