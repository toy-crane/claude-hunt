---
name: boilerplate
description: Scaffold a new project from this Next.js template. Use this skill when the user wants to create a new project, set up a frontend boilerplate. Trigger on phrases like "new project", "scaffold", "boilerplate", "init project", "set up Next.js", "새 프로젝트", "보일러플레이트".
argument-hint: <project-name>
user-invocable: true
---

# Boilerplate — Next.js Template Setup

This repo is a production-ready template. Scaffold a new project by cloning it and configuring the required inputs.

## What's Included

| Layer | Stack |
|-------|-------|
| Framework | Next.js 16 + TypeScript (strict) + Turbopack |
| Styling | Tailwind CSS v4 + shadcn/ui (radix-lyra preset) |
| Linting | Ultracite (Biome) — replaces ESLint + Prettier |
| Auth | Supabase Auth with OAuth callback route |
| Database | Supabase PostgreSQL + RLS + auto-profile trigger |
| Proxy | Next.js 16 `proxy.ts` with JWT session refresh |
| Dark Mode | next-themes + `d` hotkey toggle |
| Hook | Claude Code auto-fix on Write|Edit |

## Required Inputs

| Input | Where | How to get |
|-------|-------|------------|
| Project name | directory name, `package.json` | User provides |
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

Parse the arguments for:
- **Project name** (first positional arg)

If no project name, ask the user what the project should be called.

Then ask the user:
- Which **shadcn preset** they'd like (default `radix-lyra`, a URL, or skip to keep current)
- Whether they need **OAuth login** (Google/GitHub)

### Step 2: Create Project from Template

Clone the template into a new directory:

```bash
bunx degit toycrane/claude-hunt <project-name>
cd <project-name>
git init && git add -A && git commit -m "feat: initial commit from template"
```

Update `package.json` name field to match the project name.

If the user chose a different shadcn preset:
```bash
bunx shadcn@latest init -d -p <preset>
```

### Step 3: Install & Configure Supabase

See [supabase-setup.md](./supabase-setup.md) for dependency installation, environment configuration, and local Supabase startup.

### Step 4: Configure OAuth Providers (Optional)

If the user wants Google/GitHub login, see [supabase-auth.md](./supabase-auth.md) for credential setup.

Skip this step if the user does not need OAuth.

### Step 5: Verification

See [verification.md](./verification.md) for build, lint, and database verification.

### Step 6: Summary

Display the result:

```
Project scaffolded successfully!

  Stack:     Next.js 16 + TypeScript + Tailwind CSS v4 + shadcn/ui + Supabase
  Linter:    Ultracite (Biome) — replaces ESLint + Prettier
  Package:   bun
  Preset:    <preset or "radix-lyra (default)">

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
- Do NOT skip the verification step (5). If it fails, report errors and fix them.
- Keep all file patches minimal — read first, modify only what's needed, preserve existing content.
- All output and skill content must be in English.
