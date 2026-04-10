#!/bin/bash
FILE_PATH=$(jq -r '.tool_input.file_path')

if [[ ! "$FILE_PATH" =~ \.(js|jsx|ts|tsx|mjs|json|jsonc|css)$ ]]; then
  exit 0
fi

# Try auto-fix first
bunx ultracite fix "$FILE_PATH" >/dev/null 2>&1

# Check for remaining errors using github reporter for clean single-line output
RESULT=$(bunx ultracite check "$FILE_PATH" --reporter=github --colors=off 2>&1)
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  exit 0
else
  echo "$RESULT" \
    | grep '::error' \
    | sed 's/::error title=\([^,]*\),file=\([^,]*\),line=\([^,]*\),endLine=[^,]*,col=\([^,]*\),endColumn=[^:]*::/\2:\3:\4 \1: /' \
    >&2
  exit 2
fi
