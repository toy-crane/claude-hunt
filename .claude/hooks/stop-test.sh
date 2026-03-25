#!/bin/bash

# Skip tests if no files were modified
if git diff --quiet HEAD && git diff --cached --quiet; then
  exit 0
fi

# Retry counter to prevent infinite retry loops
COUNTER_FILE="/tmp/claude-test-gate-retry"
COUNT=$(cat "$COUNTER_FILE" 2>/dev/null || echo 0)
COUNT=$((COUNT + 1))
echo "$COUNT" > "$COUNTER_FILE"

if [ "$COUNT" -ge 3 ]; then
  echo "Tests still failing after 3 retries. User intervention required." >&2
  rm -f "$COUNTER_FILE"
  exit 0
fi

# Run all tests (unit + db)
if bun run test 2>/tmp/test-gate.err; then
  rm -f "$COUNTER_FILE"
  exit 0
else
  echo "Tests failed (attempt $COUNT/3):" >&2
  tail -30 /tmp/test-gate.err >&2
  exit 2
fi
