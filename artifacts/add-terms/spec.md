## Overview
Publish Korean-language Terms of Service and Privacy Policy pages at `/terms` and `/privacy`, wire the site footer to them, and make sure the existing links on the login form resolve instead of 404'ing. Both pages are static, publicly accessible, and cover the items required under Korean PIPA and the Act on Regulation of Terms and Conditions.

## Scope

### Included
- A public page at `/terms` titled `서비스 이용약관` with the 14 sections listed in Scenario 5 (member-facing Korean term for cohort is `클래스`, matching existing UI copy in `features/onboarding`)
- A public page at `/privacy` titled `개인정보 처리방침` with the 12 sections listed in Scenario 6
- An effective date of `2026-04-16` displayed on both pages
- Operator disclosure on both pages as an individual operator identified as `toycrane`, with contact email `alwaysfun2183@gmail.com` (no physical address, no phone)
- On the Privacy page, a `개인정보 보호책임자` block with the same operator + email (small service: operator serves as the data protection officer)
- On the Privacy page, disclosure of the third-party processors actually in use (Supabase — auth/DB/storage, Vercel — hosting, Google/GitHub — OAuth identity providers) and of the analytics tools actually in use (Vercel Analytics, Vercel Speed Insights) alongside the Supabase auth session cookie
- A statement on the Privacy page that personal data is erased immediately on account withdrawal, retained only where a specific law mandates longer retention — matching the current behavior of the withdraw-account action
- A statement on the Terms page that Korean law governs and that Seoul Central District Court is the court of first instance
- Footer links labelled `이용약관` and `개인정보 처리방침` pointing to `/terms` and `/privacy`, shown wherever the site footer is already rendered

### Excluded
- An explicit consent checkbox at signup or an acceptance-tracking record — the current signup relies on passive consent copy (`계속 진행하면 ... 동의하는 것으로 간주됩니다`). Introducing explicit, versioned consent is a separate feature
- A cookie preference banner or opt-in/opt-out UI — this round is disclosure-only; no runtime consent gating is added
- A change-log / version archive page for previous revisions of either document — the first version goes live this round; archival is deferred until the first amendment
- Automated email notifications to members when either document changes — requires mailing infrastructure not in place
- An English translation of either document — site copy is Korean; not requested
- Age-gating or underage consent flow — minimum age (14+) is stated in copy only; enforcement is not added in this round
- Changing the existing withdrawal behavior (grace periods, soft-delete) — the policy describes what the code already does

## Scenarios

### 1. Visitor opens the Terms page from the login screen
- **Given** a signed-out visitor is on `/login`
- **When** the visitor clicks `서비스 이용약관`
- **Then** `/terms` loads, renders the full document, and the visitor can scroll to the bottom to see the effective date and contact email

Success Criteria:
- [ ] Clicking `서비스 이용약관` on `/login` navigates to `/terms` and returns HTTP 200 (today it 404s)
- [ ] `/terms` renders the page title `서비스 이용약관`
- [ ] `/terms` displays the effective date `2026-04-16`
- [ ] `/terms` displays the contact line with `alwaysfun2183@gmail.com`
- [ ] The browser Back button returns the visitor to `/login`

### 2. Visitor opens the Privacy page from the login screen
- **Given** a signed-out visitor is on `/login`
- **When** the visitor clicks `개인정보 처리방침`
- **Then** `/privacy` loads, renders the full document, and the visitor can see the protection officer and processor disclosures

Success Criteria:
- [ ] Clicking `개인정보 처리방침` on `/login` navigates to `/privacy` and returns HTTP 200
- [ ] `/privacy` renders the page title `개인정보 처리방침`
- [ ] `/privacy` displays a `개인정보 보호책임자` block naming `toycrane` and email `alwaysfun2183@gmail.com`
- [ ] `/privacy` displays the effective date `2026-04-16`

### 3. Any visitor reaches the pages from the site footer
- **Given** a visitor (signed-in or signed-out) is on any page that renders the site footer
- **When** the visitor clicks the `이용약관` link or the `개인정보 처리방침` link in the footer
- **Then** the corresponding page opens on the same site (same tab, internal navigation)

Success Criteria:
- [ ] The footer shows a link labelled `이용약관` pointing to `/terms`
- [ ] The footer shows a link labelled `개인정보 처리방침` pointing to `/privacy`
- [ ] Both links are visible on every page where the footer is mounted today (currently `/`)
- [ ] Both links are internal navigations (they do not open a new tab)

### 4. Signed-out user reaches both pages by direct URL
- **Given** a visitor is signed out and not yet redirected
- **When** the visitor types `/terms` or `/privacy` directly into the address bar
- **Then** the page loads without redirecting to `/login`

Success Criteria:
- [ ] A fresh browser with no session can load `/terms` and `/privacy` and receives HTTP 200
- [ ] Neither page triggers a redirect to `/login`, `/onboarding`, or any other route
- [ ] Neither page calls Supabase for the visitor's profile or votes (content is static)

### 5. Terms page contains the 14 required sections
- **Given** a visitor is on `/terms`
- **When** the visitor reads the page
- **Then** the following sections appear in order, each with a heading the visitor can anchor to

Success Criteria:
- [ ] `제1조 (목적)` — states the purpose as the Claude Code 클래스(수강 기수) project showcase
- [ ] `제2조 (용어의 정의)` — defines `회원`, `게시물`, `클래스`
- [ ] `제3조 (약관의 게시와 개정)` — describes advance notice for amendments (at least 7 days in advance; at least 30 days in advance for changes adverse to members)
- [ ] `제4조 (이용계약의 체결)` — formation on successful OAuth/email-link sign-in and completion of onboarding
- [ ] `제5조 (회원 정보의 관리)` — display-name uniqueness and update mechanism
- [ ] `제6조 (운영자의 의무)` — best-effort continuous service, personal-data protection
- [ ] `제7조 (회원의 의무)` — no false information, no infringing content, no upvote abuse or automation
- [ ] `제8조 (서비스의 제공 및 변경)` — free of charge; service may be modified or suspended for maintenance
- [ ] `제9조 (서비스 이용의 제한)` — removal, suspension, or termination on violations
- [ ] `제10조 (게시물의 관리 및 권리)` — member retains copyright; grants operator a non-exclusive license to use the content inside the service
- [ ] `제11조 (면책조항)` — operator's liability is limited for a free service and for third-party content
- [ ] `제12조 (계약 해지)` — members may withdraw from the Settings page at any time
- [ ] `제13조 (준거법 및 관할)` — Korean law governs; Seoul Central District Court is the court of first instance
- [ ] `제14조 (시행일)` — `본 약관은 2026년 4월 16일부터 시행됩니다.`

### 6. Privacy page contains the 12 KISA-standard sections
- **Given** a visitor is on `/privacy`
- **When** the visitor reads the page
- **Then** the following sections appear in order, each with content matching the service's actual behavior

Success Criteria:
- [ ] `1. 개인정보의 처리 목적` — identification/authentication, project posting, vote tallying, service improvement
- [ ] `2. 처리하는 개인정보 항목` — email, OAuth identifier (GitHub/Google), display name, avatar image, enrolled class (`클래스`), submitted project (title, URL, tagline, screenshot), vote records, service access logs (IP address, user agent)
- [ ] `3. 개인정보의 처리 및 보유 기간` — retained until account withdrawal; destroyed without delay on withdrawal, except where a specific law mandates longer retention
- [ ] `4. 개인정보의 제3자 제공` — states that personal data is not provided to third parties
- [ ] `5. 개인정보 처리의 위탁` — discloses Supabase (auth/DB/storage), Vercel (hosting), Google and GitHub (OAuth) as processors, with purpose of each
- [ ] `6. 정보주체의 권리와 행사 방법` — describes right to access, correct, delete (withdraw), and restrict processing, with the Settings page and contact email as the channels
- [ ] `7. 개인정보의 파기 절차 및 방법` — database records deleted electronically; storage files overwritten/removed; executed immediately on withdrawal
- [ ] `8. 개인정보의 안전성 확보 조치` — HTTPS for all traffic, Supabase Row-Level Security, encrypted storage, minimum privilege for operator keys
- [ ] `9. 자동으로 수집되는 개인정보 (쿠키 등)` — discloses the Supabase authentication session cookie, Vercel Analytics, and Vercel Speed Insights, their purpose, and that no personally identifiable analytics are collected
- [ ] `10. 개인정보 보호책임자` — block with name `toycrane`, role `개인정보 보호책임자`, email `alwaysfun2183@gmail.com`
- [ ] `11. 권익침해 구제방법` — lists 개인정보분쟁조정위원회, 개인정보침해신고센터, 대검찰청 사이버수사과, 경찰청 사이버수사국 with phone numbers and URLs (standard KISA boilerplate)
- [ ] `12. 개인정보 처리방침의 변경` — states advance notice of at least 7 days, and at least 30 days for changes adverse to members; shows effective date `2026-04-16`

## Invariants

- **Public accessibility**: `/terms` and `/privacy` must be reachable without a Supabase session. Middleware must not redirect unauthenticated requests to either path.
- **No personal data leakage**: neither page queries or renders any member-specific data; the content is identical for every visitor.
- **Contact and effective date presence**: every rendered version of both pages shows the effective date `2026-04-16` and the contact email `alwaysfun2183@gmail.com`.
- **Copy truthfulness**: every factual claim on `/privacy` (processors used, analytics tools used, retention behavior, security measures) matches the behavior of the current codebase. If code changes later contradict the policy, the policy must be updated in the same change.
- **Internal links**: links to `/terms` and `/privacy` from inside the app (login form, site footer) are same-origin internal navigations (no `target="_blank"`).

## Dependencies
- Existing `/login` page that already links to `/terms` and `/privacy` (no change required to the login form itself)
- Existing `widgets/footer` component that will receive the two additional links
- The current withdrawal flow in `features/withdraw-user` whose behavior is described by section 3 and 7 of the Privacy policy

## Undecided Items
- None.
