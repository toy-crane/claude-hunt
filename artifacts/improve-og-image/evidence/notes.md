# OG Image — Visual Verification Notes

Captured **2026-04-24** from the running dev server at `http://localhost:3003/opengraph-image` against a local Supabase seed containing 3 projects (Focus Timer, Paint Studio, Note Keeper).

Evidence: `og-final.png` (1200×630, 173 KB).

## Observable checklist

| # | Criterion | Observed |
|---|-----------|----------|
| 1 | File is a 1200×630 PNG | ✅ `file og-final.png` → `PNG image data, 1200 x 630, 8-bit/color RGBA` |
| 2 | Wordmark `>claude-hunt_` renders in Geist Mono | ✅ Bold monospace, terracotta `>` and `_`, ink `claude-hunt` |
| 3 | `>` and `_` glyphs are terracotta `#c15f3c` | ✅ Both visible orange |
| 4 | Tagline `함께 배우는 사람들의 프로젝트.` renders (Korean, Pretendard fallback) | ✅ Clean Hangul, no `□` glyphs |
| 5 | Subtitle `마음에 드는 프로젝트에 응원을 보내주세요.` renders | ✅ Muted grey |
| 6 | `지금 인기 프로젝트` row with three dots in gold / silver / bronze | ✅ `●` before each of `Focus Timer`, `Paint Studio`, `Note Keeper` in `#f59e0b` / `#a1a1aa` / `#c2410c` |
| 7 | `claude-hunt.com` URL rendered | ✅ Bottom-left in Geist Mono |
| 8 | Right half has a tilted (−7°) card grid | ✅ Cards visibly rotated counter-clockwise |
| 9 | Top-3 cards show `1st` / `2nd` / `3rd` badges in matching colors | ✅ Amber 1st on Focus Timer, zinc 2nd on Paint Studio, orange 3rd on Note Keeper |
| 10 | Cards 4–6 have no rank badge | ✅ N/A — seed only has 3 projects; grid renders only those 3 (Scenario 5 sparse coverage) |
| 11 | Each card shows its screenshot as thumbnail | ✅ All 3 cards display their real screenshot (Focus Timer orange gradient, Paint Studio purple gradient, Note Keeper teal gradient) |
| 12 | Card body shows title / tagline (2-line clamp) / `<author> · 작성` / `▲ <votes>` pill | ✅ e.g. `Focus Timer` → `뽀모도로 방식으로 집중 세션을 기록해 주는 타이머` (clamped) → `소라 · 작성` → `▲ 1` |
| 13 | Trend row and top-3 badged cards reference the same 3 projects in the same order (ordering-consistency Invariant) | ✅ Trend: Focus Timer → Paint Studio → Note Keeper. Cards at positions 1/2/3 (1st/2nd/3rd): same three in the same order |
| 14 | Right edge fades into `#fafafa` (fade overlay) | ✅ Visible gradient falloff on the right third |
| 15 | No English copy other than wordmark, URL, rank badges, and vote arrows | ✅ All body/label copy is Korean |

## Deviations / follow-ups

None. Implementation matches `artifacts/improve-og-image/references/project/og-image-final.html` (`OgGridB`) to the extent Satori's flexbox engine allows. Minor visual differences vs. a browser render are expected (Satori does not anti-alias identically to Chrome's text engine) but are not deviations from spec.

## Reviewer notes

- Screenshot was generated against a 3-project seed, so the 1st/2nd/3rd badges visible in this capture exhaustively exercise the top-3 path; the placeholder 4/5/6 positions (Scenario 5 boundary) are covered by unit tests in `app/opengraph-image.test.tsx`.
- When the homepage grows past 6 projects, the 4/5/6 grid cards will render without badges — this is tested in `app/opengraph-image.test.tsx` "attaches 1st / 2nd / 3rd badges to the cards at grid positions 0, 1, 2" (asserts `cards[3..5].querySelector('[data-og-role="rank-badge"]')` is null).
