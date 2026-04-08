---
description: shadcn component rule guard
globs:
  - "**/*.tsx"
  - "**/*.jsx"
---

# shadcn Component Guard

## Rules

When writing tsx/jsx files, read and follow the rule files in the `.claude/skills/shadcn/rules/` directory.

## Strictly Prohibited

- Do not directly modify `components/ui/*` source files
- Do not override the default component styles with className

## When Style Changes Are Needed (Priority)

1. Use variant props
2. Use semantic tokens
3. Adjust CSS variables
4. If none of the above methods work, ask the user for confirmation
