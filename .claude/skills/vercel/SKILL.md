---
name: vercel
description: Guides Vercel deploy-time configuration — `.vercelignore` upload exclusions, `vercel.json` regions, deploy hook policy. Use this skill whenever editing `vercel.json`, adding or auditing `.vercelignore`, answering region or edge-network questions, or diagnosing `/ship` upload failures ("files should NOT have more than 15000 items", "archive=tgz", etc.). Also triggers on `vercel link`, `.vercel/project.json`, function region overrides, deployment region codes (icn1, hnd1, sfo1, iad1, fra1), and anything touching Vercel project configuration outside application code.
---

# Vercel Deploy Configuration

This skill covers the Vercel **project/deploy** surface — what files leave the repo, what region they run in, and how the deploy is triggered. Application-level performance (React/Next.js patterns) lives in `vercel-react-best-practices`; this skill is strictly about project configuration.

## Core Principles

- **`.vercelignore` is authoritative**: Vercel partially honors `.gitignore`, but an explicit `.vercelignore` is the contract. Anything not meant to reach Vercel must be listed.
- **Region matches the database**: The Vercel function region and the Supabase project region should agree. Cross-region adds 100ms+ per query.
- **Deploys are gated by migration**: `vercel.json` disables Vercel's direct Git deployment for `main`. The default GitHub Actions workflow runs checks and migrations before calling the deploy hook; `/ship` is an emergency manual override.

## Core Config Files

| File | Tracked? | Purpose |
|------|----------|---------|
| `vercel.json` | ✅ | Project config: regions, deploy gating, schema, function overrides |
| `.vercelignore` | ✅ | Deploy-time upload exclusions (applies to every `vercel deploy` / `vercel --prod`) |
| `.vercel/project.json` | ❌ (gitignored) | Per-clone link between local dir and the Vercel project |
| `.github/workflows/production.yml` | ✅ | Default production gate: checks → migrations → deploy hook |
| `.claude/skills/ship/config.json` | ✅ | Emergency `/ship` target ID — preconditions verify `.vercel/project.json` matches |

## Workflows

| Task | Guide |
|------|-------|
| What goes in `.vercelignore`? | [deploy-exclusions.md](references/deploy-exclusions.md) |
| Set or change the function deploy region | [regions.md](references/regions.md) |

## Strictly Prohibited

- **Never commit `.vercel/project.json`** — it's gitignored for a reason (per-clone / per-worktree link state).
- **Never enable direct Git deployment for `main`** while `.github/workflows/production.yml` owns migration ordering. Direct deployment can race ahead of the production schema.
- **Never bypass `.vercelignore` with `vercel --archive=tgz`** as a long-term workaround. The archive flag dodges the 15,000-file limit but still uploads the bloat — fix the exclusion list instead.
- **Never add `.env` or `.env.*` to the repo** to work around the `.vercelignore` exclusion. Production env vars live in the Vercel dashboard.

## Common Commands

| Command | Purpose |
|---------|---------|
| `vercel link` | (Re)link the current directory to a Vercel project — writes `.vercel/project.json` |
| `vercel whoami` | Verify CLI is authenticated |
| `vercel --prod` | Emergency production deploy — invoked by `/ship`, do not run by hand |
| `vercel env pull` | Pull production env vars into `.env.local` for local debug |
