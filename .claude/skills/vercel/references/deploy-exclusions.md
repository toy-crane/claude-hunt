# Deploy Exclusions — `.vercelignore`

## Why this file exists

Vercel's deploy API rejects uploads of more than **15,000 files** per deployment:

```
Error: Invalid request: `files` should NOT have more than 15000 items, received 30984.
Try using `--archive=tgz` to limit the amount of files you upload.
```

The first real `/ship` run hit this because the repo carries several large directories that Next.js never touches at build or runtime—most notably `.claude/worktrees/` plus agent, project-context, Supabase, and test files. Excluding them brought the upload well under the limit and made the fix durable across future worktree churn.

`--archive=tgz` is Vercel's suggested workaround but is not a fix — it just tarballs the same bloat. Use `.vercelignore` as the authoritative exclusion list.

## Rule of thumb

> If Next.js does not read a file during `next build` or at runtime, it must be in `.vercelignore`.

When in doubt: remove the file from the upload and run `/ship`. If the build or site breaks, put it back.

## Canonical `.vercelignore` for this repo

```
# Claude harness (worktrees are the main upload bloater)
.claude/
.agents/

# Project meta / docs
docs/
CLAUDE.md
GLOSSARY.md
PRODUCT.md
README.md
skills-lock.json

# Local dev infra (Supabase CLI state, not runtime)
supabase/

# Tests — not needed for production build
e2e/
playwright.config.ts
playwright-report/
test-results/
vitest.config.ts
vitest.setup.ts
proxy.test.ts

# Tooling / lint / git hooks
biome.jsonc
components.json
lefthook.yml

# Build caches
.next/
tsconfig.tsbuildinfo

# Non-bun lockfiles — force Vercel to detect bun.lock and install with bun
package-lock.json
yarn.lock
pnpm-lock.yaml

# Env files (Vercel uses its own dashboard-managed env vars)
.env
.env.*
```

## What stays (implicit — everything else)

Runtime surface: `app/`, `core/`, `entities/`, `features/`, `shared/`, `widgets/`, `public/`, `proxy.ts`, `next.config.mjs`, `postcss.config.mjs`, `package.json`, `bun.lock`, `tsconfig.json`, `next-env.d.ts`, `vercel.json`.

## `.vercelignore` vs `.gitignore`

- Vercel honors `.gitignore` for some exclusions (`node_modules/`, `.git/`) but not reliably for everything — `.claude/worktrees/` was uploaded even though it is gitignored.
- When both files exist, `.vercelignore` wins for the Vercel upload. It is the explicit contract; `.gitignore` is a courtesy.
- **Do not duplicate entries**: `node_modules/` is already skipped by Vercel by default. Do not re-add it to `.vercelignore` — it's noise.

## How to verify

After editing `.vercelignore`:

```bash
# local dry count (excludes node_modules + .git but NOT .vercelignore patterns — approximation)
find . -type f \
  -not -path './.git/*' \
  -not -path './node_modules/*' \
  | wc -l
```

Then run `/ship` and confirm the "Uploading files" step completes.

Vercel does not currently expose a `--dry-run` for file-count; if the real deploy hits the 15,000-file limit again, inspect the top directories:

```bash
find . -type f \
  -not -path './.git/*' \
  -not -path './node_modules/*' \
  | awk -F'/' '{print $2}' | sort | uniq -c | sort -rn | head -20
```

…and extend `.vercelignore` for whichever new directory ballooned.
