# Production Deployment Workflow

> **Superseded 2026-04-17** by [`2026-04-17-ship-skill-replaces-github-actions.md`](./2026-04-17-ship-skill-replaces-github-actions.md). The GitHub Actions pipeline described below no longer exists; deploys are driven locally by the `/ship` skill. This document is preserved for historical context.

## Date
2026-04-08

## Problem
When a PR merges to main, Vercel's Git integration deploys immediately with no guarantee that Supabase migrations have run first. This race condition can cause the app to hit a schema that doesn't exist yet.

## Solution
A GitHub Actions workflow that enforces deployment order: **test → migrate → deploy**.

### Architecture

```
PR merged to main
       │
       ▼
  ┌─────────┐
  │  Test &  │  bun run typecheck + bun run test:unit
  │Typecheck │
  └────┬─────┘
       │ (on success)
       ▼
  ┌─────────┐
  │ Supabase │  supabase link + supabase db push
  │ Migrate  │
  └────┬─────┘
       │ (on success)
       ▼
  ┌─────────┐
  │  Vercel  │  curl -X POST deploy hook URL
  │  Deploy  │
  └─────────┘
```

### Workflow Files

| File | Trigger | Purpose |
|------|---------|---------|
| `.github/workflows/production.yml` | Push to `main` | Sequential: test → migrate → deploy |
| `.github/workflows/ci.yml` | PR to `main` | Typecheck + unit tests for PR feedback |

### Vercel Auto-Deploy Disabled

`vercel.json` disables auto-deploy for `main` so only the deploy hook triggers production builds. Preview deploys for PRs remain active.

```json
{
  "git": {
    "deploymentEnabled": {
      "main": false
    }
  }
}
```

## GitHub Secrets Required

| Secret | Source |
|--------|--------|
| `SUPABASE_ACCESS_TOKEN` | Supabase Dashboard → Account Settings → Access Tokens |
| `PRODUCTION_DB_PASSWORD` | Supabase Dashboard → Project Settings → Database |
| `PRODUCTION_PROJECT_ID` | Supabase Dashboard → Project Settings → General → Reference ID |
| `VERCEL_DEPLOY_HOOK` | Vercel Dashboard → Project Settings → Git → Deploy Hooks |

## Key Decisions

- **`cancel-in-progress: false`** on production workflow — never cancel a migration mid-flight
- **Unit tests only** (`bun run test:unit`) — DB tests (pgTAP) need local Supabase, too heavy for CI
- **Deploy hook is fire-and-forget** — only confirms Vercel accepted the request. Vercel posts its own commit status check for build results.
- **`supabase/setup-cli@v2`** — latest version of the GitHub Action

## Troubleshooting

- **Migration fails**: The deploy won't proceed (correct behavior). Fix the migration SQL and push again. Supabase applies migrations one at a time, so partial state = last successful migration.
- **Deploy hook returns non-200**: Check that `VERCEL_DEPLOY_HOOK` secret is correct and the hook exists in Vercel dashboard.
- **Tests fail on PR**: CI workflow runs `bun run typecheck` and `bun run test:unit`. Fix locally before merging.
