# `/ship` skill replaces GitHub Actions

## Date
2026-04-17

## Problem

The previous deploy pipeline (see [`2026-04-08-production-deploy-workflow.md`](./2026-04-08-production-deploy-workflow.md)) ran **test → migrate → deploy** as three sequential GitHub Actions jobs triggered by push to `main`.

Two real pain points emerged in solo use:

1. **Wait without feedback** — every merge required watching the Actions tab for 2–3 minutes before knowing whether the deploy had happened.
2. **Silent migration failures** — on at least one occasion, `supabase db push` failed, the Vercel deploy was correctly gated off, but the failure went unnoticed for hours because the developer never came back to check the Actions tab. The merge *appeared* successful; the code simply never reached production.

The root cause was not the pipeline's structure (the gate worked as designed) but the **asynchronous, out-of-terminal** nature of GitHub Actions for a solo workflow where there is no team to triangulate status.

## Solution

Move the pipeline into a local, synchronous `/ship` skill invoked from the terminal after `/merge`. Any failure surfaces in the active terminal immediately — no tab to check, no waiting.

### Architecture

```
feature branch → /merge → main (synced with remote)
                                      │
                                      ▼
                                 /ship
                                      │
                    ┌─────────────────┼──────────────────┐
                    ▼                 ▼                  ▼
              preconditions      safety net          migrate
              (branch/clean/   (typecheck +      (supabase db push)
               link match)       test:unit)
                                                         │
                                                         ▼
                                                   deploy (vercel --prod)
```

Each stage stops the pipeline on failure. No stage is retried automatically.

### Files

| Path | Purpose |
|------|---------|
| `.claude/skills/ship/SKILL.md` | The skill itself — workflow, trigger phrases, constraints |
| `.claude/skills/ship/config.json` | Production target IDs (Vercel `projectId`, Supabase `projectRef`) |

### Removed

All four GitHub workflow files were deleted:

- `.github/workflows/production.yml` (replaced by `/ship`)
- `.github/workflows/ci.yml` (redundant — same checks run in `/ship` preconditions)
- `.github/workflows/claude-code-review.yml` (collaboration tool, unused solo)
- `.github/workflows/claude.yml` (collaboration tool, unused solo)

The `.github/` directory no longer exists.

### Vercel auto-deploy

Already disabled via `vercel.json`:

```json
{ "git": { "deploymentEnabled": false } }
```

This means **no** git push to `main` triggers a deploy — `/ship`'s `vercel --prod` call is the only production deploy path.

## Key Decisions

- **Migration runs AFTER merge, not before** — preserves "main = single source of truth for what should be on prod". Accepts the trade-off that a failed migration leaves `main` briefly ahead of the DB schema; mitigated by expand/contract migration discipline and the immediate terminal feedback.
- **Project IDs live in `config.json`, not `SKILL.md`** — separates data from logic. Supabase `projectRef` was already public via `NEXT_PUBLIC_SUPABASE_URL`. Vercel `projectId` is not a credential; deploys require `VERCEL_TOKEN`, which is NOT in the repo.
- **Preconditions fail closed** — `/ship` aborts on any of: wrong branch, dirty tree, diverged remote, missing Vercel link, wrong Vercel projectId, missing Supabase link, wrong Supabase projectRef. Each failure message includes the exact remediation command.
- **`.vercel/project.json` is gitignored** — both Vercel and Supabase link state must be re-established per clone / worktree. Preconditions catch this.

## Local Setup (per clone / worktree)

| Step | Command |
|------|---------|
| Vercel link | `vercel link` |
| Supabase link | `supabase link --project-ref sphsvgudpwjwfurkulmr` |
| Verify | `vercel whoami` + `supabase projects list` |

## Rollback

If `/ship` proves unreliable:

1. `git revert` the commits that removed `production.yml` and `ci.yml`
2. Re-enable `vercel.json` git integration (`deploymentEnabled: true` or remove the block)
3. `/ship` skill files can remain — they are additive

## Related Decisions

- GitHub repo is **public** (`claude-hunt`), so any ID committed to the repo is world-readable. Committed IDs were vetted for sensitivity before inclusion.
- No automated migration rollback exists in either the old or new pipeline — this is an out-of-scope concern that relies on expand/contract migration discipline.
