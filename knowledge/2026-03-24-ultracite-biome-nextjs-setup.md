---
title: "Ultracite (Biome) setup for Next.js — replacing ESLint + Prettier"
date: 2026-03-24
category: tooling
tags: [ultracite, biome, eslint, prettier, next.js]
severity: low
---

## Problem

Setting up Ultracite with Biome to replace ESLint + Prettier in a Next.js + TypeScript project. Several issues surfaced during setup that required manual intervention beyond the `npx ultracite init` command.

## Root Cause

Three issues arose from Biome's type-aware linting interacting with Next.js and React's module systems:

1. **`noUnresolvedImports` false positives** — Biome cannot statically resolve `next/font/google` (virtual module generated at build time) or named exports from `react` (type-only exports like `ComponentProps`). These are flagged as errors by default.
2. **`import * as React` flagged** — Biome's `noNamespaceImport` rule rejects namespace imports for tree-shaking reasons. Required converting to named imports.
3. **`.ts`/`.tsx` import extensions** — Biome's auto-fix adds file extensions to imports, but TypeScript rejects these unless `allowImportingTsExtensions` is enabled in `tsconfig.json`.

## Solution

1. **Programmatic init**: `npx ultracite init --quiet --pm bun --linter biome --frameworks next react --type-aware --hooks claude`
2. **Remove old tooling**: Delete `eslint`, `@eslint/eslintrc`, `eslint-config-next`, `prettier`, `prettier-plugin-tailwindcss` from devDependencies. Delete `eslint.config.mjs`, `.prettierrc`, `.prettierignore`.
3. **Downgrade `noUnresolvedImports` to warn** in `biome.jsonc`:
   ```jsonc
   "linter": {
     "rules": {
       "correctness": {
         "noUnresolvedImports": "warn"
       }
     }
   }
   ```
4. **Enable `allowImportingTsExtensions: true`** in `tsconfig.json` (safe when `noEmit: true`).
5. **Convert `import * as React`** to named imports (`useEffect`, `type ComponentProps`, etc.).
6. **Run `bun run fix`** to auto-format all files (2-space indent, sorted CSS classes, organized imports).

## Prevention

- When setting up Biome with type-aware linting on a Next.js project, always downgrade `noUnresolvedImports` to `warn` — Next.js virtual modules will trigger false positives.
- Always add `allowImportingTsExtensions: true` to tsconfig when using Biome's import extension rules with `noEmit: true`.
- After `ultracite fix`, always run `bun run build` to verify no TypeScript compilation errors were introduced.

## Related Files

- `biome.jsonc` — Ultracite/Biome configuration
- `.claude/settings.json` — Claude Code auto-fix hook
- `package.json` — Scripts (`check`, `fix`) and dependencies
- `tsconfig.json` — `allowImportingTsExtensions` addition
