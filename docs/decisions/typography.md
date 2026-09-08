# Typography

## Decisions

- Two font roles only: sans `Pretendard` for every human-facing string, mono `Geist Mono` for system-made strings (prompt lines and commands, the `>claude-hunt_` logo, table column heads, rank numbers, vote counts, count badges). There is no separate heading typeface.
- Text that contains Hangul never uses the mono role. Chips, badges, link labels, author names, and meta lines that carry Korean are set in the sans role; when a system string and Korean copy share one element, only the system string is mono. Digits inside chips and badges use tabular figures.
- Heading weights are 600 for page and hero titles, 500 for row, card, and section titles, 400 for body. Light and dark themes use the same weights.
- Fonts are self-hosted. The Korean face is delivered in unicode-range slices, never as one full file.

## Boundaries

- Applies to the web app's rendered text. OG images already use Pretendard and keep their own weights until reconciled.
- Does not authorize changing color, radius, spacing tokens, or the shadcn preset.

## Why

None of the previous faces (Inter, JetBrains Mono, Geist Mono) carry Hangul, so Korean rendered in whichever OS font existed and monospace headings spaced Korean words with monospace blanks. Pretendard is Inter-derived, keeps the Latin look of the shadcn theme, and is already shipped for OG images. Korean-capable mono faces have only two weights and thin Hangul, so headings lost hierarchy. All three treatments were rendered on production screens before choosing; 600/500 matches shadcn's heading defaults and 700 read too heavy.

## Reconsider when

- A Korean-capable mono family with a real weight range and quality Hangul is available and mono headings are wanted back.
- Measured first-load font transfer exceeds the spec bound even with slicing.
- The product adds a script Pretendard does not cover.

## Still-rejected alternatives

- Keep mono headings and only add a Hangul fallback — leaves monospace word gaps and two faces per line; revisit only if the Latin mono heading identity outweighs Korean typography.
- D2Coding for headings and mono — 400/700 only, thin Hangul at heading sizes, +1.5MB; revisit with a better Korean mono.
- Noto Sans KR or IBM Plex Sans KR from Google Fonts — a larger departure from the Inter-based shadcn look, and Pretendard is already in the repo.

## Evidence worth preserving

- 2026-09-08 variant renders on production screens: comparison page https://claude.ai/code/artifact/740ad1cd-c7d0-4974-9d04-20486cd347cf and interactive prototype https://claude.ai/code/artifact/31a53ca4-963b-4108-9ebf-ce33240595e1. Spec: `docs/specs/korean-typography/spec.md`.
