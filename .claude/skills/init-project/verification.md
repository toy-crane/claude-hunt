# Step 5: Verification

Run all checks to confirm the template is correctly configured.

## 5a. Lint & type check

Run in parallel:
```bash
bun run typecheck
bun run check
```

Both should exit with code 0. If either fails, investigate and fix before proceeding.

## 5b. Database

```bash
supabase db reset
supabase test db
```

All pgTAP tests should pass. If tests fail, investigate and fix before proceeding.
