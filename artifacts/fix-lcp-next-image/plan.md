# Fix LCP via next/image — Implementation Plan

## Problem

Vercel Speed Insights shows the landing page (`/`) with poor Core Web Vitals:

- **FCP 4.51s** (target <1.8s)
- **LCP 5.11s** (target <2.5s)
- TTFB 0.01s, CLS 0, INP 40ms — all healthy

Server is fast; the browser spends ~4.5s before first paint. The LCP element is the hero project-card screenshot. Today it renders as a raw `<img loading="lazy">` pointing at Supabase Storage, so:

- Every card (including the LCP one) is lazy-loaded
- No responsive sizing — the same full-resolution file is served to every viewport
- No WebP/AVIF transcoding
- No preconnect / priority hint for the LCP image

## Goal

Replace the raw `<img>` in `ProjectCard` with `next/image`, prioritise the top-3 cards, and serve responsive/modern formats. Works against **both** local Supabase (`http://127.0.0.1:54321`) and the production Supabase project URL.

## Architecture Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| `remotePatterns` for Supabase | Two static entries: one hardcoded `http://127.0.0.1:54321` for local, one derived from `new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname` for prod — both scoped to `pathname: "/storage/v1/object/public/**"` | `remotePatterns.port` is exact-match; local needs `54321`, prod has no explicit port. Scoping `pathname` prevents `<Image>` from pointing at arbitrary Supabase endpoints (e.g. REST, Auth) |
| **Local IP images** | Set `images.dangerouslyAllowLocalIP = isLocalSupabase` (derived by checking if `NEXT_PUBLIC_SUPABASE_URL` hostname is `127.0.0.1` or `localhost`) | **Next.js 16+ blocks optimization of images from private/local IPs by default** (SSRF guard). Without this flag, `<Image src="http://127.0.0.1:54321/...">` fails even when `remotePatterns` matches. Tying the flag to the actual Supabase hostname means Vercel production builds (with `https://xxx.supabase.co`) automatically leave it `false` — fail-safe |
| Env access in `next.config.mjs` | Use raw `process.env.NEXT_PUBLIC_SUPABASE_URL`, not the t3-env `env` export | `next.config.mjs` runs before t3-env's Zod validation is safe to import; Next.js bakes `process.env` values at build time anyway. A missing value must throw a descriptive error so the build fails loudly |
| Which cards get `priority` | First 3 cards only (`rank <= 3` → also the leaderboard top-3) | LCP is almost always inside the viewport at load; priority preloads the image and removes the `loading="lazy"` delay. More than 3 priority hints dilutes browser prioritisation and triggers the "too many priority images" warning |
| `sizes` attribute | `"(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"` | Matches the existing 1/2/3-column responsive grid. Lets Next.js pick an appropriately sized variant from the default `deviceSizes` instead of shipping the full resolution |
| Image formats | Leave at Next.js default (`image/webp`) | AVIF encodes 20–40% slower at the optimiser — bad for cold requests and cache misses. Revisit only if payload (not encode time) becomes the bottleneck |
| `fill` vs. explicit width/height | Keep explicit `width={640} height={360}` (same as today) | The card already enforces `aspect-video` on the wrapper. Explicit dimensions preserve CLS 0 without needing `fill` + `position: relative` gymnastics |
| `next/image` in Vitest | Keep inline `vi.mock("next/image", ...)` in each test file that (transitively) imports the component (`project-card.test.tsx`, `project-grid.test.tsx`, `project-board.test.tsx`). Mock renders `<div aria-label={alt} data-src={src} role="img" />` | A `vi.mock` placed in `vitest.setup.ts` did not route through the test file's React instance (tests failed with "Objects are not valid as a React child (found: [object HTMLImageElement])"). Inline mocks also keep each test's module boundary explicit. `div`+`aria-label`+`data-src` lets tests use `getByLabelText` and still assert the underlying URL, without triggering biome's `noImgElement` rule |
| **Capture conventions as a project skill** | Create a new internal skill `.claude/skills/nextjs/` mirroring the `supabase/` skill shape (top-level `SKILL.md` + `references/` directory). First reference doc: `references/local-images.md` covering the `next/image` + Supabase Storage setup | Existing `next-best-practices` is a generic skill; this project also needs a project-specific hub for Next.js conventions (like `supabase/` holds Supabase conventions). Multi-file layout leaves room to add future topics (route handlers, server actions, `next.config.mjs` patterns) without rewriting one bloated file |
| Scope | No changes to `ProjectBoard` hydration strategy, font loading, or theme provider — those are separate optimisations out of scope for this fix | Keeps the diff focused on the single biggest LCP win |

## Infrastructure Resources

| Resource | Type | Declared in | Creation Task |
|----------|------|-------------|---------------|
| None     |      |             |               |

## Data Model

No schema changes. No API shape changes. `fetchProjects` already returns `screenshotUrl` as an absolute URL — the same string that goes into `<img src>` today will go into `<Image src>` tomorrow.

## Required Skills

| Skill | Applicable Task | Purpose |
|-------|-----------------|---------|
| next-best-practices | Task 1, Task 2 | `next/image` usage, `remotePatterns`, `priority`, `sizes`, default `deviceSizes` |
| vercel-react-best-practices | Task 2 | Correct `priority` scope (top-3 only), `sizes` that matches real layout |
| performance-optimization | Task 1, Task 2 | LCP preload path, avoiding priority dilution, verifying improvement via Speed Insights |
| test-driven-development | Task 2 | Update `project-card.test.tsx` to assert the new `<Image>` contract (alt text + URL fragment, `priority` for top-3) |
| fsd | Task 2 | `ProjectCard` stays inside `widgets/project-grid/ui/` — no cross-slice import changes |

## Affected Files

| File Path | Change Type | Related Task |
|-----------|-------------|--------------|
| `next.config.mjs` | Modify — add `images.remotePatterns` derived from `NEXT_PUBLIC_SUPABASE_URL` plus a static `127.0.0.1:54321` entry | Task 1 |
| `widgets/project-grid/ui/project-grid.test.tsx` | Modify — add inline `vi.mock("next/image", ...)` (renders `<div>` stub). Needed because the test renders `ProjectGrid → ProjectCard`, which now imports `next/image` | Task 1 |
| `app/_components/project-board.test.tsx` | Modify — mock payload stays inline; update stub to the `<div aria-label data-src role="img">` shape used across all three test files | Task 1 |
| `widgets/project-grid/ui/project-card.tsx` | Modify — replace `<img>` with `<Image>` from `next/image`; accept new prop `priority?: boolean`; add `sizes`; keep `width`/`height`/`alt`; remove the biome-ignore comment | Task 2 |
| `widgets/project-grid/ui/project-card.test.tsx` | Modify — relax `img.src` equality to `toContain("paint.png")` so it survives any future loader rewrites; add a test that `priority` prop propagates | Task 2 |
| `widgets/project-grid/ui/project-grid.tsx` | Modify — compute `priority={rank <= 3}` (1-indexed rank already exists) and pass into `ProjectCard` | Task 2 |
| `.claude/skills/nextjs/SKILL.md` | New — top-level skill entry: frontmatter (`name: nextjs`, trigger description), core principles, workflow table pointing to `references/` | Task 3 |
| `.claude/skills/nextjs/references/local-images.md` | New — the `next/image` + Supabase Storage playbook: `remotePatterns` shape, `dangerouslyAllowLocalIP` (Next.js 16+), localhost vs `127.0.0.1` exact-match gotcha, `priority` + `sizes` conventions, Vitest global mock pattern | Task 3 |

## Tasks

### Task 1 — Configure `next/image` for local + production Supabase

**Why first**: `ProjectCard` cannot import `next/image` until `remotePatterns` allows the URL, and tests break without the global mock. Ship the plumbing before touching the UI.

**Steps**
1. Edit `next.config.mjs`:
   - Read `process.env.NEXT_PUBLIC_SUPABASE_URL`; throw if missing
   - Derive `{ protocol, hostname }` from it via `new URL(...)`
   - Compute `isLocalSupabase = hostname === "127.0.0.1" || hostname === "localhost"`
   - Set `images.dangerouslyAllowLocalIP = isLocalSupabase`
   - Add both entries to `images.remotePatterns`, each scoped to `/storage/v1/object/public/**`
2. Add inline `vi.mock("next/image", ...)` to `widgets/project-grid/ui/project-card.test.tsx` and `widgets/project-grid/ui/project-grid.test.tsx`; update the existing mock in `app/_components/project-board.test.tsx` to the same stub shape. Stub: `<div aria-label={alt} data-src={src} role="img" />` — lets tests use `getByLabelText` and `getAttribute("data-src")`

**Acceptance**
- `bun run dev` starts cleanly; visiting `/` with `supabase start` running still renders every screenshot (no broken images, no "Invalid src prop" error)
- `bun run build` succeeds against both local and a remote `NEXT_PUBLIC_SUPABASE_URL`
- `bun run test:unit` passes unchanged (project-board test still green after losing its local mock)

### Task 2 — Swap `<img>` → `<Image>` in `ProjectCard` with `priority` for top-3

**Why second**: depends on Task 1's `remotePatterns` and global mock.

**Steps**
1. Edit `widgets/project-grid/ui/project-card.tsx`:
   - Import `Image` from `next/image`
   - Add `priority?: boolean` to `ProjectCardProps`
   - Replace the `<img>` with `<Image src={screenshotUrl} alt={...} width={640} height={360} priority={priority} sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className={...} />`
   - Non-priority cards rely on the Next.js default (`loading="lazy"`) — no explicit `loading` prop needed
   - Remove the `biome-ignore` comment
2. Edit `widgets/project-grid/ui/project-grid.tsx` — pass `priority={rank <= 3}` into `ProjectCard`
3. Edit `widgets/project-grid/ui/project-card.test.tsx`:
   - Change `screen.getByAltText(...)` → `screen.getByLabelText(...)` (mock uses `aria-label`, not a real `<img alt>`)
   - Change `expect(img.src).toBe("https://cdn.example.com/paint.png")` → `expect(img.getAttribute("data-src")).toContain("paint.png")`
   - Add a test: `<ProjectCard priority />` renders the image (the mock ignores the prop, so this is really a compile-time contract — but asserting it prevents accidental prop removal)

**Acceptance**
- `bun run test:unit` passes (all existing ProjectCard tests + the new priority test)
- Manual check in the browser: Network panel shows the top 3 screenshots requested immediately (not lazy), and all images are served from `/_next/image?url=...&w=...`
- No new console warnings (e.g. "Image with src ... has either width or height modified ...")
- Lighthouse on `/` shows LCP drop from ~5s toward the <2.5s target

### Task 3 — Capture the pattern in a project `nextjs` skill

**Why last**: the concrete decisions made in Task 1 (env-driven `remotePatterns`, `dangerouslyAllowLocalIP`, global Vitest mock) and Task 2 (`priority` on top-3, `sizes` formula) are the content of the reference doc. Writing it after the code lands means the doc describes what actually works, not a theoretical plan.

**Steps**
1. Create `.claude/skills/nextjs/SKILL.md`:
   - Frontmatter: `name: nextjs`, description that triggers on `next/image`, `next.config.mjs`, route handlers, server actions, or local Next.js conventions
   - Mirror the `supabase/SKILL.md` shape: Core Principles → Workflows table → Common Commands
   - Initial Workflows table row: `Local image setup → references/local-images.md`
2. Create `.claude/skills/nextjs/references/local-images.md`:
   - **Why this doc exists** — Next.js 16 changed local-IP image optimisation defaults; without this guide, future devs re-hit the same error
   - **`next.config.mjs` template** — the final env-driven config from Task 1, copy-pasteable
   - **`dangerouslyAllowLocalIP` explainer** — what it does, why it defaults to `false`, why tying it to hostname is safe
   - **localhost vs `127.0.0.1`** — `remotePatterns.hostname` is exact-match; Supabase emits `127.0.0.1`, don't mix
   - **`<Image>` usage conventions** — `priority` for top-N viewport items only, `sizes` formula aligned to actual layout, keep explicit `width`/`height` when the container enforces aspect ratio
   - **Vitest global mock** — the `vi.mock("next/image", ...)` shape from `vitest.setup.ts`, and the `toContain` vs `toBe` assertion guidance

**Acceptance**
- `SKILL.md` loads without schema errors (valid YAML frontmatter, `name` matches directory)
- `references/local-images.md` contains a working, copy-pasteable `next.config.mjs` block that matches the one shipped in Task 1 (no drift between doc and code)
- A reader who has never touched this repo can follow `local-images.md` to wire up a new Supabase-backed image component end-to-end (dev + prod + tests) without reading the framework docs

## Verification / Rollout

- Local: `supabase start` → `bun run dev` → open `/` → DevTools Network panel → confirm `/_next/image?...` responses and the top-3 screenshots are fetched without a lazy delay
- Deploy to a Vercel preview branch; re-run Speed Insights on that preview URL; compare LCP before/after
- If regression appears (e.g. 403 from Supabase because an older bucket isn't public), it'll show up as broken `<Image>` in the preview — easy to roll back by reverting Task 2

## Out of Scope (explicitly)

- Theme provider / hydration refactor
- Font consolidation (JetBrains_Mono + Geist_Mono + Inter in root layout)
- Analytics / SpeedInsights script strategy
- `ProjectBoard`'s `"use client"` boundary — intentionally left intact per product decision

These remain candidates for follow-up work once this change measures its real-world LCP impact.
