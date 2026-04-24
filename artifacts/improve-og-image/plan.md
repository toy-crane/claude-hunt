# Improve OG Image — Implementation Plan

## Context

The site's root Open Graph image (`app/opengraph-image.tsx`) today renders only the large wordmark and an English tagline on a blank canvas — it tells a first-time viewer nothing about what is actually on claude-hunt.com. The design bundle in `artifacts/improve-og-image/references/project/og-image-final.html` (Option 2B, confirmed in the chat transcript) replaces that with a Korean-language composition showing the wordmark, tagline, the current top-3 popular project names (with gold/silver/bronze rank dots), and a tilted grid of 6 project screenshots with 1st/2nd/3rd badges — all matched to what a visitor sees on the live homepage.

Spec: `artifacts/improve-og-image/spec.md`. Canonical visual reference: `artifacts/improve-og-image/references/project/og-image-final.html` (the `OgGridB` component).

## Architecture Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Data source | Live query against `projects_with_vote_count` at OG generation time | Keeps preview in sync with homepage ordering; spec requires top-3 names and top-3 badges to reference the same real projects a visitor sees |
| Caching strategy | `export const revalidate = 3600` on the OG route | Spec requires "build + periodic revalidation, no DB hit on every scrape" (1h default, called out in `spec.md` → Undecided) |
| Supabase client for OG | New cookie-free anon server client (`createAnonServerClient`) | `app/opengraph-image.tsx` runs during static generation / ISR regeneration where no request-scoped `cookies()` context is guaranteed; also OG content is public, so viewer auth must not influence the cached image |
| Font loading | Self-hosted TTFs in `public/fonts/` (4 weights only — user-confirmed); read via `fs.readFile(path.join(process.cwd(), 'public/fonts/<file>'))` | Standard Next.js Node-runtime pattern that survives compiled-build layout changes. `new URL(..., import.meta.url)` can resolve to the build output directory instead of the source tree and fail silently at runtime, so we avoid it. Pass the resulting `ArrayBuffer`s as `fonts: [...]` to `ImageResponse` |
| Layout primitive | Flexbox only (no CSS Grid) | `next/og` + Satori officially supports flexbox; the project's `next-best-practices` skill calls out grid as unsupported — safer to rewrite the design's grids as nested flex |
| CSS `-webkit-line-clamp` | Replace with explicit `display: -webkit-box`, `WebkitLineClamp: 2`, `WebkitBoxOrient: 'vertical'`, `overflow: 'hidden'` in inline style form — Satori accepts this | Satori supports line-clamp via the WebKit properties but needs them as inline React style keys |
| Screenshot rendering | Reference Supabase public-URL `screenshotUrl` strings directly in `<img src>` | Bucket policy `Public can read project-screenshots` already grants anon SELECT; Satori fetches remote images server-side |
| Route runtime | Keep default Node.js runtime (do **not** switch to `edge`) | Existing OG/icon routes all run on Node; Node runtime can read local font files from disk; edge would force a different font-loading mechanism |

## Infrastructure Resources

None. The existing `project-screenshots` bucket, `projects_with_vote_count` view, and public RLS policy all already exist and are consumed by the homepage.

## Data Model

### ProjectForOg (shape consumed by the OG component)
- `id` — for React key
- `title` — card title + top-3 name row
- `tagline` — card description (2-line clamp); note the view's column is **`tagline`**, not `description`
- `author_display_name` — card footer `{name} · 작성`
- `vote_count` — card footer `▲ {N}` pill
- `screenshot_path` → resolved to `screenshotUrl` (public URL) via `storage.from(SCREENSHOT_BUCKET).getPublicUrl(...)`

Source: `projects_with_vote_count` view (`supabase/schemas/projects_with_vote_count.sql`).

Ordering: `vote_count desc, created_at desc` (matches homepage exactly — see `widgets/project-grid/api/fetch-projects.ts`).

Limit: 6.

## Required Skills

| Skill | Applicable Task | Purpose |
|-------|-----------------|---------|
| `test-driven-development` | All tasks | RED → GREEN discipline, mapping each Success Criterion to a test assertion (always required) |
| `next-best-practices` | Tasks 2, 3 | `ImageResponse` API, route-segment options (`revalidate`, `size`, `alt`, `contentType`), font-loading pattern, Satori limitations |
| `nextjs` | Task 3 | ISR / `revalidate` semantics for static metadata routes |
| `fsd` | Task 1 | Where the new anon client lives (`shared/api/supabase/`) and where `fetchTopProjects` lives (sibling of `fetchProjects` in `widgets/project-grid/api/`) |
| `supabase` | Task 1 | `@supabase/ssr`'s `createServerClient` with a no-op cookies adapter — canonical cookie-free pattern |
| `frontend-ui-engineering` | Task 2 | Matching the design's typographic scale, spacing, and colors exactly |
| `debugging-and-error-recovery` | Task 3 | If revalidation or remote-image fetching misbehaves under `bun run build` |

## Affected Files

| File Path | Change Type | Related Task |
|-----------|-------------|--------------|
| `shared/api/supabase/anon-server.ts` | New | Task 1 |
| `shared/api/supabase/anon-server.test.ts` | New | Task 1 |
| `widgets/project-grid/api/fetch-projects.ts` | Modify (add `fetchTopProjects`) | Task 1 |
| `widgets/project-grid/api/fetch-projects.test.ts` | Modify (add cases) | Task 1 |
| `app/opengraph-image.tsx` | Modify (full rewrite to Option 2B layout) | Tasks 2, 3 |
| `app/opengraph-image.test.tsx` | Modify (new assertions per spec scenarios) | Tasks 2, 3 |
| `public/fonts/GeistMono-Bold.ttf` | New (committed binary, 700 weight) | Task 2 |
| `public/fonts/JetBrainsMono-Medium.ttf` | New (500 weight) | Task 2 |
| `public/fonts/Inter-Regular.ttf` | New (400 weight) | Task 2 |
| `public/fonts/Inter-Medium.ttf` | New (500 weight) | Task 2 |
| `artifacts/improve-og-image/evidence/og-final.png` | New | Task 4 |
| `artifacts/improve-og-image/evidence/notes.md` | New | Task 4 |

## Tasks

### Task 1: Cookie-free Supabase client + top-projects fetch helper

- **Covers**: Scenario 2 (partial — ordering + data-shape only; rendering proven in Task 3)
- **Size**: M (4 files)
- **Dependencies**: None
- **References**:
  - `fsd` skill — where does an anon server client go (shared/api/supabase)?
  - `supabase` skill — `@supabase/ssr` `createServerClient` + no-op cookies adapter
  - Existing: `shared/api/supabase/server.ts`, `shared/api/supabase/admin.ts`, `widgets/project-grid/api/fetch-projects.ts`
- **Implementation targets**:
  - `shared/api/supabase/anon-server.ts` — exports `createAnonServerClient()`, a server-side supabase client that uses `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` with a no-op `cookies.getAll/setAll` adapter. Anonymous access only; does **not** read or write cookies.
  - `shared/api/supabase/anon-server.test.ts` (colocated) — asserts the client is constructed with the publishable (not secret) key and that calling `.from(...)` returns a valid query builder without needing `next/headers` `cookies()`.
  - `widgets/project-grid/api/fetch-projects.ts` — add `fetchTopProjects({ limit = 6 }: { limit?: number } = {})` that calls `createAnonServerClient()`, selects from `projects_with_vote_count`, applies `order("vote_count", desc) → order("created_at", desc) → limit(n)`, then resolves `screenshot_path → screenshotUrl` via `storage.from(SCREENSHOT_BUCKET).getPublicUrl()`. Returns a narrow `ProjectForOgRow` type (only the fields the OG image needs).
  - `widgets/project-grid/api/fetch-projects.test.ts` — add test cases that mock `createAnonServerClient`, assert ordering args are correct, limit is passed, screenshot URL is resolved for each row, and empty-array input returns `[]`.
- **Acceptance**:
  - [ ] `createAnonServerClient()` returns a Supabase client that makes `projects_with_vote_count.select(...)` requests without requiring a `cookies()` context.
  - [ ] `fetchTopProjects({ limit: 6 })` invokes `.order("vote_count", { ascending: false })` then `.order("created_at", { ascending: false })` then `.limit(6)` on `projects_with_vote_count`.
  - [ ] For each returned row, `screenshotUrl` is the public URL produced by `storage.from("project-screenshots").getPublicUrl(screenshot_path).data.publicUrl`; rows whose `screenshot_path` is null get an empty string `""` (same behavior as existing `fetchProjects`).
  - [ ] When the underlying query returns `{ data: [], error: null }`, `fetchTopProjects` resolves to `[]` (no throw).
- **Verification**:
  - `bun run test:unit -- shared/api/supabase/anon-server` — asserts client construction without `cookies()`.
  - `bun run test:unit -- widgets/project-grid/api/fetch-projects` — asserts ordering, limit, URL resolution, and empty-result handling.
  - `bun run build` — TypeScript + module resolution passes.

---

### Checkpoint: After Task 1
- [ ] All tests pass: `bun run test`
- [ ] Build succeeds: `bun run build`
- [ ] `fetchTopProjects()` can be called from a server module with no cookie context and returns rows in homepage order.

---

### Task 2: Replace OG layout with Option 2B design + load brand fonts (placeholder data)

- **Covers**: Scenario 1 (partial — all visible literal copy + wordmark terracotta), Scenario 3 (partial — badge structure and colors), Scenario 4 (partial — card-body contents structure)
- **Size**: M (2 code files + 4 binary assets)
- **Dependencies**: None (uses hardcoded placeholder data inside the component; real data is wired in Task 3)
- **References**:
  - Canonical design: `artifacts/improve-og-image/references/project/og-image-final.html` (`OgGridB` + `Opt2Right` + `Opt2Hero`)
  - Design tokens: `artifacts/improve-og-image/references/project/colors_and_type.css`
  - `next-best-practices` skill — `ImageResponse` fonts, flexbox-only layout
  - `frontend-ui-engineering` skill — pixel-matching
- **Implementation targets**:
  - `public/fonts/GeistMono-Bold.ttf`, `JetBrainsMono-Medium.ttf`, `Inter-Regular.ttf`, `Inter-Medium.ttf` — commit the exact weights the design uses (wordmark 700, card titles 500, body 400/500).
  - `app/opengraph-image.tsx` — full rewrite:
    - Replace `OgElement` body with a flex row: `left` (50%) containing wordmark + tagline + subtitle + `지금 인기 프로젝트` row + URL, and `right` (50%) containing the tilted card grid.
    - Rewrite all `display: grid` from the prototype as nested flexbox: the outer canvas is a flex row; `.cards` becomes a `flex-wrap` container with 260px-wide children and a 16px gap; the `left` column is a flex column with `justifyContent: space-between`.
    - Apply `transform: rotate(-7deg)` and `transformOrigin: '0 0'` to the cards wrapper.
    - The fade overlay is an absolutely-positioned div with `background: linear-gradient(to right, transparent 35%, rgba(250,250,250,.3) 70%, #fafafa 100%)`.
    - Terracotta `#c15f3c` only on `>` and `_` glyphs; rank dot colors `#f59e0b` / `#a1a1aa` / `#c2410c` only on the three leading bullets; `1st` / `2nd` / `3rd` badges use the same three colors as text-color.
    - Card description uses inline `display: -webkit-box`, `WebkitLineClamp: 2`, `WebkitBoxOrient: 'vertical'`, `overflow: 'hidden'`.
    - Use 6 hardcoded placeholder projects (rank 1–6) inside the component for this task. They will be replaced with real data in Task 3.
    - Load the 4 TTF files via `fs.readFile(path.join(process.cwd(), 'public/fonts/<file>'))` (import `readFile` from `node:fs/promises` and `path` from `node:path`). Convert each Node `Buffer` to an `ArrayBuffer` (`buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)`) and pass as a `fonts: [...]` array to `ImageResponse`. Mark the wrapper function `async`.
    - Update `alt` to name Korean surface: `"claude-hunt — 함께 배우는 사람들의 프로젝트"` (still contains `claude-hunt`, satisfying the existing test).
  - `app/opengraph-image.test.tsx` — update to cover the new structure (keep mocking `next/og`):
    - Still asserts `size` and `contentType`.
    - Still asserts `alt.toLowerCase()` contains `claude-hunt`.
    - Adds assertions: rendered text contains `함께 배우는 사람들의 프로젝트.`, `마음에 드는 프로젝트에 응원을 보내주세요.`, `지금 인기 프로젝트`, `claude-hunt.com`.
    - Still asserts terracotta color on `>` and `_` spans.
    - Asserts three dot spans render in `rgb(245, 158, 11)`, `rgb(161, 161, 170)`, `rgb(194, 65, 12)` respectively.
    - Asserts the right-hand grid wrapper has `transform: rotate(-7deg)`.
    - Asserts a fade overlay element exists with inline `background` style containing `linear-gradient`, the stops `transparent 35%`, `rgba(250,250,250,.3) 70%`, and `#fafafa 100%`.
    - Asserts the card description element carries inline style keys `display: -webkit-box`, `WebkitLineClamp: "2"`, `WebkitBoxOrient: "vertical"`, `overflow: "hidden"`.
    - Asserts the `ImageResponse` mock captured a non-empty `fonts` option with entries named `Geist Mono`, `JetBrains Mono`, `Inter`.
- **Acceptance**:
  - [ ] Rendering `OgElement()` in jsdom produces text containing each of: `claude-hunt`, `함께 배우는 사람들의 프로젝트.`, `마음에 드는 프로젝트에 응원을 보내주세요.`, `지금 인기 프로젝트`, `claude-hunt.com`.
  - [ ] The `>` and `_` adjacent to the wordmark have inline color `rgb(193, 95, 60)`.
  - [ ] The three bullet dots in the `지금 인기 프로젝트` row have inline colors `rgb(245, 158, 11)`, `rgb(161, 161, 170)`, `rgb(194, 65, 12)` in that order.
  - [ ] Three rank badges render with text `1st`, `2nd`, `3rd` in the same three colors respectively; cards in positions 4, 5, 6 have no badge element.
  - [ ] A fade-overlay element on the right half has an inline `background` whose `linear-gradient` stops are `transparent 35%`, `rgba(250,250,250,.3) 70%`, and `#fafafa 100%` — this is the visible fade described in Scenario 1.
  - [ ] Every card's description element carries the inline style set `display: -webkit-box`, `WebkitLineClamp: "2"`, `WebkitBoxOrient: "vertical"`, `overflow: "hidden"` — the mechanism Satori uses to deliver Scenario 4's 2-line truncation.
  - [ ] Default export (`OpenGraphImage()`) is constructed with a `fonts` option containing 4 entries covering family names `Geist Mono`, `JetBrains Mono`, and `Inter`.
  - [ ] `alt.toLowerCase()` still contains `claude-hunt` (backwards-compatible).
- **Verification**:
  - `bun run test:unit -- app/opengraph-image` — all of the above assertions.
  - `bun run build` — Next.js compiles the OG route; font file reads resolve; TypeScript passes.

---

### Checkpoint: After Task 2
- [ ] All tests pass: `bun run test`
- [ ] Build succeeds: `bun run build`
- [ ] Visiting `/opengraph-image` in a dev browser returns a 1200×630 PNG that visually matches the handoff bundle's Option 2B (with placeholder project names).

---

### Task 3: Wire live top-6 data + 1h revalidation + handle sparse results

- **Covers**: Scenario 1 (full — now with real data), Scenario 2 (full — top-3 names match homepage ordering), Scenario 4 (full — per-card fields), Scenario 5 (full — sparse fallback); Invariants (freshness, ordering consistency)
- **Size**: S (2 files)
- **Dependencies**: Task 1 (`fetchTopProjects`), Task 2 (OG layout)
- **References**:
  - `nextjs` skill — `revalidate` on static metadata routes
  - `next-best-practices` skill — `opengraph-image` async default export
  - Spec: `artifacts/improve-og-image/spec.md` § Scenarios 2, 5; § Invariants
- **Implementation targets**:
  - `app/opengraph-image.tsx`:
    - Add `export const revalidate = 3600` (1-hour ISR window).
    - Make the default export `async`: `await fetchTopProjects({ limit: 6 })`.
    - Pass the returned `projects` array into `OgElement({ projects })`.
    - Render the trend row from `projects.slice(0, 3)` — if `projects.length === 0` the `지금 인기 프로젝트` row is omitted entirely (no empty row, no "TBD" placeholder).
    - Render the card grid from `projects` as-is — if fewer than 6, only those render; badges still key off rank position 1/2/3.
    - Keep static bits (wordmark, tagline, subtitle, URL) rendered unconditionally.
  - `app/opengraph-image.test.tsx`:
    - Mock `fetchTopProjects` and replace existing tests that assumed hardcoded placeholder data.
    - Case: 6 projects — asserts 6 cards, top-3 names in trend row match `projects[0].title`, `projects[1].title`, `projects[2].title` in order.
    - Case: 2 projects — asserts 2 cards, trend row shows 2 names, no "TBD" string appears anywhere in the rendered output.
    - Case: 0 projects — asserts grid area contains no card elements and the `지금 인기 프로젝트` string does **not** appear; wordmark / tagline / subtitle / URL still appear.
    - Asserts the module exports `revalidate === 3600`.
- **Acceptance**:
  - [ ] With a mock returning 6 project rows in a specified order, the rendered output's trend row reads `● {row0.title} · ● {row1.title} · ● {row2.title}` in that exact sequence.
  - [ ] With 6 rows, exactly 6 card elements render in the grid area; each card body contains its row's `title`, `tagline`, `{author_display_name} · 작성`, and `▲ {vote_count}`.
  - [ ] Each of the 6 cards has an `<img>` whose `src` attribute equals the corresponding row's `screenshotUrl` — the trend-row names and card screenshots are therefore bound to the same source data, satisfying Scenario 3's "screenshot thumbnail" criterion.
  - [ ] The three names listed in the trend row and the three cards bearing `1st` / `2nd` / `3rd` badges are drawn from the same `projects.slice(0, 3)` in the same order — i.e. with a mock returning `[A, B, C, D, E, F]`, the trend row reads `● A · ● B · ● C` AND the cards at grid positions 1, 2, 3 show badges `1st` / `2nd` / `3rd` with titles `A` / `B` / `C` respectively. This covers the ordering-consistency Invariant.
  - [ ] With 2 rows, exactly 2 cards render, the trend row lists exactly 2 names, and no `TBD` / `N/A` placeholder appears in the output text.
  - [ ] With 0 rows, zero cards render and the string `지금 인기 프로젝트` does not appear; wordmark / tagline / subtitle / URL strings do appear.
  - [ ] The module exports `revalidate = 3600`.
  - [ ] The module's default export is `async` (returns a `Promise`).
- **Verification**:
  - `bun run test:unit -- app/opengraph-image` — all of the above assertions.
  - `bun run build` — proves Next.js accepts the async default export and picks up the `revalidate` segment option (build log will show the OG route as dynamic/ISR).

---

### Task 4: Visual verification in-browser + evidence capture

- **Covers**: Scenario 1 (end-to-end visual), Scenario 3 (end-to-end badges render as real pixels), Invariants (dimensions, palette, Korean-only copy) — this is the human-review checkpoint that only pixels can prove
- **Size**: S (2 artifacts)
- **Dependencies**: Tasks 2, 3
- **References**:
  - Browser MCP tools (`mcp__claude-in-chrome__*`)
  - Canonical design: `artifacts/improve-og-image/references/project/og-image-final.html` (open side-by-side for comparison)
- **Implementation targets**:
  - Run the dev server (already running on port 3003 via the worktree's Monitor task).
  - Use Browser MCP to navigate to `http://localhost:3003/opengraph-image` and save the rendered PNG to `artifacts/improve-og-image/evidence/og-final.png` (either via JS-tool `fetch` + `download`, or via screenshot of the image element at 1:1 scale).
  - Open the reference HTML in a second tab: `file:///Users/toycrane/Documents/Projects/claude-hunt/.claude/worktrees/feat/improve-og-image/artifacts/improve-og-image/references/project/og-image-final.html`.
  - Write `artifacts/improve-og-image/evidence/notes.md` with a checklist of observations: (a) file dimensions via `file og-final.png` are `1200 × 630`, (b) each literal string from Scenario 1 is visible, (c) wordmark `>` and `_` are terracotta, (d) three trend dots are gold / silver / bronze, (e) three badges `1st` / `2nd` / `3rd` are visible on the top-3 cards, (f) 6 cards visible in tilted grid with fade on the right edge, (g) top-3 names in the trend row match the first 3 titles in the card grid.
- **Acceptance**:
  - [ ] `artifacts/improve-og-image/evidence/og-final.png` is a 1200×630 PNG (verifiable with `file` or `identify`).
  - [ ] `artifacts/improve-og-image/evidence/notes.md` records that every observation in the checklist above was true; any deviation is flagged with a follow-up item.
- **Verification**:
  - Browser MCP navigation + save (one-shot, evidence committed).
  - `file artifacts/improve-og-image/evidence/og-final.png` → reports `PNG image data, 1200 x 630`.
  - Human review (the task executor) compares `og-final.png` side-by-side with the reference HTML render and signs the notes file.

---

### Checkpoint: After Tasks 3–4
- [ ] All tests pass: `bun run test`
- [ ] Build succeeds: `bun run build`
- [ ] A link shared to claude-hunt.com would render the Option 2B preview with real top-ranked projects from the homepage, refreshed every hour.

---

## Undecided Items

- **Revalidate window.** Plan uses `3600` seconds (1 hour). If a different interval is desired, change the single constant in `app/opengraph-image.tsx` before `/execute-plan` — no other task is affected.
- **Font weights to commit.** Plan commits 4 TTFs (Geist Mono 700, JetBrains Mono 500, Inter 400, Inter 500). If the executor discovers a weight mismatch while matching the design (e.g. needing Inter 600 for an `<b>` inside the credit line), they may commit the additional weight and note it; this is a low-cost deviation.
