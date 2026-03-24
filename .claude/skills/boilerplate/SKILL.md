---
name: boilerplate
description: Scaffold a Next.js project with Ultracite (Biome) and shadcn/ui. Use this skill when the user wants to create a new Next.js project, set up a frontend boilerplate, or convert an existing Next.js project to use Ultracite instead of ESLint/Prettier. Trigger on phrases like "new project", "scaffold", "boilerplate", "init project", "set up Next.js", "새 프로젝트", "보일러플레이트".
argument-hint: <project-name> [--existing]
user-invocable: true
---

# Boilerplate — Next.js + Ultracite + shadcn/ui

Scaffold a production-ready Next.js project with strict TypeScript, Tailwind CSS v4, shadcn/ui components, and Ultracite (Biome) for linting/formatting — all wired up with a Claude Code auto-fix hook.

## Workflow

### Step 1: Gather Input

Parse the arguments for:
- **Project name** (first positional arg)
- **`--existing` flag** — set up in the current directory instead of creating a new project

If no project name and no `--existing` flag, ask the user what the project should be called.

Then always ask the user which **shadcn preset** they'd like. Presets control the visual style (colors, border radius, etc.). They can provide:
- A preset name (e.g., `radix-lyra`)
- A preset URL
- Or skip to use defaults

### Step 2: Create Next.js Project

**Skip this step if `--existing` flag is set.**

```bash
bunx create-next-app@latest <project-name> \
  --typescript \
  --tailwind \
  --app \
  --src-dir=false \
  --import-alias="@/*" \
  --use-bun \
  --turbopack
```

After creation, all subsequent commands run inside the new project directory.

### Step 3: Set up shadcn/ui

Run shadcn init with the user's preset choice:

**With preset:**
```bash
bunx shadcn@latest init -d -p <preset>
```

**Without preset (defaults):**
```bash
bunx shadcn@latest init -d
```

The `-d` flag uses default configuration to avoid interactive prompts.

Verify that `components.json` was created after this step.

### Step 4: Replace ESLint/Prettier with Ultracite

This is the core transformation. Execute these steps in order:

**4a. Remove old linting/formatting packages:**
```bash
bun remove eslint @eslint/eslintrc eslint-config-next prettier prettier-plugin-tailwindcss 2>/dev/null || true
```
Some packages may not exist depending on the create-next-app version — that's fine.

**4b. Remove old config files:**
```bash
rm -f eslint.config.mjs .eslintrc.json .eslintrc.js .prettierrc .prettierrc.json .prettierignore
```

**4c. Initialize Ultracite:**
```bash
npx ultracite init --quiet --pm bun --linter biome --frameworks next react --type-aware --hooks claude
```

This installs `ultracite` + `@biomejs/biome`, creates `biome.jsonc`, adds `check`/`fix` scripts, and sets up the Claude Code hook.

**4d. Patch `biome.jsonc`**

Add the `noUnresolvedImports` override — Next.js uses virtual modules (`next/font/google`) that Biome's type-aware linting cannot resolve statically. This is a known false positive.

Target `biome.jsonc`:
```jsonc
{
  "$schema": "./node_modules/@biomejs/biome/configuration_schema.json",
  "extends": [
    "ultracite/biome/core",
    "ultracite/biome/type-aware",
    "ultracite/biome/next",
    "ultracite/biome/react"
  ],
  "linter": {
    "rules": {
      "correctness": {
        // next/font/google exports are generated at build time
        "noUnresolvedImports": "warn"
      }
    }
  }
}
```

Read the generated `biome.jsonc` first — if it already has more content from ultracite, preserve it and only add the linter override.

**4e. Patch `tsconfig.json`**

Add `"allowImportingTsExtensions": true` to `compilerOptions`. Biome's auto-fix adds `.ts`/`.tsx` extensions to imports, which TypeScript rejects without this flag. Safe to use because Next.js sets `noEmit: true`.

**4f. Ensure `typecheck` script exists**

Read `package.json` and add to scripts if missing:
```json
"typecheck": "tsc --noEmit"
```

Also remove the old `lint` and `format` scripts if they reference eslint/prettier.

### Step 5: Cleanup and Verify

**5a. Auto-fix all files:**
```bash
bunx ultracite fix
```

**5b. Fix `import * as React` patterns:**

Search for namespace React imports and convert to named imports:
```bash
grep -rl 'import \* as React' --include="*.tsx" --include="*.ts" .
```

For each file found, replace `import * as React from "react"` with specific named imports (e.g., `useEffect`, `useState`, `type ComponentProps`) based on actual usage in the file. In React 19, JSX no longer requires a React import.

**5c. Verify the setup:**

Run in parallel:
```bash
bun run typecheck
bun run check
```

Both should exit with code 0. If either fails, investigate and fix before proceeding.

### Step 6: Summary

Display the result:

```
Project scaffolded successfully!

  Stack:     Next.js + TypeScript + Tailwind CSS v4 + shadcn/ui
  Linter:    Ultracite (Biome) — replaces ESLint + Prettier
  Package:   bun
  Preset:    <preset or "default">

  Scripts:
    bun dev          Start dev server (Turbopack)
    bun run build    Production build
    bun run check    Lint + format check (Ultracite)
    bun run fix      Auto-fix (Ultracite)
    bun run typecheck  TypeScript check

  Claude Code hook: auto-fix on Write|Edit
```

## Constraints

- Do NOT create sub-agents. Perform all steps inline.
- Do NOT skip the verification step (5c). If it fails, report errors and fix them.
- Keep all file patches minimal — read first, modify only what's needed, preserve existing content.
- All output and skill content must be in English.
