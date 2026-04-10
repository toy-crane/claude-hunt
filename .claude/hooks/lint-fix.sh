#!/bin/bash
FILE_PATH=$(jq -r '.tool_input.file_path')

if [[ ! "$FILE_PATH" =~ \.(js|jsx|ts|tsx|mjs|json|jsonc|css)$ ]]; then
  exit 0
fi

# Try auto-fix first
bunx ultracite fix "$FILE_PATH" >/dev/null 2>&1

# Check for remaining errors (with ANSI codes stripped for clean rendering)
RESULT=$(bunx ultracite check "$FILE_PATH" --colors=off 2>&1)
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  exit 0
else
  echo "$RESULT" >&2
  exit 2
fi
