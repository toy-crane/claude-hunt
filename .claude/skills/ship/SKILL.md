---
name: ship
description: Deploy the current main branch to production — runs local safety checks, applies pending Supabase migrations against the production DB, then deploys via Vercel CLI. Synchronous end-to-end; any failure stops the pipeline and surfaces output in the terminal. Trigger on deploy requests like "ship", "ship it", "배포해", "배포해줘", "프로덕션 배포", "deploy to production", "ship to prod".
user-invocable: true
---

# Ship to Production

Local, synchronous production deploy pipeline. Replaces the GitHub Actions equivalent so failures surface in the terminal immediately instead of requiring a trip to the Actions tab.

## Prerequisites

Before the first run, the following must be true on the host machine:

- `jq` installed (used to read `config.json`)
- `vercel` CLI installed and authenticated (`vercel whoami` works)
- `supabase` CLI installed and authenticated (`supabase projects list` works)
- `.vercel/project.json` present (run `vercel link` once if not)
- `supabase/.temp/project-ref` present (run `supabase link --project-ref <ref>` once if not)
- Production target IDs declared in `.claude/skills/ship/config.json`

## Workflow

### Step 1: Preconditions

Abort on any failing check. Each failure message must tell the user exactly how to fix it.

```bash
CONFIG=".claude/skills/ship/config.json"

[ -f "$CONFIG" ] || { echo "Missing $CONFIG"; exit 1; }

EXPECTED_VERCEL=$(jq -r .production.vercel.projectId "$CONFIG")
EXPECTED_SUPABASE=$(jq -r .production.supabase.projectRef "$CONFIG")

BRANCH=$(git branch --show-current)
[ "$BRANCH" = "main" ] || { echo "Not on main (currently: $BRANCH)"; exit 1; }

[ -z "$(git status --porcelain)" ] || { echo "Working tree is dirty — commit or stash first"; exit 1; }

git fetch origin main
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)
[ "$LOCAL" = "$REMOTE" ] || { echo "Local main ($LOCAL) differs from origin/main ($REMOTE) — pull/push first"; exit 1; }

[ -f .vercel/project.json ] || { echo "Vercel not linked — run: vercel link"; exit 1; }
ACTUAL_VERCEL=$(jq -r .projectId .vercel/project.json)
[ "$ACTUAL_VERCEL" = "$EXPECTED_VERCEL" ] || { echo "Vercel linked to wrong project: $ACTUAL_VERCEL (expected $EXPECTED_VERCEL)"; exit 1; }

ACTUAL_SUPABASE=$(cat supabase/.temp/project-ref 2>/dev/null || echo "")
[ "$ACTUAL_SUPABASE" = "$EXPECTED_SUPABASE" ] || { echo "Supabase linked to wrong project: '$ACTUAL_SUPABASE' (expected $EXPECTED_SUPABASE) — run: supabase link --project-ref $EXPECTED_SUPABASE"; exit 1; }
```

### Step 2: Safety net — typecheck and unit tests

```bash
bun run typecheck
bun run test:unit
```

If either fails, stop. Surface the full output to the user — do NOT try to fix and retry autonomously.

### Step 3: Apply production migrations

```bash
supabase db push
```

If this fails:
- Stop immediately
- Report that `main` now contains code that expects a schema that is not yet applied to production
- Recommend either: investigate the migration failure and retry, or revert the offending commit on `main`

Do NOT proceed to Vercel deploy under any circumstance if migration fails.

### Step 4: Deploy to Vercel

```bash
vercel --prod
```

Stream the output to the terminal. On success, capture the deployment URL from the last line of output.

### Step 5: Report

Output a compact summary:

> Shipped **<short-sha>** to production.
> Deployment: **<vercel-url>**
> Primary domain: <https://www.claude-hunt.com>

## Constraints

- Target environment is always **production** — there is no staging variant of this skill
- Never skip or auto-fix failing preconditions (git state, project link mismatch)
- Never proceed past a failing migration step
- Never invoke `vercel --prod --force` or similar overrides
- Expected project IDs come from `config.json` — do NOT accept overrides via CLI args or env vars; changing the target requires a config edit committed to the repo
