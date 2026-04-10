#!/bin/bash
FILE_PATH=$(jq -r '.tool_input.file_path')

if [[ ! "$FILE_PATH" =~ \.(js|jsx|ts|tsx|mjs|json|jsonc|css)$ ]]; then
  exit 0
fi

# Try auto-fix first
bunx ultracite fix "$FILE_PATH" >/dev/null 2>&1

# Check for remaining errors
RESULT=$(bunx ultracite check "$FILE_PATH" --colors=off 2>&1)

if [ $? -eq 0 ]; then
  exit 0
fi

echo "$RESULT" >&2
exit 2
