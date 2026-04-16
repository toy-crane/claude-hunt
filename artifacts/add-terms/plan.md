# add-terms Implementation Plan

## Architecture Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Route placement | `app/terms/page.tsx` and `app/privacy/page.tsx` (server components) | Legal documents are route-specific static content — mirrors how `app/login/page.tsx` and `app/onboarding/page.tsx` mount their features at the app layer. No cross-page reuse, no need for a widget slice. |
| Content shape | Hardcoded Korean JSX inside the page file, broken into numbered `<section>` elements with `<h2>` subheadings | The documents are static with no data dependencies — introducing a config/MDX abstraction would be premature. Section elements give semantic structure + anchor targets cheaply. |
| Member-facing terminology | Use `클래스` in all user-visible Korean copy where the internal code says `cohort` (entity `Cohort`, column `cohort_id`, props `cohortId`) | Matches existing surfaces like `features/onboarding/ui/onboarding-form.tsx` (`클래스를 선택하고...`). `cohort` is an internal-only identifier and must not leak into member-facing text. |
| Page chrome | Render the existing `<Header />` and `<Footer />` the same way the home page does | Keeps navigation consistent; `fetchViewer()` is already cached per-request and the proxy runs regardless, so no extra round-trip cost. Page body content remains identical for every visitor — only the site-wide chrome differs by auth state. |
| Onboarding gate | Add `/terms` and `/privacy` to `ONBOARDING_BYPASS_PATHS` in `proxy.ts` | Without this, signed-in users without a cohort get bounced to `/onboarding`, violating invariant "Public accessibility" and Scenario 4. |
| Footer links | Add two internal `<Link>` elements (`이용약관` → `/terms`, `개인정보 처리방침` → `/privacy`) — same tab, no `target="_blank"` | Invariant: internal legal links must be same-origin navigations. External links (GitHub/Feedback/Creator) keep their existing new-tab + safe-rel behavior. |
| Metadata | Export `metadata.title` from each page file (`서비스 이용약관`, `개인정보 처리방침`) so `layout.tsx`'s `title.template` wraps it as `… · claude-hunt` | Next.js 16 App Router idiom already used elsewhere in the app. No OG image needed this round. |
| Testing boundary | Colocated Vitest + RTL page tests render the server component in a jsdom environment and assert on visible text / anchor targets | Success criteria are observable DOM outcomes. No real Supabase or browser needed for these static pages. Matches `app/settings/page.test.tsx` and `app/onboarding/page.test.tsx`. |

## Infrastructure Resources

None.

## Data Model

None — feature adds no tables, columns, buckets, or env vars.

## Required Skills

| Skill | Applicable Task | Purpose |
|-------|-----------------|---------|
| `test-driven-development` | All tasks | Drive RED → GREEN for each acceptance bullet; one test per Success Criteria. |
| `next-best-practices` | Tasks 2, 3 | App Router file conventions, `metadata` export, server components, async APIs. |
| `fsd` | Tasks 1–4 | Confirm `app/` layer placement for route-only code and reuse of `widgets/footer`, `widgets/header` rather than duplication. |
| `shadcn` | Tasks 2, 3, 4 | Use `Separator` for the existing footer top-edge and between document sections; no manual `className` overrides on shadcn components. |
| `frontend-ui-engineering` | Tasks 2, 3 | Semantic HTML (`<article>`, `<section>`, heading hierarchy, anchored headings for TOC). |
| `web-design-guidelines` | Tasks 2, 3 | Landmark roles, heading order, readable line length, accessible anchor labels. |

## Affected Files

| File Path | Change Type | Related Task |
|-----------|-------------|--------------|
| `proxy.ts` | Modify | 1 |
| `proxy.test.ts` | Modify | 1 |
| `app/terms/page.tsx` | New | 2 |
| `app/terms/page.test.tsx` | New | 2 |
| `app/privacy/page.tsx` | New | 3 |
| `app/privacy/page.test.tsx` | New | 3 |
| `widgets/footer/ui/footer.tsx` | Modify | 4 |
| `widgets/footer/ui/footer.test.tsx` | Modify | 4 |

## Tasks

### Task 1: Allow `/terms` and `/privacy` through the onboarding gate

- **Covers**: Scenario 4 (partial — signed-in-without-cohort case), invariant "Public accessibility"
- **Size**: S (2 files)
- **Dependencies**: None — placed first so later tasks never have to work around the gate
- **References**:
  - `test-driven-development` — red-green-refactor
  - `next-best-practices` — `proxy.ts` replaces `middleware.ts` in Next 16
  - `proxy.ts`, `proxy.test.ts` (existing patterns for bypass paths)
- **Implementation targets**:
  - `proxy.ts` — add `"/terms"` and `"/privacy"` to `ONBOARDING_BYPASS_PATHS` (keep the existing `startsWith` matcher so `/terms?x=y` and `/terms/` also match)
  - `proxy.test.ts` — add cases below
- **Acceptance**:
  - [ ] `isOnboardingBypassPath("/terms")` returns `true`
  - [ ] `isOnboardingBypassPath("/privacy")` returns `true`
  - [ ] A signed-in user without a cohort visiting `/terms` receives a `location`-less response (no redirect to `/onboarding`)
  - [ ] A signed-in user without a cohort visiting `/privacy` receives a `location`-less response
  - [ ] Existing bypass paths (`/onboarding`, `/login`, `/auth/callback`) continue to pass through
- **Verification**:
  - `bun run test:unit -- proxy.test.ts` — all acceptance bullets
  - `bun run build` — no type/route regressions

---

### Checkpoint: After Task 1

- [ ] `bun run test` passes
- [ ] `bun run build` passes
- [ ] Onboarding gate no longer covers `/terms` or `/privacy`, even though the routes don't render yet (they 404 — that's the next task)

---

### Task 2: Ship the Terms of Service page at `/terms`

- **Covers**: Scenario 1 (full), Scenario 4 (partial — unauthenticated direct URL), Scenario 5 (full), invariants "Public accessibility", "Contact and effective date presence", "Copy truthfulness"
- **Size**: M (2 files)
- **Dependencies**: Task 1 (signed-in-no-cohort users must reach `/terms` without redirect)
- **References**:
  - `test-driven-development`
  - `next-best-practices` — `metadata` export, server components, file conventions
  - `shadcn` — `Separator` for section dividers; no className overrides on `Button`
  - `frontend-ui-engineering`, `web-design-guidelines` — heading hierarchy, article/section landmarks
  - `artifacts/add-terms/wireframe.html` — layout reference for TOC + 14 numbered sections + contact block
  - `app/onboarding/page.tsx` — reference for server-component + Header/Footer composition
- **Implementation targets**:
  - `app/terms/page.tsx` — server component exporting default Page and `metadata: { title: "서비스 이용약관" }`. Renders `<Header />`, a back link `← 홈으로` pointing to `/` above the main title (matches wireframe screen-0), an `<article>` containing `<h1>서비스 이용약관</h1>`, a `<p>` with the effective date `시행일: 2026년 4월 16일`, a TOC `<nav>` with 14 in-page anchors, fourteen `<section>` elements (`제1조 (목적)` … `제14조 (시행일)`) with the clause copy described in Scenario 5 Success Criteria, and a contact block (`toycrane`, `alwaysfun2183@gmail.com`), then `<Footer />`.
  - `app/terms/page.test.tsx` — RTL: stub `@widgets/header` and `@widgets/footer`, assert on heading text, section presence, effective-date and contact text (follow `app/settings/page.test.tsx` mock pattern).
- **Acceptance**:
  - [ ] GET `/terms` returns HTTP 200 — covered by `bun run build` (no dynamic errors) + a Playwright `page.goto("/terms")` status assertion
  - [ ] Page renders an `<h1>` with text `서비스 이용약관`
  - [ ] Page renders visible text `시행일: 2026년 4월 16일`
  - [ ] Page renders visible text `alwaysfun2183@gmail.com`
  - [ ] Page renders 14 section headings whose text starts with `제1조` through `제14조` in order
  - [ ] `제13조 (준거법 및 관할)` body includes both `대한민국` and `서울중앙지방법원`
  - [ ] `제14조 (시행일)` body reads `본 약관은 2026년 4월 16일부터 시행됩니다.`
  - [ ] Page has no `<script>` or server call that issues a Supabase `profiles` / `votes` query (only `Header` triggers the shared, cached `fetchViewer` call)
  - [ ] A signed-out session can load `/terms` without a redirect (no `location` header, 200 body)
  - [ ] After navigating `/login → /terms`, the browser Back button returns the visitor to `/login`
- **Verification**:
  - `bun run test:unit -- app/terms/page.test.tsx` — covers heading, sections, dates, contact, and structure assertions
  - `bun run test:e2e -- e2e/terms.spec.ts` (new spec added inside this task) — `page.goto("/terms")` as an anonymous context, assert `response.status()` is 200 and visible `서비스 이용약관` heading; separate case visits `/login`, clicks `서비스 이용약관`, then `page.goBack()` and asserts URL is back on `/login`
  - `rg "from\\(\"(profiles|votes)\"\\)" app/terms/` must return no matches (guard against page-level Supabase data access leaking into the static doc)
  - `bun run build` — route shows up in the build manifest
  - Browser MCP (`mcp__claude-in-chrome__navigate` to `http://localhost:3000/terms`) — capture desktop + mobile screenshots, save to `artifacts/add-terms/evidence/task-2-terms-desktop.png` and `artifacts/add-terms/evidence/task-2-terms-mobile.png`

---

### Task 3: Ship the Privacy Policy page at `/privacy`

- **Covers**: Scenario 2 (full), Scenario 4 (partial — direct-URL access), Scenario 6 (full), invariants "Public accessibility", "Contact and effective date presence", "Copy truthfulness"
- **Size**: M (2 files)
- **Dependencies**: Task 1 (gate bypass); mirrors Task 2 structurally but is an independent vertical slice — can ship even if Task 2 regresses
- **References**:
  - `test-driven-development`
  - `next-best-practices` — metadata, static route
  - `shadcn` — Separator; built-in variants only
  - `artifacts/add-terms/wireframe.html` — layout reference for 12 KISA-standard sections + processor table + DPO block
  - `features/withdraw-user/api/actions.ts` — source of truth for section 3 ("탈퇴 즉시 파기") and section 7 ("파기 절차 및 방법") copy — the page's words must match the code's behavior
  - `app/layout.tsx:75-76` — source of truth for section 9 analytics disclosure (Vercel Analytics + Speed Insights)
- **Implementation targets**:
  - `app/privacy/page.tsx` — server component with `metadata: { title: "개인정보 처리방침" }`. Renders `<Header />`, a back link `← 홈으로` pointing to `/` above the main title (matches wireframe screen-1), an `<article>` with `<h1>개인정보 처리방침</h1>`, `시행일: 2026년 4월 16일`, TOC `<nav>` with 12 anchors, twelve numbered `<section>` elements (1..12) matching the headings listed in Scenario 6 Success Criteria, a DPO `<aside>` with `toycrane` + email, and a processor table row for Supabase / Vercel / Google / GitHub. Then `<Footer />`.
  - `app/privacy/page.test.tsx` — RTL, same mocking pattern as Task 2's test.
- **Acceptance**:
  - [ ] GET `/privacy` returns HTTP 200
  - [ ] Page renders an `<h1>` with text `개인정보 처리방침`
  - [ ] Page renders visible text `시행일: 2026년 4월 16일`
  - [ ] Page renders the 12 KISA-standard section headings in order:
        `1. 개인정보의 처리 목적`, `2. 처리하는 개인정보 항목`, `3. 개인정보의 처리 및 보유 기간`, `4. 개인정보의 제3자 제공`, `5. 개인정보 처리의 위탁`, `6. 정보주체의 권리와 행사 방법`, `7. 개인정보의 파기 절차 및 방법`, `8. 개인정보의 안전성 확보 조치`, `9. 자동으로 수집되는 개인정보 (쿠키 등)`, `10. 개인정보 보호책임자`, `11. 권익침해 구제방법`, `12. 개인정보 처리방침의 변경`
  - [ ] Section 2 body lists at minimum: `이메일`, `OAuth 식별자`, `닉네임`, `프로필 이미지`, `소속 클래스`, `프로젝트`, `투표 기록`, `IP 주소`, `User-Agent` (use `클래스`, not `cohort`, per the terminology row above)
  - [ ] Section 3 body states that data is destroyed without delay on withdrawal, except where law requires longer retention (verbatim phrase "지체 없이" or equivalent)
  - [ ] Section 4 body states personal data is not provided to third parties
  - [ ] Section 5 body lists processors: `Supabase`, `Vercel`, `Google`, `GitHub` (each paired with its purpose — auth/DB/storage, hosting, OAuth, OAuth)
  - [ ] Section 9 body discloses the Supabase authentication session cookie, Vercel Analytics, and Vercel Speed Insights
  - [ ] Section 10 renders a DPO block with text `toycrane` and `alwaysfun2183@gmail.com`
  - [ ] Section 11 lists standard KISA channels: `개인정보분쟁조정위원회`, `개인정보침해신고센터`, `대검찰청`, `경찰청`
  - [ ] Section 12 states a 7-day advance notice period and a 30-day notice period for changes adverse to members, and displays effective date `2026-04-16`
  - [ ] Page does not query `profiles` or `votes` (only the shared cached `fetchViewer` via `<Header />`)
  - [ ] A signed-out session can load `/privacy` without a redirect
- **Verification**:
  - `bun run test:unit -- app/privacy/page.test.tsx`
  - `bun run test:e2e -- e2e/privacy.spec.ts` (new spec) — anonymous `page.goto("/privacy")`, assert 200 and visible `개인정보 처리방침` heading, plus assertion that section 10 shows `alwaysfun2183@gmail.com`
  - `rg "from\\(\"(profiles|votes)\"\\)" app/privacy/` must return no matches
  - `bun run build`
  - Browser MCP — `http://localhost:3000/privacy`, save screenshots to `artifacts/add-terms/evidence/task-3-privacy-desktop.png` and `artifacts/add-terms/evidence/task-3-privacy-mobile.png`
  - Human review (the implementing developer, before opening the PR) — confirm Privacy §3 and §7 wording matches the current behavior of `features/withdraw-user/api/actions.ts` (immediate hard delete; no grace period), and that §9 matches the analytics tools still wired in `app/layout.tsx` lines 75–76 (`<Analytics />` + `<SpeedInsights />`). Record a short note in `artifacts/add-terms/evidence/task-3-copy-truthfulness.md` with the file:line references checked.

---

### Checkpoint: After Tasks 2–3

- [ ] `bun run test` passes (proxy + both new page tests)
- [ ] `bun run test:e2e` passes for `/terms` and `/privacy`
- [ ] `bun run build` produces entries for `/terms` and `/privacy`
- [ ] From `/login`, clicking `서비스 이용약관` and `개인정보 처리방침` no longer 404s — both resolve to the new pages in a real browser (Browser MCP screenshot captured to `artifacts/add-terms/evidence/checkpoint-login-links.png`)
- [ ] Direct-URL visits to `/terms` and `/privacy` as an anonymous user render without redirect

---

### Task 4: Link `/terms` and `/privacy` from the site footer

- **Covers**: Scenario 3 (full), invariant "Internal links"
- **Size**: S (2 files)
- **Dependencies**: Tasks 2 and 3 (linked routes must exist to satisfy Scenario 3 acceptance)
- **References**:
  - `test-driven-development`
  - `shadcn` — reuse existing `Button asChild` / `Separator` pattern
  - `widgets/footer/ui/footer.tsx` and `widgets/footer/ui/footer.test.tsx` — existing patterns and test assumptions
  - `artifacts/add-terms/wireframe.html` screen 2 — target layout for footer
- **Implementation targets**:
  - `widgets/footer/ui/footer.tsx` — add two internal `<Link>` elements between the copyright and the GitHub/Feedback/Creator group. Labels: `이용약관` → `/terms`, `개인정보 처리방침` → `/privacy`. No `target="_blank"`, no `rel` needed for same-origin. Keep existing external links untouched.
  - `widgets/footer/ui/footer.test.tsx` — (a) add assertions for the two new internal links + their `href`, (b) narrow the existing "external links open in new tab with safe rel" test to the external subset (e.g. `getAllByRole("link")` filtered by `href` starting with `http`), since the footer will now contain internal links that are NOT expected to open in a new tab.
- **Acceptance**:
  - [ ] Footer renders a link with accessible name `이용약관` whose `href` is `/terms`
  - [ ] Footer renders a link with accessible name `개인정보 처리방침` whose `href` is `/privacy`
  - [ ] Neither of those two links has `target="_blank"` (they are same-tab internal navigations)
  - [ ] Existing external links (`GitHub`, `Feedback`, `toycrane`) still have `target="_blank"` and `rel` containing both `noopener` and `noreferrer`
  - [ ] The two new links appear on every page where `<Footer />` is mounted today (currently `/`, via Task 2 and 3 also `/terms` and `/privacy`) — verify by rendering `app/page.tsx`'s RTL test suite and asserting the footer contains both new links
- **Verification**:
  - `bun run test:unit -- widgets/footer` — assertions above
  - `bun run test:unit -- app/page.test.tsx app/__tests__/page.test.tsx` — pre-existing suites still pass (guard against accidentally breaking the footer tree)
  - `bun run test:e2e -- e2e/footer.spec.ts` (new spec) — open `/`, click `이용약관`, assert URL becomes `/terms` in the same tab; go back; click `개인정보 처리방침`, assert URL becomes `/privacy` in the same tab
  - `bun run build`
  - Browser MCP — navigate to `http://localhost:3000/` and capture the footer area in light + dark mode, save to `artifacts/add-terms/evidence/task-4-footer-light.png` and `artifacts/add-terms/evidence/task-4-footer-dark.png`

---

### Checkpoint: After Task 4 (final)

- [ ] `bun run test` and `bun run test:e2e` fully green
- [ ] `bun run build` succeeds and `/terms` and `/privacy` appear in the static route manifest
- [ ] End-to-end flow walked through in a real browser: `/login` link → `/terms` → back → footer link → `/privacy` → back → `/` → footer link → `/terms`
- [ ] Evidence screenshots saved to `artifacts/add-terms/evidence/` and linked from the PR description
- [ ] Lint/format clean: `bun run check`

## Undecided Items

None — all spec-level decisions confirmed in the preceding `/write-spec` pass.
