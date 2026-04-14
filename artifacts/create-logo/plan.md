# create-logo Implementation Plan

## Architecture Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Logo component placement | `shared/ui/logo.tsx` | FSD: domain-agnostic UI primitive. No `entities/` / `features/` coupling, so `shared/ui` is the only correct layer. |
| Favicon + Apple icon generation | Next.js 16 file conventions `app/icon.tsx` + `app/apple-icon.tsx` using `ImageResponse` | Idiomatic for Next.js 16; the logo's visual mark lives in code (versioned) rather than as a binary drift risk; one JSX source reused across favicon / apple-icon / OG image. |
| OG image generation | `app/opengraph-image.tsx` via `ImageResponse` (1200×630) | Next.js auto-wires `og:image` / `twitter:image` from this file; no manual `<meta>` plumbing. |
| Legacy `app/favicon.ico` | Deleted in Task 3 | `app/icon.tsx` takes precedence but leaving the old file causes dual-favicon routes in dev. Clean removal avoids confusion. |
| Title template | `title: { default: 'claude-hunt', template: '%s · claude-hunt' }` in `app/layout.tsx` | Ensures every route's `<title>` contains `claude-hunt` with zero per-route boilerplate. |
| Blinking cursor mechanism | CSS `@keyframes` toggled via `blink` prop that adds/removes a class | Simple, CSS-only, no JS timers; tests assert class presence (deterministic), not animation timing (flaky). |
| Copy-rename scope | Only `features/auth-login/ui/login-form.tsx:55` | `grep` confirmed that is the one rendered "Claude Hunt" string in the codebase. `app/page.tsx` uses "Project Board" (separate feature area, not renamed). |
| Home page logo | Not added | Confirmed with user: logo only on `/login`; browser tab + OG unfurl cover product identity everywhere else. |
| Terracotta color scope | Hardcoded hex (`#c15f3c` light / `#e88a67` dark) on the `>` and `_` glyphs only — inside the Logo component | Theme-wide terracotta is explicitly excluded by spec. Hardcoding inside the component keeps the blast radius to the logo. |

## Infrastructure Resources

None.

| Resource | Type | Declared in | Creation Task |
|----------|------|-------------|---------------|
| —        | —    | —           | —             |

## Data Model

None (visual-only feature).

## Required Skills

| Skill | Applicable Task | Purpose |
|-------|-----------------|---------|
| test-driven-development | 1, 2, 3, 4 | RED → GREEN, one test per acceptance bullet, lowest-boundary-that-proves-it |
| frontend-ui-engineering | 1 | Accessibility (`aria-label`), light/dark contrast, production-quality component |
| fsd | 1, 2 | Slice placement discipline — logo in `shared/ui`; no cross-slice imports |
| shadcn | 1 | Use `cn()` helper, CVA variants if needed; do NOT modify `components/ui/*` |
| next-best-practices | 3, 4 | Next.js 16 Metadata API, file-based `icon.tsx` / `apple-icon.tsx` / `opengraph-image.tsx`, `ImageResponse` JSX → PNG |

## Affected Files

| File Path | Change Type | Related Task |
|-----------|-------------|--------------|
| `shared/ui/logo.tsx` | New | Task 1 |
| `shared/ui/logo.test.tsx` | New | Task 1 |
| `features/auth-login/ui/login-form.tsx` | Modify | Task 2 |
| `features/auth-login/ui/login-form.test.tsx` | Modify | Task 2 |
| `app/layout.tsx` | Modify | Task 3 (add `metadata`), Task 4 (extend `openGraph` / `twitter`) |
| `app/icon.tsx` | New | Task 3 (32×32) |
| `app/icon2.tsx` | New | Task 3 (16×16) |
| `app/apple-icon.tsx` | New | Task 3 (180×180) |
| `app/favicon.ico` | Delete | Task 3 |
| `app/opengraph-image.tsx` | New | Task 4 |

## Tasks

### Task 1: `<Logo />` component [DONE — commit 0a4ee46]
- **Covers**: Scenario 1 (partial — component rendering in isolation; wire-up on login is Task 2)
- **Size**: S (2 files)
- **Dependencies**: None
- **References**:
  - test-driven-development (keywords: colocated `.test.tsx`, RED → GREEN)
  - shadcn (keywords: `cn()`, custom UI primitive, no `components/ui/*` edits)
  - fsd (keywords: `shared/ui`, domain-agnostic)
- **Implementation targets**:
  - `shared/ui/logo.tsx` — exports `<Logo blink?: boolean className?: string />`; renders `<Link href="/" aria-label="claude-hunt home">` containing `>`, `claude-hunt`, `_`. `>` and `_` use terracotta hex. When `blink` is true, `_` carries an animated class. Uses `font-mono`.
  - `shared/ui/logo.test.tsx`
- **Acceptance**:
  - [ ] `<Logo />` renders the visible text `> claude-hunt_`
  - [ ] The rendered element is an anchor with `href="/"` and `aria-label="claude-hunt home"`
  - [ ] `<Logo blink />` applies a CSS class name on the `_` element whose stylesheet contains an `animation` / `@keyframes` rule
  - [ ] The blink animation has a duration of approximately 1 second (matches spec's "~1-second cadence"); asserted by reading the resolved `animation-duration`
  - [ ] `<Logo />` (default, no `blink`) does not apply that animation class
  - [ ] The `>` and `_` characters render with the terracotta hex (verify via inline style or class whose style resolves to `#c15f3c`); in dark mode, the lighter variant `#e88a67` applies
  - [ ] The wordmark uses a monospaced font (Geist Mono via `font-mono` class or an equivalent)
- **Verification**:
  - `bun run test:unit -- shared/ui/logo`
  - `bun run build`

---

### Task 2: Replace "Claude Hunt" on login with `<Logo blink />` [DONE — commit 945e84c]
- **Covers**: Scenario 1 (full)
- **Size**: S (2 files)
- **Dependencies**: Task 1 (needs the component)
- **References**:
  - test-driven-development
  - Existing: `features/auth-login/ui/login-form.tsx:54-56` (the `<Link>` wrapping `<span>Claude Hunt</span>`)
  - Existing test: `features/auth-login/ui/login-form.test.tsx`
- **Implementation targets**:
  - `features/auth-login/ui/login-form.tsx` — replace the inline `<Link>` + `<span>Claude Hunt</span>` with `<Logo blink />`
  - `features/auth-login/ui/login-form.test.tsx` — update assertions from "Claude Hunt" to "claude-hunt"; assert logo link + blinking class; keep other assertions intact
- **Acceptance**:
  - [ ] Rendered login form contains the visible text `claude-hunt`
  - [ ] Rendered login form does not contain the exact string `Claude Hunt` (case-sensitive, substring)
  - [ ] The logo region exposes `aria-label="claude-hunt home"` and links to `/`
  - [ ] The login-page instance of the logo carries the blinking-cursor class (focal surface is allowed to animate)
  - [ ] Pre-existing assertions in `login-form.test.tsx` (OAuth buttons, email OTP flow, Welcome back heading) continue to pass
- **Verification**:
  - `bun run test:unit -- features/auth-login/ui/login-form`
  - `bun run build`
  - `rg "Claude Hunt" app features widgets entities shared --type tsx --type ts` returns zero rendered-code hits (invariant: name consistency). The only allowed hits are comments, schema-level data, or non-rendered copy.

---

### Checkpoint: After Tasks 1–2
- [ ] All tests pass: `bun run test`
- [ ] Build succeeds: `bun run build`
- [ ] Visiting `/login` shows `> claude-hunt_` with a blinking cursor and no "Claude Hunt" string anywhere on the page
- [ ] No other element on `/login` has moved or restyled

---

### Task 3: Site metadata + favicon + apple-icon [DONE — commit 9fb6496]
- **Covers**: Scenario 2 (full)
- **Size**: M (3 new, 1 modify, 1 delete)
- **Dependencies**: None (can run in parallel with Tasks 1–2; scheduled after to keep reviewer focus linear)
- **References**:
  - test-driven-development
  - next-best-practices (keywords: Metadata API, title template, `icon.tsx`, `apple-icon.tsx`, `ImageResponse`)
  - Next.js Metadata Files docs — https://nextjs.org/docs/app/building-your-application/optimizing/metadata
- **Implementation targets**:
  - `app/layout.tsx` — add `export const metadata: Metadata = { title: { default: 'claude-hunt', template: '%s · claude-hunt' }, description: '…' }`
  - `app/icon.tsx` — 32×32 `ImageResponse` rendering a terracotta square with `_` glyph (primary favicon)
  - `app/icon2.tsx` — 16×16 `ImageResponse`; at this size the `>` prefix is dropped per the wireframe's "collapse rule" (only the `_` glyph remains on a terracotta square)
  - `app/apple-icon.tsx` — 180×180 `ImageResponse`, same mark scaled up
  - Delete `app/favicon.ico`
- **Acceptance**:
  - [ ] `metadata.title.default` equals `claude-hunt`
  - [ ] `metadata.title.template` equals `%s · claude-hunt`
  - [ ] `app/icon.tsx` default export is a function that resolves without throwing and returns a 32×32 `ImageResponse`
  - [ ] `app/icon2.tsx` default export resolves without throwing and returns a 16×16 `ImageResponse` that contains only the `_` glyph on a terracotta square (no `>` prefix)
  - [ ] `app/apple-icon.tsx` default export resolves without throwing and returns a 180×180 `ImageResponse`
  - [ ] The generated icon markup contains the terracotta fill and a `_` glyph (text-content or font assertion, not pixel diff)
  - [ ] Terracotta fill (`#c15f3c`) has contrast ratio ≥ 3:1 against both white and black backgrounds (WCAG AA for non-text graphics); asserted via a computed-ratio helper in the test so the favicon reads legibly in light and dark browser chrome
  - [ ] `app/favicon.ico` no longer exists in the repo
- **Verification**:
  - `bun run test:unit -- app/(layout|icon|apple-icon)`
  - `bun run build` (Next.js fails the build if any metadata file throws at render time)
  - Manual: `/icon` and `/apple-icon` load in a browser and show the mark

---

### Task 4: Open Graph + Twitter preview [DONE — commit a2c7891]
- **Covers**: Scenario 3 (full)
- **Size**: S (1 new, 1 modify)
- **Dependencies**: Task 3 (extends the same `metadata` export — sequential edits avoid merge conflict)
- **References**:
  - test-driven-development
  - next-best-practices (keywords: `opengraph-image`, `ImageResponse`)
  - Next.js OG Image docs — https://nextjs.org/docs/app/api-reference/file-conventions/metadata/opengraph-image
- **Implementation targets**:
  - `app/opengraph-image.tsx` — 1200×630 `ImageResponse` with `> claude-hunt_` (monospace, terracotta `>` and `_`) + short tagline
  - `app/layout.tsx` — extend `metadata` with `openGraph: { title, description, images }` and `twitter: { card: 'summary_large_image', title, images }`
- **Acceptance**:
  - [ ] `app/opengraph-image.tsx` default export resolves without throwing and returns a 1200×630 `ImageResponse`
  - [ ] The rendered OG markup contains `> claude-hunt_` text
  - [ ] The rendered OG markup applies the terracotta hex (`#c15f3c`) to the `>` and `_` glyphs (style/class assertion)
  - [ ] `metadata.openGraph.title` contains `claude-hunt`
  - [ ] `metadata.twitter.title` contains `claude-hunt`
  - [ ] `metadata.openGraph.images` is set (populated automatically by file convention; verify at least the metadata object references image generation)
  - [ ] Manual (checklist item; not automated): pasting the site URL into Slack and Twitter composers renders an unfurl where the full `> claude-hunt_` wordmark is visible — no edge of the wordmark is cropped by the thumbnail frame
- **Verification**:
  - `bun run test:unit -- app/(opengraph-image|layout)`
  - `bun run build`
  - Manual: `/opengraph-image` renders at 1200×630; paste site URL into a Slack/Twitter composer and confirm unfurl

---

### Checkpoint: After Tasks 3–4
- [ ] All tests pass: `bun run test`
- [ ] Build succeeds: `bun run build`
- [ ] Every route's `<title>` contains `claude-hunt`
- [ ] `/icon`, `/apple-icon`, `/opengraph-image` all render without errors
- [ ] Slack / Twitter unfurl preview shows the logo image without cropping (manual)

## Undecided Items

(none)
