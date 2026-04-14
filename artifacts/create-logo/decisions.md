# create-logo Execution Decisions

## Reviewer selection

**When**: Step 2
**Decision**: Run all four reviewers at the end — `wireframe-reviewer`, `ui-quality-reviewer`, `design-reviewer`, `react-reviewer`.
**Why**: wireframe.html exists (→ wireframe-reviewer), UI is added (→ ui-quality + design), and Next.js/React code is added (→ react-reviewer). No reason to skip any.
**Harness Signal**: N/A (all four are directly applicable; skill rules fire cleanly).
**Result**: Success — all four returned PASS. Two Warnings (ui-quality) logged below; three Advisories surfaced in Step 6 report.

## Task execution order

**When**: Step 3
**Decision**: Sequential 1 → 2 → 3 → 4.
**Why**: Task 2 depends on the `<Logo />` component (Task 1). Task 4 depends on the metadata export introduced by Task 3 (same file). Tasks 3/4 are independent of Tasks 1/2 but sequential keeps reviewer focus linear.
**Harness Signal**: N/A — dependencies are already annotated in plan.md.
**Result**: Success — the order produced no re-work or circular edits.

## CSS keyframes placement — globals.css vs inline

**When**: Step 4, Task 1
**Decision**: Define `@keyframes logo-cursor-blink` in `app/globals.css` (a small 4-line addition); the Logo component applies the animation via inline `style` (animationName/Duration/etc.) so that jsdom-based unit tests can read `element.style.animationDuration` without CSS parsing.
**Why**: jsdom does not apply class-driven CSS, so a class-only approach makes the "~1-second cadence" acceptance bullet untestable at unit level. Inline style is reliable and deterministic. `@keyframes` must still live in a stylesheet (it's CSS, not a JS primitive), and globals.css is the only site-wide stylesheet.
**Harness Signal**: plan.md's Affected Files did not list `app/globals.css`; only identified during Task 1 implementation. Consider a heuristic: any task that introduces a CSS @keyframes rule should list globals.css as a Modify.
**Result**: Success — unit tests assert `animationDuration === "1s"`; visual test confirmed the animation actually runs in the browser.

## Terracotta via arbitrary Tailwind classes vs theme tokens

**When**: Step 4, Task 1
**Decision**: Use arbitrary Tailwind classes `text-[#c15f3c]` / `dark:text-[#e88a67]` directly on the `>` and `_` glyphs inside the Logo component.
**Why**: Spec explicitly excludes theme-wide terracotta (no `--primary` change). Hardcoded hex on two glyphs contains the blast radius. `cn()` + arbitrary values keeps it consistent with project's Tailwind v4 conventions.
**Harness Signal**: N/A.
**Result**: Success — Task 1 tests assert the classes are present and contrast ratio passes WCAG AA.

## Extract `IconElement` / `OgElement` as named exports for testability

**When**: Step 4, Tasks 3 & 4
**Decision**: Each Next.js metadata file (`icon.tsx`, `icon2.tsx`, `apple-icon.tsx`, `opengraph-image.tsx`) exports its JSX as a named function (`IconElement` / `OgElement`) in addition to the default `ImageResponse` wrapper.
**Why**: The real `next/og` `ImageResponse` needs an edge runtime (Satori/resvg) and is not trivially testable in jsdom. Exporting the pure React element lets unit tests render the content deterministically while the default export still satisfies Next.js's file-convention contract. Next.js ignores unknown named exports, so this does not interfere with routing.
**Harness Signal**: The `next-best-practices` skill currently says nothing about test patterns for `ImageResponse` files. Consider adding: "when testing `icon.tsx` / `opengraph-image.tsx`, extract the JSX into a named export and assert against that; stub `next/og` with a constructor-compatible class".
**Result**: Success — 14 tests across 4 icon/OG files pass without booting the edge runtime.

## Stub `next/font/google` in layout test

**When**: Step 4, Task 3
**Decision**: `app/layout.test.tsx` calls `vi.mock("next/font/google", ...)` returning stubs that match the font-factory shape (className / variable / style).
**Why**: `Noto_Sans` and `Geist_Mono` are Turbopack-transformed modules; at vitest import-time they're not real callables and throw `TypeError: Noto_Sans is not a function`. Stubbing lets the test focus on the metadata export without pulling in the font loader.
**Harness Signal**: Any future test that imports `app/layout.tsx` will hit the same issue. Consider a project-level helper `stubNextFonts()` in `shared/lib/test-utils.tsx`.
**Result**: Success — 7 metadata assertions pass.

## Mock ImageResponse with a class, not a function

**When**: Step 4, Tasks 3 & 4
**Decision**: `vi.mock("next/og", () => ({ ImageResponse: class { ... } }))` — a class with a constructor, not `vi.fn().mockImplementation(...)`.
**Why**: `vi.fn()` returns an ordinary function; `new ImageResponse(...)` throws `TypeError: ... is not a constructor`. A plain class with the right shape is the simplest fix.
**Harness Signal**: The ImageResponse stub pattern is repeated across four test files. If a fifth file needs it, extract to `shared/lib/test-utils.tsx`.
**Result**: Success — all `default export resolves without throwing` assertions pass.

## Accepted ui-quality Warning — blink race condition is working-as-designed

**When**: Step 5, ui-quality-reviewer
**Decision**: Accept the Warning about the cursor being invisible in the Playwright screenshot. No code change.
**Why**: The spec's Scenario 1 Success Criteria explicitly requires the cursor to "toggle visible/invisible on a ~1-second cadence". A single screenshot will naturally catch the off-phase 50% of the time — that is the animation working correctly, not a bug. The `@keyframes` starts at `0% opacity: 1` so the initial render IS visible; the reviewer's screenshot just captured a later frame.
**Harness Signal**: `ui-quality-reviewer` compares against a static screenshot, which systematically mis-flags intentional blink/pulse animations. Consider teaching the reviewer to either (a) take multiple screenshots spaced across a second, or (b) check `animation-*` properties via computed style when a blinking element is in frame.
**Result**: Success — behavior matches spec.

## Addressed ui-quality Warning — 16×16 favicon glyph legibility

**When**: Step 5, ui-quality-reviewer
**Decision**: Reduce `app/icon2.tsx` glyph `fontSize` from 13 → 10. No change to the visual collapse rule (still cursor-only on terracotta square).
**Why**: At 16×16 with fontSize:13 the `_` occupies ~4–5 px and blends into the antialiasing fringe. fontSize:10 preserves the glyph while giving it breathing room. Matches the reviewer's "reduce font size to 10–11px" suggestion; keeps the glyph rather than removing it entirely (differentiates the mark from a plain colored square).
**Harness Signal**: Next.js `ImageResponse` generators benefit from a sizing heuristic — glyph font-size should be ~60% of the square dimension for single-character marks. At 16×16 that's ~10px; at 32×32 that's ~20–24px.
**Result**: Success — committed in 3948ca6. Manual QA pending.

## Surfaced ui-quality Advisories (not addressed this round)

1. **Login card vertical centering** — the login form sits slightly high on desktop; `min-h-screen flex items-center` would feel more intentional. Out of scope: this feature changes only the wordmark, not the page layout.
2. **apple-icon background feels "unfinished"** — near-white `#fdf6ee` may blend with iOS home screen. Reviewer suggests a terracotta fill with white text. Subjective; deferred until first round of user feedback.
3. **OG footer text small at mobile-viewport screenshot scale** — cosmetic; OG images are consumed at native 1200×630 in unfurls, never at phone-native size.

## Accepted react-reviewer Advisory — `openGraph.url` / `metadataBase` deferred

**When**: Step 5, react-reviewer
**Decision**: Do not add `openGraph.url` or `metadataBase` in this feature.
**Why**: The canonical production URL for claude-hunt has not been established (no `NEXT_PUBLIC_SITE_URL` env var, no deployed domain in the repo). Adding a placeholder would be misleading; adding real config requires environment plumbing that is out of scope.
**Harness Signal**: N/A — fair advisory, but requires infrastructure decisions beyond this feature.
**Result**: Success — advisory acknowledged; follow-up tracked informally.
