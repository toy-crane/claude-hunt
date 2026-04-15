---
name: init-project
description: Initialize this Next.js template for local development. Use this skill when the user wants to set up the project, install dependencies, or configure Supabase. Trigger on phrases like "init project", "set up", "initialize", "configure".
user-invocable: true
---

# Init Project — Local Development Setup

Initialize this template for local development by installing dependencies, configuring Supabase, and verifying the setup.

## Required Inputs

| Input | Where | How to get |
|-------|-------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `.env` | Printed by `supabase start` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `.env` | Printed by `supabase start` |

## Optional Inputs

| Input | Where | How to get |
|-------|-------|------------|
| shadcn preset | re-run `shadcn init` | User preference (default: `radix-lyra`) |
| Google OAuth credentials | `supabase/.env` | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) |
| GitHub OAuth credentials | `supabase/.env` | [GitHub Developer Settings](https://github.com/settings/developers) |

## Workflow

### Step 1: Gather Input

Ask the user:
- Whether they want a different **shadcn preset** (default `radix-lyra`, a URL, or skip to keep current)
- Whether they need **OAuth login** (Google/GitHub)

If the user chose a different shadcn preset:
```bash
bunx shadcn@latest init -d -p <preset>
```

### Step 2: Install & Configure Supabase

See [supabase-setup.md](./supabase-setup.md) for dependency installation, environment configuration, and local Supabase startup.

### Step 3: Configure OAuth Providers (Optional)

If the user wants Google/GitHub login, see [supabase-auth.md](./supabase-auth.md) for credential setup.

Skip this step if the user does not need OAuth.

### Step 4: Pin Vercel Function Region (recommended before first deploy)

See [vercel-region.md](./vercel-region.md). Co-locate the Vercel function region with your Supabase region so SSR/RSC database calls don't pay cross-region latency. One-time edit to `vercel.json`.

### Step 5: Verification

See [verification.md](./verification.md) for build, lint, and database verification.

### Step 6: Summary

Display the result:

```
Project initialized successfully!

  Scripts:
    bun dev          Start dev server (Turbopack)
    bun run build    Production build
    bun run check    Lint + format check (Ultracite)
    bun run fix      Auto-fix (Ultracite)
    bun run typecheck  TypeScript check

  Supabase:
    supabase start   Start local Supabase
    supabase stop    Stop local Supabase
    supabase test db Run pgTAP tests

  Claude Code hook: auto-fix on Write|Edit
```

## Constraints

- Do NOT create sub-agents. Perform all steps inline.
- Do NOT skip the verification step (4). If it fails, report errors and fix them.
- Keep all file patches minimal — read first, modify only what's needed, preserve existing content.
- All output and skill content must be in English.
