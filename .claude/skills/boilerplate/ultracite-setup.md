# Step 4: Replace ESLint/Prettier with Ultracite

## 4a. Remove old linting/formatting packages

```bash
bun remove eslint @eslint/eslintrc eslint-config-next prettier prettier-plugin-tailwindcss 2>/dev/null || true
```

Some packages may not exist depending on the create-next-app version — that's fine.

## 4b. Remove old config files

```bash
rm -f eslint.config.mjs .eslintrc.json .eslintrc.js .prettierrc .prettierrc.json .prettierignore
```

## 4c. Initialize Ultracite

```bash
npx ultracite init --quiet --pm bun --linter biome --frameworks next react --type-aware --hooks claude
```

This installs `ultracite` + `@biomejs/biome`, creates `biome.jsonc`, adds `check`/`fix` scripts, and sets up the Claude Code hook.

## 4d. Patch `biome.jsonc`

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

## 4e. Patch `tsconfig.json`

Add `"allowImportingTsExtensions": true` to `compilerOptions`. Biome's auto-fix adds `.ts`/`.tsx` extensions to imports, which TypeScript rejects without this flag. Safe to use because Next.js sets `noEmit: true`.

## 4f. Ensure `typecheck` script exists

Read `package.json` and add to scripts if missing:
```json
"typecheck": "tsc --noEmit"
```

Also remove the old `lint` and `format` scripts if they reference eslint/prettier.
