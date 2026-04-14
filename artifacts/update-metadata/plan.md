# Update Metadata Implementation Plan

## Architecture Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Where metadata lives | Extend the existing `metadata` object in `app/layout.tsx` (root layout) — no per-page overrides added | Spec scope is site-wide only. Next.js merges child-route metadata over the root; existing `/settings` override already uses this inheritance, so we extend the same object. |
| How metadataBase is expressed | `new URL("https://www.claude-hunt.com")` | Next.js Metadata API expects a URL instance; string form is accepted but the URL form is canonical in the docs and fails loudly on malformed input. |
| Canonical URL form | `alternates: { canonical: "/" }` (relative) — resolved against `metadataBase` at render | Keeps the canonical source of truth in one place (`metadataBase`) so a future domain change is a one-line edit. |
| Robots directives form | `robots: { index: true, follow: true }` (simple boolean form, no `googleBot` block) | Spec requires only `index` and `follow` presence on the root; the Googlebot-specific block would be scope creep without a stated need. |
| Keywords content | `["Claude Code", "cohort projects", "AI coding", "showcase"]` — exactly the spec's minimum set | Spec lists these as the minimum required terms. Keeping to the minimum avoids keyword stuffing (a known SEO negative). Easy to extend later. |
| Testing boundary | Unit-test the exported `metadata` object via the existing `app/layout.test.tsx` pattern | The success-criteria "inheritance to /login, /onboarding, /settings" is a Next.js framework guarantee — verifying the root `metadata` object is the lowest provable boundary. Rendering each child page would test the framework, not our code. |

## Infrastructure Resources

None.

## Data Model

Not applicable — this feature touches only static metadata configuration, no entities or persisted data.

## Required Skills

| Skill | Applicable Task | Purpose |
|-------|-----------------|---------|
| `test-driven-development` | All tasks | RED → GREEN discipline; one test per acceptance bullet. |
| `next-best-practices` | All tasks | Metadata API patterns (see `metadata.md`): title templates, `metadataBase`, `alternates`, `robots`, keywords; Server-Component-only rule. |

## Affected Files

| File Path | Change Type | Related Task |
|-----------|-------------|--------------|
| `app/layout.tsx` | Modify | Task 1, Task 2, Task 3, Task 4 |
| `app/layout.test.tsx` | Modify | Task 1, Task 2, Task 3, Task 4 |

No new files. No deletions.

## Tasks

### Task 1: Add `metadataBase` so OG/Twitter image URLs resolve absolute

- **Covers**: Scenario 1 (full)
- **Size**: S (2 files)
- **Dependencies**: None
- **References**:
  - `next-best-practices` — metadata, metadataBase, absolute URLs
  - `test-driven-development` — RED before GREEN, one bullet = one test
  - `app/layout.test.tsx` (existing tests use `await import("./layout.tsx")` pattern and assert on the exported `metadata` object — extend, do not duplicate)
- **Implementation targets**:
  - `app/layout.test.tsx` (add failing tests first)
  - `app/layout.tsx` (add `metadataBase: new URL("https://www.claude-hunt.com")` to the metadata export)
- **Acceptance**:
  - [ ] `metadata.metadataBase` equals `new URL("https://www.claude-hunt.com/")` (host, protocol, no path beyond `/`)
  - [ ] `metadata.metadataBase.origin === "https://www.claude-hunt.com"` (no trailing-slash drift on the origin)
- **Verification**:
  - `bun run test:unit -- app/layout`
  - `bun run build`

---

### Task 2: Add `robots` directives permitting index + follow

- **Covers**: Scenario 2 (full — root-layout portion; inheritance to child routes is a framework guarantee, not our code)
- **Size**: S (2 files)
- **Dependencies**: None (independent metadata field)
- **References**:
  - `next-best-practices` — metadata, robots field shape (`{ index, follow }`)
  - `test-driven-development` — RED before GREEN
- **Implementation targets**:
  - `app/layout.test.tsx` (add failing test)
  - `app/layout.tsx` (add `robots: { index: true, follow: true }`)
- **Acceptance**:
  - [ ] `metadata.robots` is present and `robots.index === true`
  - [ ] `metadata.robots.follow === true`
- **Verification**:
  - `bun run test:unit -- app/layout`
  - `bun run build`

---

### Task 3: Add `alternates.canonical` pointing to site home

- **Covers**: Scenario 3 (full — root-layout portion; child pages inherit the canonical resolution via `metadataBase`)
- **Size**: S (2 files)
- **Dependencies**: Task 1 (relative canonical `"/"` is resolved against `metadataBase`, so `metadataBase` must land first to produce an absolute canonical URL at render time)
- **References**:
  - `next-best-practices` — metadata, alternates, canonical
  - `test-driven-development` — RED before GREEN
- **Implementation targets**:
  - `app/layout.test.tsx` (add failing test)
  - `app/layout.tsx` (add `alternates: { canonical: "/" }`)
- **Acceptance**:
  - [ ] `metadata.alternates.canonical === "/"` (relative form; resolution to absolute is delegated to Next.js via `metadataBase`)
- **Verification**:
  - `bun run test:unit -- app/layout`
  - `bun run build`

---

### Task 4: Add `keywords` list with the spec's minimum terms

- **Covers**: Scenario 4 (full — root-layout portion)
- **Size**: S (2 files)
- **Dependencies**: None
- **References**:
  - `next-best-practices` — metadata, keywords
  - `test-driven-development` — RED before GREEN
- **Implementation targets**:
  - `app/layout.test.tsx` (add failing test)
  - `app/layout.tsx` (add `keywords: ["Claude Code", "cohort projects", "AI coding", "showcase"]`)
- **Acceptance**:
  - [ ] `metadata.keywords` contains all four required terms: `"Claude Code"`, `"cohort projects"`, `"AI coding"`, `"showcase"` (case-sensitive match)
- **Verification**:
  - `bun run test:unit -- app/layout`
  - `bun run build`

---

### Checkpoint: After Tasks 1–4

- [ ] All existing layout tests still pass (`title.default === "claude-hunt"`, `title.template === "%s · claude-hunt"`, description present, openGraph/twitter titles contain `"claude-hunt"`, twitter card `"summary_large_image"`) — this is the regression guard for Scenario 5.
- [ ] Existing `/settings` page tests still pass — confirms page-level title override still composes with the root template after our edits.
- [ ] `bun run test` passes (Vitest + pgTAP).
- [ ] `bun run build` succeeds (Next.js validates the `Metadata` type at build time — malformed `metadataBase`, unknown fields, or type violations will fail here).
- [ ] Manual spot-check in dev: visit `http://localhost:3000/`, view source, confirm `<meta name="keywords">`, `<meta name="robots">`, `<link rel="canonical" href="https://www.claude-hunt.com/">`, and absolute `og:image` URLs are rendered.

---

## Undecided Items

None.
