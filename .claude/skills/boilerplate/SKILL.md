---
name: boilerplate
description: Scaffold a Next.js project with Ultracite (Biome), shadcn/ui, and Supabase. Use this skill when the user wants to create a new Next.js project, set up a frontend boilerplate. Trigger on phrases like "new project", "scaffold", "boilerplate", "init project", "set up Next.js", "새 프로젝트", "보일러플레이트".
argument-hint: <project-name>
user-invocable: true
---

# Boilerplate — Next.js + Ultracite + shadcn/ui + Supabase

Scaffold a production-ready Next.js project with strict TypeScript, Tailwind CSS v4, shadcn/ui components, Ultracite (Biome) for linting/formatting, and Supabase for auth/database — all wired up with a Claude Code auto-fix hook.

## Workflow

### Step 1: Gather Input

Parse the arguments for:
- **Project name** (first positional arg)

If no project name, ask the user what the project should be called.

Then always ask the user which **shadcn preset** they'd like (e.g., `radix-lyra`, a URL, or skip for defaults).

### Step 2: Create Next.js Project + shadcn/ui

See [nextjs-setup.md](./nextjs-setup.md) for detailed instructions.

### Step 3: Set up Supabase

See [supabase-setup.md](./supabase-setup.md) for local environment, client, and proxy setup.
See [supabase-auth.md](./supabase-auth.md) for Google/GitHub OAuth provider configuration guide.

### Step 4: Replace ESLint with Ultracite

See [ultracite-setup.md](./ultracite-setup.md) for detailed instructions.

### Step 5: Cleanup and Verification

See [verification.md](./verification.md) for detailed instructions.

### Step 6: Summary

Display the result:

```
Project scaffolded successfully!

  Stack:     Next.js + TypeScript + Tailwind CSS v4 + shadcn/ui + Supabase
  Linter:    Ultracite (Biome) — replaces ESLint + Prettier
  Package:   bun
  Preset:    <preset or "default">

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
