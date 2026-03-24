# Step 5: Cleanup and Verification

## 5a. Auto-fix all files

```bash
bunx ultracite fix
```

## 5b. Fix `import * as React` patterns

Search for namespace React imports and convert to named imports:
```bash
grep -rl 'import \* as React' --include="*.tsx" --include="*.ts" .
```

For each file found, replace `import * as React from "react"` with specific named imports (e.g., `useEffect`, `useState`, `type ComponentProps`) based on actual usage in the file. In React 19, JSX no longer requires a React import.

## 5c. Verify the setup

Run in parallel:
```bash
bun run typecheck
bun run check
```

Both should exit with code 0. If either fails, investigate and fix before proceeding.

## 5d. Verify Supabase

```bash
supabase db reset
supabase test db
```

Both should complete without errors. If tests fail, investigate and fix before proceeding.
