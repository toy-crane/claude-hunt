---
title: "Claude Code PostToolUse hook for auto-lint with Ultracite"
date: 2026-03-25
category: tooling
tags: [claude-code, hooks, ultracite, biome, bun]
severity: low
---

## Problem

Claude Code's Write/Edit tool outputs don't automatically conform to the project's lint rules (Ultracite/Biome). Without auto-fixing, every file edit requires a manual `bun run fix` pass, and lint violations accumulate silently.

The initial hook (`bun fix --skip=correctness/noUnusedImports`) was an inline command in `.claude/settings.json` — it ran on every file regardless of type, and lacked error handling.

## Root Cause

Two issues with the original approach:

1. **No file extension filter** — The hook ran Ultracite on every file (including `.md`, `.env`, etc.), causing unnecessary processing and potential errors on unsupported file types.
2. **Inline command** — Complex shell logic crammed into a JSON string is hard to read, test, and maintain.

## Solution

Created a standalone script at `.claude/hooks/lint-fix.sh` that:

1. Extracts `file_path` from the hook's stdin JSON via `jq`
2. Skips files that don't match Biome-supported extensions (`.js`, `.jsx`, `.ts`, `.tsx`, `.mjs`, `.json`, `.jsonc`, `.css`)
3. Runs `bunx ultracite fix` on matching files
4. Returns exit 0 on success, exit 2 (blocking error) on failure

```bash
#!/bin/bash
FILE_PATH=$(jq -r '.tool_input.file_path')

if [[ ! "$FILE_PATH" =~ \.(js|jsx|ts|tsx|mjs|json|jsonc|css)$ ]]; then
  exit 0
fi

RESULT=$(bunx ultracite fix "$FILE_PATH" 2>&1)
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  exit 0
else
  echo "$RESULT" >&2
  exit 2
fi
```

Updated `.claude/settings.json` to call the script:

```json
{
  "hooks": {
    "PostToolUse": [{
      "matcher": "Write|Edit",
      "hooks": [{
        "type": "command",
        "command": "bash .claude/hooks/lint-fix.sh",
        "statusMessage": "Running ultracite fix..."
      }]
    }]
  }
}
```

## Prevention

- Always use a separate script file for hooks with any conditional logic — keeps `.claude/settings.json` readable and the script independently testable.
- Pipe-test hook scripts before wiring them up: `echo '{"tool_input":{"file_path":"some/file.ts"}}' | bash .claude/hooks/lint-fix.sh`
- When `noUnresolvedImports` is set to `"warn"` globally (required for Next.js virtual modules), the hook won't block on those warnings — only real lint errors cause exit 2.

## Related Files

- `.claude/hooks/lint-fix.sh` — The lint-fix hook script
- `.claude/settings.json` — Hook configuration
- `biome.jsonc` — Ultracite/Biome linter rules
